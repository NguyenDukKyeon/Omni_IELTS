import { expect, test } from '@playwright/test';

test('the real YouTube importer returns a validated full transcript without cookies', async ({ request }) => {
  const capabilitiesResponse = await request.get('/api/media/capabilities');
  const capabilities = await capabilitiesResponse.json();
  expect(capabilitiesResponse.ok(), JSON.stringify(capabilities)).toBe(true);
  expect(capabilities.youtubeImport.available, JSON.stringify(capabilities)).toBe(true);

  const startResponse = await request.post('/api/media/youtube/import', {
    data: { url: 'https://www.youtube.com/watch?v=wr6fQ4KpbRM' },
  });
  const start = await startResponse.json();
  expect(startResponse.status(), JSON.stringify(start)).toBe(202);

  let job = start;
  await expect.poll(async () => {
    const response = await request.get(`/api/media/imports/${encodeURIComponent(start.id)}`);
    job = await response.json();
    return job.phase;
  }, { timeout: 90_000, intervals: [500, 1_000, 2_000] }).toBe('ready');

  expect(job.failure).toBeUndefined();
  expect(job.validation.coverage).toBeGreaterThanOrEqual(0.65);
  expect(job.validation.segmentCount).toBeGreaterThan(12);
  expect(job.session.transcriptSegments).toHaveLength(job.validation.segmentCount);
  expect(['yt-dlp', 'youtube-transcript', 'gemini-audio']).toContain(job.session.transcriptVersion.rawSource);
});
