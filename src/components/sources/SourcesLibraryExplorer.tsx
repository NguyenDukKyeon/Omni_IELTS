import { Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ContentRightsState, SourceCollection, SourceMediaType, SourceRecord } from '../../types/sources';
import {
  filterSources,
  searchSources,
  sortSources,
  type SourceLibraryFilters,
  type SourceLibrarySort,
} from '../../lib/sources/libraryStore';
import { CollectionDrawer } from './CollectionDrawer';
import { SourceCard } from './SourceCard';
import { SourcesFilterBar } from './SourcesFilterBar';

export type SourcesLibraryExplorerState =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'stale'
  | 'degraded'
  | 'unavailable'
  | 'retryable_error'
  | 'rejected';

export interface SourcesLibraryExplorerProps {
  sources: readonly SourceRecord[];
  collections: readonly SourceCollection[];
  state?: SourcesLibraryExplorerState;
  errorMessage?: string;
  selectedSourceIds: readonly string[];
  onSelectedSourceIdsChange: (sourceIds: string[]) => void;
  onToggleSource: (source: SourceRecord, selected: boolean) => void;
  onOpenSource: (source: SourceRecord) => void;
  onCreateArtifact: (source: SourceRecord) => void;
  onCreateCollection: (name: string) => Promise<void> | void;
  onRetry?: () => void;
  onAddSource?: () => void;
}

function stateTitle(state: SourcesLibraryExplorerState): string {
  switch (state) {
    case 'stale': return 'Showing a cached library';
    case 'degraded': return 'Reduced-data mode';
    case 'unavailable': return 'Library unavailable';
    case 'retryable_error': return 'The library needs a retry';
    case 'rejected': return 'Some source inputs were rejected';
    default: return '';
  }
}

function stateMessage(state: SourcesLibraryExplorerState, errorMessage?: string): string {
  if (errorMessage) return errorMessage;
  switch (state) {
    case 'stale': return 'This view may be out of date. Refresh when you are online.';
    case 'degraded': return 'Text previews remain available; heavy media is not loaded in this view.';
    case 'unavailable': return 'The server could not return your private Sources library.';
    case 'retryable_error': return 'The last library request did not finish. Your existing source state is unchanged.';
    case 'rejected': return 'An input was blocked by format or rights rules. No ready source was created.';
    default: return '';
  }
}

