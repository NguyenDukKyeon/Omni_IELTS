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
  { value: 'all', label: 'All formats' },
  { value: 'text', label: 'Text / Markdown' },
  { value: 'url', label: 'Article URL' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'vtt_srt', label: 'VTT / SRT' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'audio', label: 'Audio' },
  { value: 'chart_image', label: 'Chart image' },
];

const RIGHTS_STATES: Array<{ value: ContentRightsState | 'all'; label: string }> = [
  { value: 'all', label: 'All rights states' },
  { value: 'owned_by_learner', label: 'Owned by learner' },
  { value: 'licensed_public', label: 'Licensed public' },
  { value: 'fair_use_academic', label: 'Academic fair use' },
  { value: 'restricted_citation_only', label: 'Citation only' },
  { value: 'rejected_unsupported', label: 'Rights rejected' },
];

const SORT_OPTIONS: Array<{ value: SourceLibrarySort; label: string }> = [
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'type', label: 'Format' },
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
        <span>Search your sources</span>
        <input
          type="search"
          value={query}
          placeholder="Title, topic, or tag"
          aria-label="Search your sources"
          data-ux-control="sources.library.search-input"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <label>
        <span>Format</span>
        <select
          value={mediaType}
          aria-label="Filter by source format"
          data-ux-control="sources.library.filter-format"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onMediaTypeChange(event.target.value as SourceMediaType | 'all')}
        >
          {MEDIA_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Rights</span>
        <select
          value={rightsState}
          aria-label="Filter by rights state"
          data-ux-control="sources.library.filter-rights"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onRightsStateChange(event.target.value as ContentRightsState | 'all')}
        >
          {RIGHTS_STATES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Sort</span>
        <select
          value={sort}
          aria-label="Sort sources"
          data-ux-control="sources.library.filter-sort"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onSortChange(event.target.value as SourceLibrarySort)}
        >
          {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>

      <label>
        <span>Collection</span>
        <select
          value={collectionId}
          aria-label="Filter by collection"
          data-ux-control="sources.library.filter-collection"
          data-ux-flow="sources.library.filter"
          onChange={(event) => onCollectionChange(event.target.value)}
        >
          <option value="all">All collections</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>{collection.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

