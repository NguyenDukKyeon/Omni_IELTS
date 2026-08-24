import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ForecastGroundingResponse } from '../types';

type StoredSnapshot = {
  savedAt: number;
  response: ForecastGroundingResponse;
};

type StoredSnapshotFile = {
  version: 2;
  entries: Record<string, StoredSnapshot>;
};

function isCacheableResponse(value: unknown): value is ForecastGroundingResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<ForecastGroundingResponse>;
  return response.status === 'fresh'
    && Array.isArray(response.forecastItems)
    && response.forecastItems.length > 0
    && Array.isArray(response.groundingSources)
    && response.groundingSources.length > 0
    && Array.isArray(response.searchQueries)
    && typeof response.lastUpdated === 'string'
    && typeof response.summaryOverviewVi === 'string';
}

function parseStoredFile(value: unknown): StoredSnapshotFile {
  if (!value || typeof value !== 'object') return { version: 2, entries: {} };
  const record = value as Partial<StoredSnapshotFile>;
  if (record.version !== 2 || !record.entries || typeof record.entries !== 'object') {
    return { version: 2, entries: {} };
  }
  const entries = Object.fromEntries(Object.entries(record.entries).filter(([, entry]) => {
    return Boolean(entry)
      && typeof entry === 'object'
      && Number.isFinite((entry as StoredSnapshot).savedAt)
      && isCacheableResponse((entry as StoredSnapshot).response);
  }));
  return { version: 2, entries };
}

export class ForecastServerCache {
  readonly filePath: string;
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => number;
  private loaded: StoredSnapshotFile | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(input: { filePath: string; ttlMs: number; maxEntries?: number; now?: () => number }) {
    this.filePath = path.resolve(input.filePath);
    this.ttlMs = Math.max(1, input.ttlMs);
    this.maxEntries = Math.max(1, Math.floor(input.maxEntries || 100));
    this.now = input.now || Date.now;
  }

  async getFresh(key: string): Promise<ForecastGroundingResponse | null> {
    const entry = (await this.read()).entries[key];
    if (!entry || this.now() - entry.savedAt > this.ttlMs) return null;
    return { ...entry.response, status: 'fresh', cacheStatus: 'hit', stale: false };
  }

  async getStale(key: string): Promise<ForecastGroundingResponse | null> {
    const entry = (await this.read()).entries[key];
    if (!entry) return null;
    return { ...entry.response, status: 'stale', cacheStatus: 'stale', stale: true };
  }

  async set(key: string, response: ForecastGroundingResponse): Promise<void> {
    if (!isCacheableResponse(response)) return;
    const store = await this.read();
    store.entries[key] = {
      savedAt: this.now(),
      response: { ...response, status: 'fresh', cacheStatus: 'miss', stale: false },
    };
    const entriesByAge = Object.entries(store.entries).sort((left, right) => left[1].savedAt - right[1].savedAt);
    for (const [expiredKey] of entriesByAge.slice(0, Math.max(0, entriesByAge.length - this.maxEntries))) {
      delete store.entries[expiredKey];
    }
    this.writeQueue = this.writeQueue.catch(() => undefined).then(async () => {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    });
    await this.writeQueue;
  }

  private async read(): Promise<StoredSnapshotFile> {
    if (this.loaded) return this.loaded;
    try {
      this.loaded = parseStoredFile(JSON.parse(await readFile(this.filePath, 'utf8')));
    } catch {
      this.loaded = { version: 2, entries: {} };
    }
    return this.loaded;
  }
}
