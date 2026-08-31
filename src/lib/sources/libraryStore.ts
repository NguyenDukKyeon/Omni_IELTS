import type { SourceMediaType, SourceProcessingState, SourceRecord } from '../../types/sources';

export interface SourceLibraryFilters {
  mediaType?: SourceMediaType;
  collectionId?: string;
  processingState?: SourceProcessingState;
}

function matchesFilters(source: SourceRecord, filters: SourceLibraryFilters): boolean {
  if (filters.mediaType !== undefined && source.type !== filters.mediaType) {
    return false;
  }
  if (filters.collectionId !== undefined && !source.collectionIds.includes(filters.collectionId)) {
    return false;
  }
  if (filters.processingState !== undefined && source.processingState !== filters.processingState) {
    return false;
  }
  return true;
}

function searchableText(source: SourceRecord): string {
  return [source.title, source.summary, ...source.tags].join('\u0000').toLowerCase();
}

function withCollectionIds(source: SourceRecord, collectionIds: string[]): SourceRecord {
  return {
    ...source,
    collectionIds: [...collectionIds],
  };
}

export function filterSources(
  sources: readonly SourceRecord[],
  filters: SourceLibraryFilters = {},
): SourceRecord[] {
  return sources.filter((source) => matchesFilters(source, filters));
}

export function searchSources(
  sources: readonly SourceRecord[],
  query: string,
): SourceRecord[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') {
    return sources.filter(() => true);
  }
  return sources.filter((source) => searchableText(source).includes(needle));
}

export function addSourceToCollection(
  source: SourceRecord,
  collectionId: string,
): SourceRecord {
  if (source.collectionIds.includes(collectionId)) {
    return withCollectionIds(source, source.collectionIds);
  }
  return withCollectionIds(source, [...source.collectionIds, collectionId]);
}

export function removeSourceFromCollection(
  source: SourceRecord,
  collectionId: string,
): SourceRecord {
  if (!source.collectionIds.includes(collectionId)) {
    return withCollectionIds(source, source.collectionIds);
  }
  return withCollectionIds(
    source,
    source.collectionIds.filter((id) => id !== collectionId),
  );
}
