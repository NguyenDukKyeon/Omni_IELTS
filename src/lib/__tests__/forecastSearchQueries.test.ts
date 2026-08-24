import { describe, expect, it, vi } from 'vitest';
import { buildForecastSearchQueries, runForecastQueryVariants } from '../forecastSearchQueries';

describe('Forecast Search query variants', () => {
  it('keeps the requested query first and adds targeted and official-source fallbacks', () => {
    const queries = buildForecastSearchQueries({
      customQuery: 'IELTS Writing Task 2 recent reported topics Vietnam',
      skill: 'writing_task2',
      council: 'both_vietnam',
      timeframe: 'latest',
    }, new Date('2026-08-24T00:00:00.000Z'));

    expect(queries).toHaveLength(3);
    expect(queries[0]).toBe('IELTS Writing Task 2 recent reported topics Vietnam');
    expect(queries[1]).toContain('Writing Task 2');
    expect(queries[1]).toContain('IDP and British Council Vietnam');
    expect(queries[1]).toContain('2026');
    expect(queries[2]).toContain('official IELTS preparation sources');
  });

  it('retries only no-results responses and reports the query that succeeded', async () => {
    const run = vi.fn()
      .mockRejectedValueOnce({ category: 'no_results' })
      .mockResolvedValueOnce({ status: 'fresh' });

    const result = await runForecastQueryVariants(
      ['narrow query', 'broader query', 'official fallback'],
      run,
      (error) => (error as { category?: string }).category,
    );

    expect(result).toEqual({ value: { status: 'fresh' }, query: 'broader query' });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not hide provider or schema failures behind broader searches', async () => {
    const failure = { category: 'schema_invalid' };
    const run = vi.fn().mockRejectedValue(failure);

    await expect(runForecastQueryVariants(
      ['narrow query', 'broader query'],
      run,
      (error) => (error as { category?: string }).category,
    )).rejects.toBe(failure);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
