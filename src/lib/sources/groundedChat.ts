import { z } from 'zod';
import { AI_TASK_PROFILES, type AiTaskProfile } from '../aiTaskProfiles';
import { normalizeSourceError, type NormalizedSourceError } from './sourceErrors';
import type { SourceRecord, SourceSpan, SourceVersion } from '../../types/sources';

export const GroundedChatRequestSchema = z.object({
  selectedVersionIds: z.array(z.string().min(1)).min(1),
  question: z.string().min(1),
  sourceSpan: z.object({
    sourceId: z.string().min(1),
    sourceVersionId: z.string().min(1),
    blockIds: z.array(z.string().min(1)).optional(),
    pageIndex: z.number().optional(),
    startMs: z.number().optional(),
    endMs: z.number().optional(),
    exactTextSnippet: z.string().optional(),
  }).optional(),
  conversationId: z.string().min(1).optional(),
});

export const GroundedChatResponseSchema = z.object({
  groundingStatus: z.enum(['fully_grounded', 'partially_grounded', 'unsupported_by_sources']),
  answer: z.string(),
  citations: z.array(z.object({
    sourceVersionId: z.string().min(1),
    sourceTitle: z.string(),
    blockId: z.string().min(1),
    exactSnippet: z.string().optional(),
  })),
  webCitations: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string().optional(),
  })),
});

export const WebResearchRequestSchema = z.object({
  question: z.string().min(1),
  conversationId: z.string().min(1).optional(),
});

export type GroundedChatRequest = z.infer<typeof GroundedChatRequestSchema>;
export type GroundedChatResponse = z.infer<typeof GroundedChatResponseSchema>;

export type HydratedSource = {
  version: SourceVersion;
  record: SourceRecord;
};

export type SourceHydrationResult =
  | { status: 'ok'; items: HydratedSource[] }
  | { status: 'unavailable' }
  | { status: 'selection_unavailable' };

export interface SourcesRepository {
  getSelectedVersions(selectedVersionIds: readonly string[]): Promise<SourceHydrationResult>;
}

export type GroundedRouterExecute = (input: {
  profile: AiTaskProfile;
  tools: [];
  prompt: string;
  question: string;
}) => Promise<{ value: unknown; provider?: string; model?: string }>;

export type WebSearchFn = (input: { question: string; conversationId?: string }) => Promise<{
  webCitations: Array<{ title: string; url: string; snippet?: string }>;
}>;

export type SourcesHttpResult = {
  status: number;
  body: Record<string, unknown>;
};

const UNSUPPORTED_ANSWER_VI = 'Nguồn tài liệu đã chọn không chứa thông tin để trả lời câu hỏi này. Bạn có thể chọn thêm nguồn khác hoặc kích hoạt \'Tra cứu dẫn chứng\' từ web.';

function unsupportedResponse(): GroundedChatResponse {
  return {
    groundingStatus: 'unsupported_by_sources',
    answer: UNSUPPORTED_ANSWER_VI,
    citations: [],
    webCitations: [],
  };
}

const HANDOFF_STATES = new Set(['unavailable', 'handoff_required']);

function isUsableSource(item: HydratedSource): boolean {
  return !HANDOFF_STATES.has(item.record.processingState) && item.version.plainText.trim().length > 0;
}

export function buildGroundedContext(
  selected: readonly HydratedSource[],
  selectedVersionIds: readonly string[],
  sourceSpan?: SourceSpan,
): string {
  const allowed = new Set(selectedVersionIds);
  const lines: string[] = [
    'Answer only from the selected source versions below.',
    'Cite block IDs that exist on those versions. Do not use web search.',
  ];

  for (const item of selected) {
    if (!allowed.has(item.version.id) || !isUsableSource(item)) continue;
    const spanBlocks = sourceSpan?.sourceVersionId === item.version.id ? sourceSpan.blockIds : undefined;
    const blocks = spanBlocks?.length
      ? item.version.blocks.filter((block) => spanBlocks.includes(block.id))
      : item.version.blocks;
    lines.push(
      `Title: ${item.record.title}`,
      `Rights: ${item.record.provenance.rightsState}`,
      `Canonical citation: ${item.record.provenance.canonicalCitation}`,
      `SourceVersion: ${item.version.id}`,
    );
    for (const block of blocks) {
      lines.push(`Block ${block.id}: ${block.text}`);
    }
    if (!blocks.length) {
      lines.push(item.version.plainText);
    }
  }
  return lines.join('\n');
}

export function validateGroundedCitations(
  response: GroundedChatResponse,
  selectedVersions: readonly SourceVersion[],
): GroundedChatResponse {
  const selectedById = new Map(selectedVersions.map((version) => [version.id, version]));
  if (response.webCitations.length > 0) return unsupportedResponse();
  if (response.groundingStatus === 'unsupported_by_sources') {
    return { ...unsupportedResponse(), answer: response.answer || UNSUPPORTED_ANSWER_VI };
  }
  if (response.citations.length === 0) return unsupportedResponse();

  for (const citation of response.citations) {
    const version = selectedById.get(citation.sourceVersionId);
    if (!version) return unsupportedResponse();
    if (!version.blocks.some((block) => block.id === citation.blockId)) return unsupportedResponse();
  }

  return {
    ...response,
    webCitations: [],
  };
}

