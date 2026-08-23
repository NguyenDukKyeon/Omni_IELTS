import type { ForecastGroundingResponse } from '../types';

export const FORECAST_SNAPSHOT_STORAGE_KEY = 'omni_forecast_snapshot_v1';

function isUsableSnapshot(value: unknown): value is ForecastGroundingResponse {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<ForecastGroundingResponse>;
  return snapshot.status !== 'unavailable'
    && Array.isArray(snapshot.forecastItems)
    && Array.isArray(snapshot.groundingSources)
    && Array.isArray(snapshot.searchQueries)
    && typeof snapshot.lastUpdated === 'string'
    && typeof snapshot.summaryOverviewVi === 'string';
}

export function saveForecastSnapshot(storage: Storage, response: ForecastGroundingResponse) {
  if (response.status !== 'fresh' || !isUsableSnapshot(response)) return;
  storage.setItem(FORECAST_SNAPSHOT_STORAGE_KEY, JSON.stringify(response));
}

export function loadForecastSnapshot(storage: Storage): ForecastGroundingResponse | null {
  try {
    const serialized = storage.getItem(FORECAST_SNAPSHOT_STORAGE_KEY);
    if (!serialized) return null;
    const value = JSON.parse(serialized);
    if (!isUsableSnapshot(value)) return null;
    return { ...value, status: 'stale', stale: true };
  } catch {
    return null;
  }
}
