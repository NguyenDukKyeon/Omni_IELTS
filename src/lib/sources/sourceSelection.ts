import type { SourceRecord } from '../../types/sources';

export type SelectedSourceVersionIds = Readonly<Record<string, string>>;

/**
 * Returns the learner's explicit version selection. A present historical value
 * is authoritative even when it is no longer visible; the caller must surface
 * the resulting typed selection failure instead of silently falling back.
 */
export function selectedVersionIdForSource(
  source: SourceRecord,
  selectedVersionIdsBySource: SelectedSourceVersionIds,
): string {
  if (Object.prototype.hasOwnProperty.call(selectedVersionIdsBySource, source.id)) {
    return selectedVersionIdsBySource[source.id] || '';
  }
  return source.currentVersionId;
}

export function selectedVersionIdsForSources(
  sources: readonly SourceRecord[],
  selectedSourceIds: readonly string[],
  selectedVersionIdsBySource: SelectedSourceVersionIds,
): string[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return selectedSourceIds.flatMap((sourceId) => {
    const source = sourceById.get(sourceId);
    if (!source || source.processingState !== 'ready') return [];
    const versionId = selectedVersionIdForSource(source, selectedVersionIdsBySource);
    return versionId ? [versionId] : [];
  });
}
