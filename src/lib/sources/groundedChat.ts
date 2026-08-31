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

export type LearnerAuthResult =
  | { status: 'ok'; userId: string; accessToken: string }
  | { status: 'auth_required' }
  | { status: 'unavailable' };

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

/**
 * SPEC §4.2 prompt budget: 32,000 tokens.
 *
 * Conservative deterministic estimate (fail closed, never silent truncation):
 * - count Unicode code points in the prompt
 * - treat 3 code points as 1 token (tighter than typical English BPE ~4 chars/token)
 * - add 256 tokens of instruction/system overhead
 *
 * If the estimate exceeds 32,000, grounded chat returns `select_smaller_source`
 * and does not call the model.
 */
export const GROUNDED_CHAT_PROMPT_TOKEN_BUDGET = 32_000;
const PROMPT_CODE_POINTS_PER_TOKEN = 3;
const PROMPT_INSTRUCTION_OVERHEAD_TOKENS = 256;

export function estimatePromptTokens(text: string): number {
  let codePoints = 0;
  for (const _codePoint of text) codePoints += 1;
  return Math.ceil(codePoints / PROMPT_CODE_POINTS_PER_TOKEN) + PROMPT_INSTRUCTION_OVERHEAD_TOKENS;
}

export class SelectSmallerSourceError extends Error {
  readonly status = 'select_smaller_source' as const;

  constructor() {
    super('select_smaller_source');
    this.name = 'SelectSmallerSourceError';
  }
}

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

export function hydrateSelectedSources(
  versions: readonly SourceVersion[],
  records: readonly SourceRecord[],
): HydratedSource[] {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const items: HydratedSource[] = [];
  for (const version of versions) {
    const record = recordById.get(version.sourceId);
    if (!record) continue;
    items.push({ version, record });
  }
  return items;
}

export function isValidSelectedSpan(
  sourceSpan: SourceSpan | undefined,
  selected: readonly HydratedSource[],
): boolean {
  if (!sourceSpan) return true;
  const match = selected.find((item) => (
    item.version.id === sourceSpan.sourceVersionId
    && item.record.id === sourceSpan.sourceId
    && item.version.sourceId === sourceSpan.sourceId
  ));
  if (!match) return false;
  if (!sourceSpan.blockIds?.length) return true;
  const blockIds = new Set(match.version.blocks.map((block) => block.id));
  return sourceSpan.blockIds.every((blockId) => blockIds.has(blockId));
}

function blocksForPrompt(item: HydratedSource, sourceSpan?: SourceSpan): SourceVersion['blocks'] {
  if (!sourceSpan) return item.version.blocks;
  if (item.version.id !== sourceSpan.sourceVersionId || item.record.id !== sourceSpan.sourceId) {
    return [];
  }
  if (!sourceSpan.blockIds?.length) return item.version.blocks;
  const allowed = new Set(sourceSpan.blockIds);
  return item.version.blocks.filter((block) => allowed.has(block.id));
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

  const scoped = sourceSpan
    ? selected.filter((item) => item.version.id === sourceSpan.sourceVersionId && item.record.id === sourceSpan.sourceId)
    : selected;

  for (const item of scoped) {
    if (!allowed.has(item.version.id) || !isUsableSource(item)) continue;
    const blocks = blocksForPrompt(item, sourceSpan);
    if (!blocks.length) continue;
    lines.push(
      `Title: ${item.record.title}`,
      `Rights: ${item.record.provenance.rightsState}`,
      `Canonical citation: ${item.record.provenance.canonicalCitation}`,
      `SourceVersion: ${item.version.id}`,
    );
    for (const block of blocks) {
      lines.push(`Block ${block.id}: ${block.text}`);
    }
  }
  return lines.join('\n');
}

