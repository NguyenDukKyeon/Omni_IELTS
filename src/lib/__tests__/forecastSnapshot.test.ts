import { describe, expect, it } from 'vitest';
import type { ForecastGroundingResponse } from '../../types';
import { loadForecastSnapshot, saveForecastSnapshot } from '../forecastSnapshot';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const snapshot: ForecastGroundingResponse = {
  status: 'fresh',
  forecastItems: [],
  searchQueries: ['recent IELTS report'],
  groundingSources: [{ title: 'Source', url: 'https://example.org/source' }],
  lastUpdated: '2026-08-23T08:00:00.000Z',
  summaryOverviewVi: 'Đã xác minh.',
};

describe('forecast snapshot persistence', () => {
  it('loads the last successful snapshot as stale without changing its provenance', () => {
    const storage = new MemoryStorage();
    saveForecastSnapshot(storage, snapshot);

    expect(loadForecastSnapshot(storage)).toEqual({ ...snapshot, status: 'stale', stale: true });
  });

  it('ignores corrupt or unavailable snapshots', () => {
    const storage = new MemoryStorage();
    storage.setItem('omni_forecast_snapshot_v1', '{broken');
    expect(loadForecastSnapshot(storage)).toBeNull();

    saveForecastSnapshot(storage, { ...snapshot, status: 'unavailable' });
    expect(loadForecastSnapshot(storage)).toBeNull();
  });
});
