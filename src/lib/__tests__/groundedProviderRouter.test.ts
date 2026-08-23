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
    const geminiFallback = vi.fn().mockResolvedValue({ forecastItems: [{ id: 'gemini-lite-item' }] });
    const groqFallback = vi.fn().mockResolvedValue({ forecastItems: [{ id: 'groq-item' }] });
    const router = new GroundedProviderRouter({
      now: () => Date.parse('2026-08-23T12:00:00.000Z'),
      dailyResetAt: () => Date.parse('2026-08-24T07:00:00.000Z'),
    });

    const result = await router.execute({
      primary: { provider: 'gemini', model: 'gemini-3.7-flash', run: primary },
      fallbacks: [
        { provider: 'gemini', model: 'gemini-3.5-flash-lite', run: geminiFallback },
        { provider: 'groq', model: 'groq/compound-mini', run: groqFallback },
      ],
    });

    expect(result.provider).toBe('gemini');
    expect(result.model).toBe('gemini-3.5-flash-lite');
    expect(result.fallbackReason).toBe('quota_exhausted');
    expect(geminiFallback).toHaveBeenCalledTimes(1);
    expect(groqFallback).not.toHaveBeenCalled();
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
