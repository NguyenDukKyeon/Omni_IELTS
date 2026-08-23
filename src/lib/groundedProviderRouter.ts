import type { ApiFailure, ApiFailureCategory } from '../types';
import { classifyApiFailure, type AiProvider } from './apiFailure';

type ProviderAttempt<T> = {
  provider: AiProvider;
  model: string;
  run: () => Promise<T>;
};

type RouterOptions = {
  now?: () => number;
  dailyResetAt?: (now: number) => number;
  onAttemptFailure?: (attempt: {
    provider: AiProvider;
    model: string;
    category: ApiFailureCategory;
  }) => void;
};

const FALLBACK_CATEGORIES = new Set<ApiFailureCategory>([
  'auth_missing',
  'auth_invalid',
  'rate_limited',
  'quota_exhausted',
  'provider_overloaded',
  'network_failed',
  'schema_invalid',
]);

const pacificFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function pacificParts(epochMs: number) {
  const values = Object.fromEntries(
    pacificFormatter.formatToParts(new Date(epochMs))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

export function nextGeminiDailyResetAt(now: number = Date.now()) {
  const current = pacificParts(now);
  const nextDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const target = {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
    hour: 0,
    minute: 0,
    second: 0,
  };
  const targetWallClock = Date.UTC(target.year, target.month - 1, target.day);
  let candidate = targetWallClock + 8 * 60 * 60 * 1000;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = pacificParts(candidate);
    const actualWallClock = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
    );
    candidate += targetWallClock - actualWallClock;
  }
  return candidate;
}

export class GroundedProviderRouter {
  private readonly now: () => number;
  private readonly dailyResetAt: (now: number) => number;
  private readonly onAttemptFailure?: RouterOptions['onAttemptFailure'];
  private readonly blockedUntil = new Map<string, number>();

  constructor(options: RouterOptions = {}) {
    this.now = options.now || Date.now;
    this.dailyResetAt = options.dailyResetAt || nextGeminiDailyResetAt;
    this.onAttemptFailure = options.onAttemptFailure;
  }

  async execute<T>(input: {
    primary: ProviderAttempt<T>;
    fallback?: ProviderAttempt<T>;
    fallbacks?: ProviderAttempt<T>[];
  }): Promise<{
    value: T;
    provider: AiProvider;
    model: string;
    fallbackReason?: ApiFailureCategory;
  }> {
    const attempts = [
      input.primary,
      ...(input.fallbacks || (input.fallback ? [input.fallback] : [])),
    ];
    let primaryFailure: ApiFailure | undefined;
    let lastFailure: ApiFailure | undefined;

    for (let index = 0; index < attempts.length; index += 1) {
      const attempt = attempts[index];
      const circuitKey = `${attempt.provider}:${attempt.model}`;
      const blockedUntil = this.blockedUntil.get(circuitKey) || 0;
      let failure: ApiFailure;

      if (blockedUntil > this.now()) {
        failure = classifyApiFailure(
          { status: 429, message: 'Daily quota exhausted; model circuit remains open' },
          'forecast',
          attempt.provider,
        );
      } else {
        this.blockedUntil.delete(circuitKey);
        try {
          return {
            value: await attempt.run(),
            provider: attempt.provider,
            model: attempt.model,
            fallbackReason: index > 0 ? primaryFailure?.category : undefined,
          };
        } catch (error) {
          failure = classifyApiFailure(error, 'forecast', attempt.provider);
          if (failure.category === 'quota_exhausted') {
            const providerResetAt = failure.retryAfterMs
              ? this.now() + failure.retryAfterMs
              : this.dailyResetAt(this.now());
            this.blockedUntil.set(circuitKey, providerResetAt);
          }
        }
      }

      if (index === 0) primaryFailure = failure;
      lastFailure = failure;
      this.onAttemptFailure?.({
        provider: attempt.provider,
        model: attempt.model,
        category: failure.category,
      });
      if (!FALLBACK_CATEGORIES.has(failure.category)) throw failure;
    }

    throw lastFailure || primaryFailure;
  }
}
