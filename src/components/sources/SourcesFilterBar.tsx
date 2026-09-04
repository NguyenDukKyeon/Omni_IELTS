import type {
  ContentRightsState,
  SourceCollection,
  SourceMediaType,
} from '../../types/sources';
import type { SourceLibrarySort } from '../../lib/sources/libraryStore';

export interface SourcesFilterBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  mediaType: SourceMediaType | 'all';
  onMediaTypeChange: (mediaType: SourceMediaType | 'all') => void;
  rightsState?: ContentRightsState | 'all';
  onRightsStateChange?: (rightsState: ContentRightsState | 'all') => void;
  sort?: SourceLibrarySort;
  onSortChange?: (sort: SourceLibrarySort) => void;
  collectionId?: string;
  collections?: readonly SourceCollection[];
  onCollectionChange?: (collectionId: string) => void;
}

const MEDIA_TYPES: Array<{ value: SourceMediaType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả định dạng' },
  { value: 'text', label: 'Văn bản / Markdown' },
  { value: 'url', label: 'URL bài viết' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'vtt_srt', label: 'VTT / SRT' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'audio', label: 'Âm thanh' },
  { value: 'chart_image', label: 'Ảnh biểu đồ' },
];

const RIGHTS_STATES: Array<{ value: ContentRightsState | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả trạng thái quyền' },
  { value: 'owned_by_learner', label: 'Bạn sở hữu' },
  { value: 'licensed_public', label: 'Được cấp phép công khai' },
  { value: 'fair_use_academic', label: 'Sử dụng học thuật hợp lý' },
  { value: 'restricted_citation_only', label: 'Chỉ trích dẫn' },
  { value: 'rejected_unsupported', label: 'Quyền sử dụng bị từ chối' },
];

const SORT_OPTIONS: Array<{ value: SourceLibrarySort; label: string }> = [
  { value: 'recently_updated', label: 'Cập nhật gần đây' },
  { value: 'title_asc', label: 'Tên A–Z' },
  { value: 'type', label: 'Định dạng' },
];

export function SourcesFilterBar({
  query,
  onQueryChange,
  mediaType,
  onMediaTypeChange,
  rightsState = 'all',
  onRightsStateChange = () => undefined,
  sort = 'recently_updated',
  onSortChange = () => undefined,
  collectionId = 'all',
  collections = [],
  onCollectionChange = () => undefined,
}: SourcesFilterBarProps) {
  return (
    <div className="omni-sources-filter-bar" data-ux-scope="sources-library-v2">
      <label className="omni-sources-filter-bar__search">
        <span>Tìm trong nguồn của bạn</span>
        <input
          type="search"
          value={query}
          placeholder="Tên, chủ đề hoặc thẻ"
          aria-label="Tìm trong nguồn của bạn"
          data-ux-control="sources.library.search-input"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label>
        <span>Định dạng</span>
        <select
          value={mediaType}
          aria-label="Lọc theo định dạng nguồn"
          data-ux-control="sources.library.filter-format"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onMediaTypeChange(event.target.value as SourceMediaType | 'all')}
        >
          {MEDIA_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Quyền</span>
        <select
          value={rightsState}
          aria-label="Lọc theo trạng thái quyền"
          data-ux-control="sources.library.filter-rights"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onRightsStateChange(event.target.value as ContentRightsState | 'all')}
        >
          {RIGHTS_STATES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Sắp xếp</span>
        <select
          value={sort}
          aria-label="Sắp xếp nguồn"
          data-ux-control="sources.library.filter-sort"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onSortChange(event.target.value as SourceLibrarySort)}
        >
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Bộ sưu tập</span>
        <select
          value={collectionId}
          aria-label="Lọc theo bộ sưu tập"
          data-ux-control="sources.library.filter-collection"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onCollectionChange(event.target.value)}
        >
          <option value="all">Tất cả bộ sưu tập</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>{collection.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
