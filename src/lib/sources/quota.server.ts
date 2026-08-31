/** Server-only in-process quota for Sources cloud routes. Not durable across instances. */
import { consumeFixedWindowQuota, type FixedWindowUsage, type QuotaDecision } from '../mediaImport';

export type SourcesQuotaBucket = 'grounded-chat' | 'web-research';

export type SourcesQuotaBucketConfig = {
  limit: number;
  windowMs: number;
};

export type SourcesQuotaConfig = {
  groundedChat: SourcesQuotaBucketConfig;
  webResearch: SourcesQuotaBucketConfig;
};

export type ConsumeSourcesQuota = (input: {
  bucket: SourcesQuotaBucket;
  userId: string;
}) => QuotaDecision;

const DEFAULT_CHAT_LIMIT = 20;
const DEFAULT_WEB_LIMIT = 10;
const DEFAULT_WINDOW_MS = 3_600_000;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const MIN_WINDOW_MS = 60_000;
const MAX_WINDOW_MS = 86_400_000;

function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseSourcesQuotaEnv(env: Record<string, string | undefined>): SourcesQuotaConfig {
  return {
    groundedChat: {
      limit: parseBoundedInt(
        env.OMNI_SOURCES_GROUNDED_CHAT_QUOTA_LIMIT,
        DEFAULT_CHAT_LIMIT,
        MIN_LIMIT,
        MAX_LIMIT,
      ),
      windowMs: parseBoundedInt(
        env.OMNI_SOURCES_GROUNDED_CHAT_QUOTA_WINDOW_MS,
        DEFAULT_WINDOW_MS,
        MIN_WINDOW_MS,
        MAX_WINDOW_MS,
      ),
    },
    webResearch: {
      limit: parseBoundedInt(
        env.OMNI_SOURCES_WEB_RESEARCH_QUOTA_LIMIT,
        DEFAULT_WEB_LIMIT,
        MIN_LIMIT,
        MAX_LIMIT,
      ),
      windowMs: parseBoundedInt(
        env.OMNI_SOURCES_WEB_RESEARCH_QUOTA_WINDOW_MS,
        DEFAULT_WINDOW_MS,
        MIN_WINDOW_MS,
        MAX_WINDOW_MS,
      ),
    },
  };
}

export function createSourcesQuotaConsumer(
  config: SourcesQuotaConfig,
  options?: {
    now?: () => number;
    groundedChatWindows?: Map<string, FixedWindowUsage>;
    webResearchWindows?: Map<string, FixedWindowUsage>;
  },
): ConsumeSourcesQuota {
  const chatWindows = options?.groundedChatWindows ?? new Map<string, FixedWindowUsage>();
  const webWindows = options?.webResearchWindows ?? new Map<string, FixedWindowUsage>();
  const now = options?.now ?? Date.now;
  return ({ bucket, userId }) => {
    const windows = bucket === 'grounded-chat' ? chatWindows : webWindows;
    const bucketConfig = bucket === 'grounded-chat' ? config.groundedChat : config.webResearch;
    return consumeFixedWindowQuota(windows, userId, now(), bucketConfig.limit, bucketConfig.windowMs);
  };
}