export async function executeGroundedChat(input: {
  selectedVersionIds: string[];
  question: string;
  versions: SourceVersion[];
  records: SourceRecord[];
  routerExecute: GroundedRouterExecute;
  webSearch?: WebSearchFn;
  sourceSpan?: SourceSpan;
}): Promise<GroundedChatResponse> {
  const selected = input.versions.map((version) => ({
    version,
    record: input.records.find((record) => record.id === version.sourceId) || input.records[0],
  })).filter((item): item is HydratedSource => Boolean(item.record));
  const usable = selected.filter((item) => input.selectedVersionIds.includes(item.version.id) && isUsableSource(item));
  if (!usable.length) return unsupportedResponse();

  const prompt = buildGroundedContext(usable, input.selectedVersionIds, input.sourceSpan);
  try {
    const routed = await input.routerExecute({
      profile: AI_TASK_PROFILES.balanced,
      tools: [],
      prompt,
      question: input.question,
    });
    const raw = routed.value;
    const candidate = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const parsed = GroundedChatResponseSchema.parse(candidate);
    return validateGroundedCitations(parsed, usable.map((item) => item.version));
  } catch (error) {
    if (error instanceof z.ZodError) return unsupportedResponse();
    throw normalizeSourceError(error);
  }
}

function extractBearerToken(authorizationHeader?: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  const token = match?.[1]?.trim() ?? '';
  return token.length > 0 ? token : null;
}

function authRequiredResult(): SourcesHttpResult {
  const error = normalizeSourceError({ code: 'AUTH_REQUIRED' });
  return {
    status: 401,
    body: {
      status: 'auth_required',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

function unavailableResult(): SourcesHttpResult {
  const error = normalizeSourceError({ code: 'NETWORK_DISCONNECTED' });
  return {
    status: 503,
    body: {
      status: 'unavailable',
      code: error.code,
      userMessageVi: error.userMessageVi,
      suggestedActionVi: error.suggestedActionVi,
    },
  };
}

function selectionUnavailableResult(): SourcesHttpResult {
  return {
    status: 400,
    body: {
      status: 'selection_unavailable',
      code: 'INVALID_INPUT',
      userMessageVi: 'Không dùng được các nguồn đã chọn.',
      suggestedActionVi: 'Chọn lại nguồn thuộc thư viện của bạn rồi thử lại.',
    },
  };
}

function providerErrorResult(error: unknown): SourcesHttpResult {
  const normalized: NormalizedSourceError = normalizeSourceError(error);
  return {
    status: normalized.retryable ? 503 : 500,
    body: {
      status: 'error',
      code: normalized.code,
      userMessageVi: normalized.userMessageVi,
      suggestedActionVi: normalized.suggestedActionVi,
      diagnosticId: normalized.diagnosticId,
    },
  };
}

export async function handleGroundedChatRequest(input: {
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  repositoryForToken: (accessToken: string) => SourcesRepository;
  routerExecute: GroundedRouterExecute;
  webSearch?: WebSearchFn;
}): Promise<SourcesHttpResult> {
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const parsed = GroundedChatRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        status: 'invalid_request',
        code: 'INVALID_INPUT',
      },
    };
  }

  if (parsed.data.sourceSpan && !parsed.data.selectedVersionIds.includes(parsed.data.sourceSpan.sourceVersionId)) {
    return selectionUnavailableResult();
  }

  let hydration: SourceHydrationResult;
  try {
    hydration = await input.repositoryForToken(accessToken).getSelectedVersions(parsed.data.selectedVersionIds);
  } catch {
    return unavailableResult();
  }

  if (hydration.status === 'unavailable') return unavailableResult();
  if (hydration.status !== 'ok') return selectionUnavailableResult();

  const usable = hydration.items.filter(isUsableSource);
  if (!usable.length) {
    return { status: 200, body: unsupportedResponse() };
  }

  try {
    const result = await executeGroundedChat({
      selectedVersionIds: parsed.data.selectedVersionIds,
      question: parsed.data.question,
      versions: usable.map((item) => item.version),
      records: usable.map((item) => item.record),
      routerExecute: input.routerExecute,
      webSearch: input.webSearch,
      sourceSpan: parsed.data.sourceSpan,
    });
    return { status: 200, body: result };
  } catch (error) {
    return providerErrorResult(error);
  }
}

export async function handleWebResearchRequest(input: {
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  searchAdapterConfigured: boolean;
  webSearch?: WebSearchFn;
}): Promise<SourcesHttpResult> {
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured || !input.searchAdapterConfigured || !input.webSearch) {
    return unavailableResult();
  }

  const parsed = WebResearchRequestSchema.safeParse(input.body);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        status: 'invalid_request',
        code: 'INVALID_INPUT',
      },
    };
  }

  try {
    const result = await input.webSearch({
      question: parsed.data.question,
      conversationId: parsed.data.conversationId,
    });
    return {
      status: 200,
      body: {
        status: 'ok',
        webCitations: result.webCitations,
      },
    };
  } catch (error) {
    return providerErrorResult(error);
  }
}
