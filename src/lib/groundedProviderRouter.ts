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
  private readonly blockedUntil = new Map<AiProvider, number>();

  constructor(options: RouterOptions = {}) {
    this.now = options.now || Date.now;
    this.dailyResetAt = options.dailyResetAt || nextGeminiDailyResetAt;
  }

  async execute<T>(input: {
    primary: ProviderAttempt<T>;
    fallback?: ProviderAttempt<T>;
  }): Promise<{
    value: T;
    provider: AiProvider;
    model: string;
    fallbackReason?: ApiFailureCategory;
  }> {
    let primaryFailure: ApiFailure | undefined;
    const blockedUntil = this.blockedUntil.get(input.primary.provider) || 0;

    if (blockedUntil <= this.now()) {
      this.blockedUntil.delete(input.primary.provider);
      try {
        return {
          value: await input.primary.run(),
          provider: input.primary.provider,
          model: input.primary.model,
        };
      } catch (error) {
        primaryFailure = classifyApiFailure(error, 'forecast', input.primary.provider);
        if (primaryFailure.category === 'quota_exhausted') {
          this.blockedUntil.set(input.primary.provider, this.dailyResetAt(this.now()));
        }
      }
    } else {
      primaryFailure = classifyApiFailure(
        { status: 429, message: 'Daily quota exhausted; provider circuit remains open' },
        'forecast',
        input.primary.provider,
      );
    }

    if (!input.fallback || !primaryFailure || !FALLBACK_CATEGORIES.has(primaryFailure.category)) {
      throw primaryFailure;
    }

    try {
      return {
        value: await input.fallback.run(),
        provider: input.fallback.provider,
        model: input.fallback.model,
        fallbackReason: primaryFailure.category,
      };
    } catch (error) {
      throw classifyApiFailure(error, 'forecast', input.fallback.provider);
    }
  }
}
