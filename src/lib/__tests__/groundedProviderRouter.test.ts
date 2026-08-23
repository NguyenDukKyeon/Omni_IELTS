import { describe, expect, it, vi } from 'vitest';
import { GroundedProviderRouter, nextGeminiDailyResetAt } from '../groundedProviderRouter';

describe('nextGeminiDailyResetAt', () => {
  it.each([
    ['2026-08-23T12:00:00.000Z', '2026-08-24T07:00:00.000Z'],
    ['2026-12-23T12:00:00.000Z', '2026-12-24T08:00:00.000Z'],
  ])('returns the next midnight in Pacific time for %s', (now, expected) => {
    expect(new Date(nextGeminiDailyResetAt(Date.parse(now))).toISOString()).toBe(expected);
  });
});

describe('GroundedProviderRouter', () => {
  it('falls back to Groq after Gemini exhausts its daily quota', async () => {
    const primary = vi.fn().mockRejectedValue({
      status: 429,
      message: 'RESOURCE_EXHAUSTED: daily quota exhausted',
    });
    const fallback = vi.fn().mockResolvedValue({ forecastItems: [{ id: 'groq-item' }] });
    const router = new GroundedProviderRouter({
      now: () => Date.parse('2026-08-23T12:00:00.000Z'),
      dailyResetAt: () => Date.parse('2026-08-24T07:00:00.000Z'),
    });

    const result = await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallback: { provider: 'groq', model: 'groq/compound-mini', run: fallback },
    });

    expect(result).toEqual({
      value: { forecastItems: [{ id: 'groq-item' }] },
      provider: 'groq',
      model: 'groq/compound-mini',
      fallbackReason: 'quota_exhausted',
    });
    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('tries another grounded Gemini model before Groq and isolates circuit state per model', async () => {
    const primary = vi.fn().mockRejectedValue({ status: 429, message: 'Daily quota exhausted' });
    const gemini35Fallback = vi.fn().mockRejectedValue({ status: 429, message: 'Monthly quota exhausted' });
    const groqMiniFallback = vi.fn().mockRejectedValue({ status: 429, message: 'Daily quota exhausted' });
    const groqFallback = vi.fn().mockResolvedValue({ forecastItems: [{ id: 'groq-compound-item' }] });
    const router = new GroundedProviderRouter({
      now: () => Date.parse('2026-08-23T12:00:00.000Z'),
      dailyResetAt: () => Date.parse('2026-08-24T07:00:00.000Z'),
    });

    const result = await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallbacks: [
        { provider: 'gemini', model: 'gemini-3.5-flash-lite', run: gemini35Fallback },
        { provider: 'groq', model: 'groq/compound-mini', run: groqMiniFallback },
        { provider: 'groq', model: 'groq/compound', run: groqFallback },
      ],
    });

    expect(result.provider).toBe('groq');
    expect(result.model).toBe('groq/compound');
    expect(result.fallbackReason).toBe('quota_exhausted');
    expect(gemini35Fallback).toHaveBeenCalledTimes(1);
    expect(groqMiniFallback).toHaveBeenCalledTimes(1);
    expect(groqFallback).toHaveBeenCalledTimes(1);
  });

  it('keeps Gemini circuit open until the daily reset instead of spending another failed request', async () => {
    const primary = vi.fn().mockRejectedValue({ status: 429, message: 'Daily quota exhausted' });
    const fallback = vi.fn().mockResolvedValue({ ok: true });
    let now = Date.parse('2026-08-23T12:00:00.000Z');
    const router = new GroundedProviderRouter({
      now: () => now,
      dailyResetAt: () => Date.parse('2026-08-24T07:00:00.000Z'),
    });

    await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallback: { provider: 'groq', model: 'groq/compound-mini', run: fallback },
    });
    await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallback: { provider: 'groq', model: 'groq/compound-mini', run: fallback },
    });

    expect(primary).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(2);

    now = Date.parse('2026-08-24T07:00:00.001Z');
    primary.mockResolvedValueOnce({ ok: 'gemini-restored' });
    const restored = await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallback: { provider: 'groq', model: 'groq/compound-mini', run: fallback },
    });

    expect(primary).toHaveBeenCalledTimes(2);
    expect(restored.provider).toBe('gemini');
  });
});
