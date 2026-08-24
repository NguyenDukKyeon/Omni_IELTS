import { describe, expect, it, vi } from 'vitest';
import { requestBraveForecastEvidence } from '../braveSearch';

describe('requestBraveForecastEvidence', () => {
  it('turns Brave Web Search results into a compact evidence bundle', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      query: { original: 'IELTS Writing Task 2 Vietnam' },
      web: {
        results: [{
          title: 'IELTS preparation question',
          url: 'https://ielts.org/example-question',
          description: 'An official IELTS Writing Task 2 preparation question.',
          age: '2026-08-20T10:30:00.000Z',
          extra_snippets: ['Candidates should discuss both views.'],
        }],
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await requestBraveForecastEvidence({
      apiKey: 'brave-test-key',
      query: 'IELTS Writing Task 2 Vietnam',
      retrievedAt: '2026-08-24T12:00:00.000Z',
      fetchImpl,
    });

    expect(result).toEqual({
      provider: 'brave',
      model: 'brave-web-search',
      originalQuery: 'IELTS Writing Task 2 Vietnam',
      searchQueries: ['IELTS Writing Task 2 Vietnam'],
      retrievedAt: '2026-08-24T12:00:00.000Z',
      sources: [{
        title: 'IELTS preparation question',
        url: 'https://ielts.org/example-question',
        snippet: 'An official IELTS Writing Task 2 preparation question. Candidates should discuss both views.',
        publishedAt: '2026-08-20T10:30:00.000Z',
      }],
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('https://api.search.brave.com/res/v1/web/search?');
    expect(String(url)).toContain('q=IELTS+Writing+Task+2+Vietnam');
    expect(init?.headers).toMatchObject({ 'X-Subscription-Token': 'brave-test-key' });
  });

  it('does not accept loopback or non-http URLs as citation evidence', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      query: { original: 'IELTS recall' },
      web: { results: [
        { title: 'Loopback', url: 'http://127.0.0.1/private', description: 'Private.' },
        { title: 'IPv6 loopback', url: 'http://[::1]/private', description: 'Private.' },
        { title: 'IPv6 private', url: 'http://[fc00::1]/private', description: 'Private.' },
        { title: 'Unspecified', url: 'http://0.0.0.0/private', description: 'Private.' },
        { title: 'Unsafe', url: 'javascript:alert(1)', description: 'Unsafe.' },
      ] },
    }), { status: 200 }));

    await expect(requestBraveForecastEvidence({
      apiKey: 'brave-test-key',
      query: 'IELTS recall',
      fetchImpl,
    })).rejects.toMatchObject({ code: 'NO_RESULTS' });
  });
});
