import { z } from 'zod';
import { executeArtifactJob, createArtifactJob, type ArtifactRouterExecute } from './artifactJobMachine';
import type { LearnerAuthResult, SourceHydrationResult } from './groundedChat';
import type { ConsumeSourcesQuota } from './quota.server';
import type { SourceArtifactJob, SourceSpan } from '../../types/sources';
import {
  applyVerifiedQuota,
  authRequiredResult,
  extractBearerToken,
  featureDisabledResult,
  invalidRequestResult,
  selectionUnavailableResult,
  type SourcesTransportResult,
  unavailableResult,
  verifyOrReject,
} from './transportShared.server';

const DestinationSchema = z.enum([
  'practice',
  'mock_section',
  'vocabulary_deck',
  'note',
  'idea_bank',
]);

export const SourceSpanRequestSchema = z.object({
  sourceId: z.string().min(1).max(128),
  sourceVersionId: z.string().min(1).max(128),
  blockIds: z.array(z.string().min(1).max(128)).max(500).optional(),
  pageIndex: z.number().int().min(0).max(100_000).optional(),
  startMs: z.number().int().min(0).max(86_400_000).optional(),
  endMs: z.number().int().min(0).max(86_400_000).optional(),
  exactTextSnippet: z.string().max(20_000).optional(),
}).strict().refine((span) => (
  span.endMs === undefined
    || span.startMs === undefined
    || span.endMs >= span.startMs
), { message: 'source_span_time_order' });

const TargetBandSchema = z.number()
  .refine(Number.isFinite, { message: 'target_band_finite' })
  .min(0)
  .max(9);

export const CreateArtifactJobRequestSchema = z.object({
  sourceVersionId: z.string().min(1).max(128),
  sourceSpan: SourceSpanRequestSchema.optional(),
  destination: DestinationSchema,
  targetBand: TargetBandSchema,
  customInstruction: z.string().trim().max(2_000).optional(),
}).strict();

export type CreateArtifactJobRequest = z.infer<typeof CreateArtifactJobRequestSchema>;

export interface ArtifactJobRepository {
  getSelectedVersions(selectedVersionIds: readonly string[]): Promise<SourceHydrationResult>;
  saveArtifactJob(job: SourceArtifactJob): Promise<SourceArtifactJob>;
  getArtifactJob?(jobId: string): Promise<SourceArtifactJob | undefined>;
}

export type ArtifactJobRequestHandlerInput = {
  featureEnabled?: boolean;
  authorizationHeader?: string | null;
  body: unknown;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => ArtifactJobRepository;
  consumeQuota?: ConsumeSourcesQuota;
  routerExecute: ArtifactRouterExecute;
};

function jobResponse(job: SourceArtifactJob): SourcesTransportResult {
  return {
    status: 200,
    body: {
      status: job.state,
      job,
    },
  };
}

function sourceNotReadyResult(): SourcesTransportResult {
  return {
    status: 200,
    body: {
      status: 'source_unavailable',
      code: 'HANDOFF_REQUIRED',
      userMessageVi: 'Nguồn này chưa có văn bản có thể dùng trong Sources.',
      suggestedActionVi: 'Chọn nguồn đã trích xuất hoặc mở module sở hữu nguồn này.',
    },
  };
}

function sourceIsUsable(status: string, blockCount: number): boolean {
  return status !== 'unavailable' && status !== 'handoff_required' && blockCount > 0;
}

export async function handleArtifactJobRequest(
  input: ArtifactJobRequestHandlerInput,
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();

  const parsed = CreateArtifactJobRequestSchema.safeParse(input.body);
  if (!parsed.success) return invalidRequestResult();

  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  const quotaRejection = applyVerifiedQuota(input.consumeQuota, 'artifact-generation', auth.learner.userId);
  if (quotaRejection) return quotaRejection;

  const repository = input.repositoryForToken(auth.learner.accessToken);
  let hydration: SourceHydrationResult;
  try {
    hydration = await repository.getSelectedVersions([parsed.data.sourceVersionId]);
  } catch {
    return unavailableResult();
  }
  if (hydration.status !== 'ok' || hydration.items.length !== 1) return selectionUnavailableResult();

  const selected = hydration.items[0];
  if (!selected || !sourceIsUsable(selected.record.processingState, selected.version.blocks.length)) {
    return sourceNotReadyResult();
  }
  if (parsed.data.sourceSpan && parsed.data.sourceSpan.sourceVersionId !== selected.version.id) {
    return selectionUnavailableResult();
  }

  const queuedJob = createArtifactJob({
    id: globalThis.crypto.randomUUID(),
    userId: auth.learner.userId,
    sourceVersionId: parsed.data.sourceVersionId,
    destination: parsed.data.destination,
    targetBand: parsed.data.targetBand,
    selection: parsed.data.sourceSpan as SourceSpan | undefined,
    customInstruction: parsed.data.customInstruction,
  });

  try {
    await repository.saveArtifactJob(queuedJob);
    const processingJob: SourceArtifactJob = {
      ...queuedJob,
      state: 'processing',
      updatedAt: new Date().toISOString(),
    };
    await repository.saveArtifactJob(processingJob);
    const completedJob = await executeArtifactJob(processingJob, {
      version: selected.version,
      provenance: selected.record.provenance,
      routerExecute: input.routerExecute,
    });
    await repository.saveArtifactJob(completedJob);
    return jobResponse(completedJob);
  } catch {
    return unavailableResult();
  }
}

export type ArtifactJobStatusRequestHandlerInput = {
  featureEnabled?: boolean;
  authorizationHeader?: string | null;
  jobId: string;
  cloudConfigured: boolean;
  verifyAccessToken?: (accessToken: string) => Promise<LearnerAuthResult>;
  repositoryForToken: (accessToken: string) => ArtifactJobRepository;
};

export async function handleArtifactJobStatusRequest(
  input: ArtifactJobStatusRequestHandlerInput,
): Promise<SourcesTransportResult> {
  if (input.featureEnabled !== true) return featureDisabledResult();
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.jobId)) return selectionUnavailableResult();

  const accessToken = extractBearerToken(input.authorizationHeader);
  if (!accessToken) return authRequiredResult();
  if (!input.cloudConfigured) return unavailableResult();

  const auth = await verifyOrReject(accessToken, input.verifyAccessToken);
  if (!('ok' in auth)) return auth;

  try {
    const repository = input.repositoryForToken(auth.learner.accessToken);
    if (!repository.getArtifactJob) return unavailableResult();
    const job = await repository.getArtifactJob(input.jobId);
    if (!job) return selectionUnavailableResult();
    return jobResponse(job);
  } catch {
    return unavailableResult();
  }
}