function SkeletonCards() {
  return (
    <div className="omni-sources-library__grid" aria-label="Loading source library">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="omni-source-card omni-source-card--skeleton" key={index} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function EmptyLibrary({ onAddSource }: { onAddSource?: () => void }) {
  return (
    <div className="omni-sources-library__empty" role="status">
      <Search aria-hidden="true" />
      <h2>No sources yet</h2>
      <p>Bring one bounded text, article URL, document, or caption file into your private library.</p>
      {onAddSource ? (
        <button
          type="button"
          className="omni-sources-library__empty-action"
          data-ux-control="sources.import.empty-cta"
          data-ux-flow="sources.import.submit"
          onClick={onAddSource}
        >
          <Plus aria-hidden="true" />
          Add a source
        </button>
      ) : null}
    </div>
  );
}

export function SourcesLibraryExplorer({
  sources,
  collections,
  state = 'ready',
  errorMessage,
  selectedSourceIds,
  onSelectedSourceIdsChange,
  onToggleSource,
  onOpenSource,
  onCreateArtifact,
  onCreateCollection,
  onRetry,
  onAddSource,
}: SourcesLibraryExplorerProps) {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<SourceMediaType | 'all'>('all');
  const [rightsState, setRightsState] = useState<ContentRightsState | 'all'>('all');
  const [sort, setSort] = useState<SourceLibrarySort>('recently_updated');
  const [collectionId, setCollectionId] = useState('all');

  const filters = useMemo<SourceLibraryFilters>(() => ({
    ...(mediaType !== 'all' ? { mediaType } : {}),
    ...(rightsState !== 'all' ? { rightsState } : {}),
    ...(collectionId !== 'all' ? { collectionId } : {}),
  }), [collectionId, mediaType, rightsState]);

  const visibleSources = useMemo(() => sortSources(
    filterSources(searchSources(sources, query), filters),
    sort,
  ), [filters, query, sort, sources]);

  const selected = new Set(selectedSourceIds);
  const hasCachedSources = sources.length > 0;
  const showHardUnavailable = state === 'unavailable' && !hasCachedSources;

  const toggleSource = (source: SourceRecord) => {
    const nextSelected = selected.has(source.id)
      ? selectedSourceIds.filter((sourceId) => sourceId !== source.id)
      : [...selectedSourceIds, source.id];
    onSelectedSourceIdsChange(nextSelected);
    onToggleSource(source, !selected.has(source.id));
  };

  return (
    <section className="omni-sources-library" data-ux-scope="sources-library-v2" aria-labelledby="sources-library-title">
      <header className="omni-sources-library__header">
        <div>
          <h1 id="sources-library-title">Sources Library</h1>
          <p>Choose the material you want to read, question, or turn into one owned draft.</p>
        </div>
        {onAddSource ? (
          <button
            type="button"
            className="omni-sources-library__add"
            data-ux-control="sources.import.open"
            data-ux-flow="sources.import.submit"
            onClick={onAddSource}
          >
            <Plus aria-hidden="true" />
            Add source
          </button>
        ) : null}
      </header>

      {state !== 'ready' && state !== 'empty' && state !== 'loading' ? (
        <div className={`omni-sources-library__notice omni-sources-library__notice--${state}`} role={state === 'retryable_error' ? 'alert' : 'status'}>
          <div>
            <strong>{stateTitle(state)}</strong>
            <p>{stateMessage(state, errorMessage)}</p>
          </div>
          {onRetry && (state === 'stale' || state === 'unavailable' || state === 'retryable_error') ? (
            <button
              type="button"
              className="omni-sources-library__retry"
              data-ux-control="sources.library.retry"
              data-ux-flow="sources.manage"
              onClick={onRetry}
            >
              <RefreshCw aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {state === 'loading' ? <SkeletonCards /> : (
        <>
          {!showHardUnavailable ? (
            <SourcesFilterBar
              query={query}
              onQueryChange={setQuery}
              mediaType={mediaType}
              onMediaTypeChange={setMediaType}
              rightsState={rightsState}
              onRightsStateChange={setRightsState}
              sort={sort}
              onSortChange={setSort}
              collectionId={collectionId}
              collections={collections}
              onCollectionChange={setCollectionId}
            />
          ) : null}

          <div className="omni-sources-library__body">
            {!showHardUnavailable ? (
              <CollectionDrawer
                collections={collections}
                activeCollectionId={collectionId === 'all' ? undefined : collectionId}
                onSelectCollection={(nextId) => setCollectionId(nextId ?? 'all')}
                onCreateCollection={onCreateCollection}
              />
            ) : null}
            <div className="omni-sources-library__results">
              <div className="omni-sources-library__result-heading">
                <p>{visibleSources.length} {visibleSources.length === 1 ? 'source' : 'sources'}</p>
                <p role="status">{selected.size} selected for context</p>
              </div>
              {showHardUnavailable || state === 'empty' || (sources.length === 0 && state === 'ready') ? (
                <EmptyLibrary onAddSource={onAddSource} />
              ) : visibleSources.length === 0 ? (
                <div className="omni-sources-library__no-match" role="status">
                  No sources match these filters.
                </div>
              ) : (
                <div className="omni-sources-library__grid" role="list" aria-label="Source records">
                  {visibleSources.map((source) => (
                    <div role="listitem" key={source.id}>
                      <SourceCard
                        source={source}
                        selected={selected.has(source.id)}
                        onToggleSelection={toggleSource}
                        onOpen={onOpenSource}
                        onCreateArtifact={onCreateArtifact}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
