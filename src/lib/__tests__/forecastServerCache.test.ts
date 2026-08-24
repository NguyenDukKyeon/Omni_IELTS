import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ForecastGroundingResponse } from '../../types';
import { ForecastServerCache } from '../forecastServerCache';

const temporaryDirectories: string[] = [];
const response: ForecastGroundingResponse = {
  status: 'fresh',
  provider: 'groq',
  model: 'groq/compound-mini',
  forecastItems: [{
    id: 'cached-item',
    title: 'Cached item',
    skill: 'writing_task2',
    council: 'both_vietnam',
    councilLabel: 'IDP & BC Việt Nam',
    examDate: 'Dự báo · cập nhật 24/08/2026',
    topicDomain: 'Education',
    promptStatement: 'Some people believe university education should be free for everyone.',
    trendStatus: 'quarter_forecast',
    trendBadge: 'Dự báo luyện tập',
    evidenceType: 'forecast',
    groundingSourceTitle: 'IELTS source',
    groundingSourceUrl: 'https://example.org/source',
    citations: [{ claimId: 'cached-item', title: 'IELTS source', url: 'https://example.org/source' }],
  }],
  searchQueries: ['IELTS education'],
  groundingSources: [{ title: 'IELTS source', url: 'https://example.org/source' }],
  lastUpdated: '2026-08-24T12:00:00.000Z',
  summaryOverviewVi: 'Snapshot có nguồn.',
  stale: false,
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createCache(now: () => number) {
  const directory = await mkdtemp(path.join(tmpdir(), 'omni-forecast-cache-'));
  temporaryDirectories.push(directory);
  return new ForecastServerCache({
    filePath: path.join(directory, 'snapshots.json'),
    ttlMs: 6 * 60 * 60 * 1_000,
    now,
  });
}

describe('ForecastServerCache', () => {
  it('shares a successful snapshot while it is inside the six-hour TTL', async () => {
    let now = Date.parse('2026-08-24T12:00:00.000Z');
    const cache = await createCache(() => now);
    await cache.set('writing-vietnam', response);

    now += 5 * 60 * 60 * 1_000;
    await expect(cache.getFresh('writing-vietnam')).resolves.toMatchObject({
      status: 'fresh',
      cacheStatus: 'hit',
      forecastItems: [{ id: 'cached-item' }],
    });
  });

  it('returns an expired snapshot only through the explicitly stale path', async () => {
    let now = Date.parse('2026-08-24T12:00:00.000Z');
    const cache = await createCache(() => now);
    await cache.set('writing-vietnam', response);

    now += 7 * 60 * 60 * 1_000;
    await expect(cache.getFresh('writing-vietnam')).resolves.toBeNull();
    await expect(cache.getStale('writing-vietnam')).resolves.toMatchObject({
      status: 'stale',
      cacheStatus: 'stale',
      stale: true,
      forecastItems: [{ id: 'cached-item' }],
    });
  });

  it('loads the same safe snapshot after a server restart', async () => {
    const now = () => Date.parse('2026-08-24T12:30:00.000Z');
    const first = await createCache(now);
    await first.set('writing-vietnam', response);
    const second = new ForecastServerCache({ filePath: first.filePath, ttlMs: 6 * 60 * 60 * 1_000, now });

    await expect(second.getFresh('writing-vietnam')).resolves.toMatchObject({
      cacheStatus: 'hit',
      provider: 'groq',
    });
  });

  it('prunes the oldest snapshots so arbitrary queries cannot grow the cache without bound', async () => {
    let nowValue = Date.parse('2026-08-24T12:00:00.000Z');
    const directory = await mkdtemp(path.join(tmpdir(), 'omni-forecast-cache-'));
    temporaryDirectories.push(directory);
    const cache = new ForecastServerCache({
      filePath: path.join(directory, 'snapshots.json'),
      ttlMs: 6 * 60 * 60 * 1_000,
      maxEntries: 2,
      now: () => nowValue,
    });
    await cache.set('oldest', response);
    nowValue += 1;
    await cache.set('middle', response);
    nowValue += 1;
    await cache.set('newest', response);

    await expect(cache.getStale('oldest')).resolves.toBeNull();
    await expect(cache.getFresh('middle')).resolves.not.toBeNull();
    await expect(cache.getFresh('newest')).resolves.not.toBeNull();
  });

  it('ignores snapshots written by the older provenance rules', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'omni-forecast-cache-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'snapshots.json');
    await writeFile(filePath, JSON.stringify({
      version: 1,
      entries: { legacy: { savedAt: Date.now(), response } },
    }));
    const cache = new ForecastServerCache({ filePath, ttlMs: 6 * 60 * 60 * 1_000 });

    await expect(cache.getStale('legacy')).resolves.toBeNull();
  });
});