export function validateGroundedCitations(
  response: GroundedChatResponse,
  selectedVersions: readonly SourceVersion[],
  sourceSpan?: SourceSpan,
): GroundedChatResponse {
  const selectedById = new Map(selectedVersions.map((version) => [version.id, version]));
  if (response.webCitations.length > 0) return unsupportedResponse();
  if (response.groundingStatus === 'unsupported_by_sources') {
    return { ...unsupportedResponse(), answer: response.answer || UNSUPPORTED_ANSWER_VI };
  }
  if (response.citations.length === 0) return unsupportedResponse();

  const spanBlockIds = sourceSpan?.blockIds?.length ? new Set(sourceSpan.blockIds) : null;

  for (const citation of response.citations) {
    const version = selectedById.get(citation.sourceVersionId);
    if (!version) return unsupportedResponse();
    if (sourceSpan && citation.sourceVersionId !== sourceSpan.sourceVersionId) return unsupportedResponse();
    if (spanBlockIds && !spanBlockIds.has(citation.blockId)) return unsupportedResponse();
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
  const selected = hydrateSelectedSources(input.versions, input.records)
    .filter((item) => input.selectedVersionIds.includes(item.version.id) && isUsableSource(item));
  if (!selected.length) return unsupportedResponse();
  if (!isValidSelectedSpan(input.sourceSpan, selected)) return unsupportedResponse();

  const prompt = buildGroundedContext(selected, input.selectedVersionIds, input.sourceSpan);
  if (estimatePromptTokens(prompt) > GROUNDED_CHAT_PROMPT_TOKEN_BUDGET) {
    throw new SelectSmallerSourceError();
  }

  const contextVersions = input.sourceSpan
    ? selected.filter((item) => item.version.id === input.sourceSpan?.sourceVersionId)
    : selected;

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
    return validateGroundedCitations(parsed, contextVersions.map((item) => item.version), input.sourceSpan);
  } catch (error) {
    if (error instanceof SelectSmallerSourceError) throw error;
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

function selectSmallerSourceResult(): SourcesHttpResult {
  return {
    status: 400,
    body: {
      status: 'select_smaller_source',
      code: 'INVALID_INPUT',
      userMessageVi: 'Nguồn hoặc đoạn đã chọn vượt quá giới hạn 32.000 token. Hãy chọn nguồn nhỏ hơn hoặc một đoạn cụ thể.',
      suggestedActionVi: 'Chọn ít nguồn hơn hoặc bôi một đoạn ngắn hơn, rồi hỏi lại.',
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

async function verifyOrReject(
  accessToken: string,
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>,
): Promise<SourcesHttpResult | { ok: true; userId: string; accessToken: string }> {
  if (!verifyAccessToken) return authRequiredResult();
  try {
    const auth = await verifyAccessToken(accessToken);
    if (auth.status === 'auth_required') return authRequiredResult();
    if (auth.status !== 'ok') return unavailableResult();
    return { ok: true, userId: auth.userId, accessToken: auth.accessToken };
  } catch {
    return unavailableResult();
  }
}

export async function handleGroundedChatRequest(input: {
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => SourcesRepository;
  routerExecute: GroundedRouterExecute;
  webSearch?: WebSearchFn;
}): Promise<SourcesHttpResult> {
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

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
    hydration = await input.repositoryForToken(auth.accessToken).getSelectedVersions(parsed.data.selectedVersionIds);
  } catch {
    return unavailableResult();
  }

  if (hydration.status === 'unavailable') return unavailableResult();
  if (hydration.status !== 'ok') return selectionUnavailableResult();

  const usable = hydration.items.filter(isUsableSource);
  if (!usable.length) {
    return { status: 200, body: unsupportedResponse() };
  }
  if (!isValidSelectedSpan(parsed.data.sourceSpan, usable)) {
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
    if (error instanceof SelectSmallerSourceError) return selectSmallerSourceResult();
    return providerErrorResult(error);
  }
}

export async function handleWebResearchRequest(input: {
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  searchAdapterConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  webSearch?: WebSearchFn;
}): Promise<SourcesHttpResult> {
  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  if (!input.searchAdapterConfigured || !input.webSearch) {
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
