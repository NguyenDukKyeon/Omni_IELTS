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
  onToggleSource?: (source: SourceRecord, selected: boolean) => void;
  onOpenSource: (source: SourceRecord) => void;
  onCreateArtifact: (source: SourceRecord) => void;
  onCreateCollection: (name: string) => Promise<void> | void;
  onRetry?: () => void;
  onAddSource?: () => void;
  isGuest?: boolean;
  onSignIn?: () => void;
}

function stateTitle(state: SourcesLibraryExplorerState): string {
  switch (state) {
    case 'stale': return 'Đang hiển thị thư viện đã lưu tạm';
    case 'degraded': return 'Chế độ dữ liệu rút gọn';
    case 'unavailable': return 'Thư viện tạm thời không khả dụng';
    case 'retryable_error': return 'Cần thử lại yêu cầu thư viện';
    case 'rejected': return 'Một số nguồn bị từ chối';
    default: return '';
  }
}

function stateMessage(state: SourcesLibraryExplorerState, errorMessage?: string): string {
  if (errorMessage) return errorMessage;
  switch (state) {
    case 'stale': return 'Dữ liệu có thể đã cũ. Hãy làm mới khi có mạng.';
    case 'degraded': return 'Bản xem trước văn bản vẫn có; nội dung media nặng không được tải ở đây.';
    case 'unavailable': return 'Máy chủ chưa thể trả về thư viện nguồn riêng của bạn.';
    case 'retryable_error': return 'Yêu cầu thư viện chưa hoàn tất. Trạng thái nguồn hiện tại vẫn được giữ.';
    case 'rejected': return 'Nguồn bị chặn do định dạng hoặc quyền sử dụng. Chưa tạo nguồn sẵn sàng.';
    default: return '';
  }
}

function SkeletonCards() {
  return (
    <div className="omni-sources-library__grid" aria-label="Đang tải thư viện nguồn">
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

function EmptyLibrary({ isGuest, onAddSource, onSignIn }: { isGuest?: boolean; onAddSource?: () => void; onSignIn?: () => void }) {
  return (
    <div className="omni-sources-library__empty" role="status">
      <Search aria-hidden="true" />
      <h2>{isGuest ? 'Thư viện nguồn riêng đang trống' : 'Chưa có nguồn'}</h2>
      <p>{isGuest ? 'Đăng nhập để thêm nguồn học tập của bạn vào thư viện riêng.' : 'Thêm một đoạn văn, URL bài viết, tài liệu hoặc phụ đề trong giới hạn cho phép.'}</p>
      {isGuest && onSignIn ? (
        <button
          type="button"
          className="omni-sources-library__empty-action"
          data-ux-control="sources.import.sign-in"
          data-ux-flow="sources.import.submit"
          onClick={onSignIn}
        >
          <Plus aria-hidden="true" />
          Đăng nhập để thêm nguồn
        </button>
      ) : onAddSource ? (
        <button
          type="button"
          className="omni-sources-library__empty-action"
          data-ux-control="sources.import.empty-cta"
          data-ux-flow="sources.import.submit"
          onClick={onAddSource}
        >
          <Plus aria-hidden="true" />
          Thêm nguồn
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
  isGuest = false,
  onSignIn,
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
    onToggleSource?.(source, !selected.has(source.id));
  };

  return (
    <section className="omni-sources-library" data-ux-scope="sources-library-v2" aria-labelledby="sources-library-title">
      <header className="omni-sources-library__header">
        <div>
          <h1 id="sources-library-title">Thư viện nguồn</h1>
          <p>Chọn nội dung để đọc, đặt câu hỏi hoặc chuyển thành một bản nháp thuộc phiên làm việc của bạn.</p>
        </div>
        {!isGuest && onAddSource ? (
          <button
            type="button"
            className="omni-sources-library__add"
            data-ux-control="sources.import.open"
            data-ux-flow="sources.import.submit"
            onClick={onAddSource}
          >
            <Plus aria-hidden="true" />
            Thêm nguồn
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
              Thử lại
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
                <p>{visibleSources.length} {visibleSources.length === 1 ? 'nguồn' : 'nguồn'}</p>
                <p role="status">{selected.size} nguồn được chọn làm ngữ cảnh</p>
              </div>
              {showHardUnavailable || state === 'empty' || (sources.length === 0 && state === 'ready') ? (
                <EmptyLibrary isGuest={isGuest} onAddSource={onAddSource} onSignIn={onSignIn} />
              ) : visibleSources.length === 0 ? (
                <div className="omni-sources-library__no-match" role="status">
                  Không có nguồn nào khớp bộ lọc.
                </div>
              ) : (
                <div className="omni-sources-library__grid" role="list" aria-label="Danh sách nguồn">
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
