import {
  AudioLines,
  ArrowUpRight,
  BookOpen,
  Captions,
  FileText,
  Image,
  Link2,
  PlaySquare,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { SourceMediaType, SourceRecord, SourceProcessingState } from '../../types/sources';

type IconProps = { className?: string; 'aria-hidden'?: boolean };

const TYPE_META: Record<SourceMediaType, { label: string; icon: ComponentType<IconProps> }> = {
  text: { label: 'Văn bản / Markdown', icon: FileText },
  pdf: { label: 'PDF', icon: FileText },
  docx: { label: 'DOCX', icon: FileText },
  url: { label: 'URL bài viết', icon: Link2 },
  youtube: { label: 'YouTube', icon: PlaySquare },
  audio: { label: 'Âm thanh', icon: AudioLines },
  vtt_srt: { label: 'VTT / SRT', icon: Captions },
  chart_image: { label: 'Ảnh biểu đồ', icon: Image },
};

const RIGHTS_LABELS = {
  owned_by_learner: 'Bạn sở hữu',
  licensed_public: 'Được cấp phép công khai',
  fair_use_academic: 'Sử dụng học thuật hợp lý',
  restricted_citation_only: 'Chỉ trích dẫn',
  rejected_unsupported: 'Quyền sử dụng bị từ chối',
} as const;

const PROCESSING_LABELS: Record<SourceProcessingState, string> = {
  queued: 'Đang chờ',
  processing: 'Đang xử lý',
  ready: 'Sẵn sàng',
  degraded: 'Dữ liệu rút gọn',
  failed: 'Xử lý lỗi',
  rejected: 'Bị từ chối',
  unavailable: 'Không khả dụng',
  handoff_required: 'Do module khác tiếp nhận',
};

export function sourceControlId(base: string, sourceId: string): string {
  return `${base}:${sourceId}`;
}

function handoffOwner(source: SourceRecord): string | undefined {
  if (source.provenance.owningModule === 'media') return 'Media Lab (P04)';
  if (source.provenance.owningModule === 'mock') return 'Academic Mock (P07)';
  return undefined;
}

export interface SourceCardProps {
  source: SourceRecord;
  selected: boolean;
  onToggleSelection: (source: SourceRecord) => void;
  onOpen?: (source: SourceRecord) => void;
  onCreateArtifact?: (source: SourceRecord) => void;
}

export function SourceCard({
  source,
  selected,
  onToggleSelection,
  onOpen,
  onCreateArtifact,
}: SourceCardProps) {
  const typeMeta = TYPE_META[source.type];
  const TypeIcon = typeMeta.icon;
  const owner = handoffOwner(source);
  const isReady = source.processingState === 'ready' && Boolean(source.currentVersionId);

  return (
    <article className={`omni-source-card${selected ? ' is-selected' : ''}`} data-source-id={source.id}>
      <div className="omni-source-card__topline">
        <span className="omni-source-card__type">
          <TypeIcon aria-hidden="true" className="omni-source-card__type-icon" />
          {typeMeta.label}
        </span>
        <span className={`omni-source-card__state omni-source-card__state--${source.processingState}`}>
          {PROCESSING_LABELS[source.processingState]}
        </span>
      </div>

      <div className="omni-source-card__heading">
        <h3>{source.title}</h3>
        <button
          type="button"
          className="omni-source-card__select"
          aria-pressed={selected}
          aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${source.title}`}
          data-ux-control={sourceControlId('sources.library.select-toggle', source.id)}
          data-ux-flow="sources.selection.toggle"
          onClick={() => onToggleSelection(source)}
        >
          <span aria-hidden="true" className="omni-source-card__select-mark" />
          <span>{selected ? 'Đã chọn' : 'Chọn'}</span>
        </button>
      </div>

      {source.summary ? <p className="omni-source-card__summary">{source.summary}</p> : null}

      <dl className="omni-source-card__details">
        <div>
          <dt>Quyền</dt>
          <dd>{RIGHTS_LABELS[source.provenance.rightsState]}</dd>
        </div>
        <div>
          <dt>Nguồn gốc</dt>
          <dd>{source.provenance.originalFilename || source.provenance.canonicalCitation}</dd>
        </div>
      </dl>

      {owner ? (
        <p className="omni-source-card__handoff" role="status">
          <BookOpen aria-hidden="true" />
          <span>{owner} phụ trách phát hoặc hiển thị nguồn này.</span>
        </p>
      ) : null}
      {source.provenance.handoffReasonVi ? (
        <p className="omni-source-card__handoff-reason">{source.provenance.handoffReasonVi}</p>
      ) : null}

      {(onOpen && isReady) || (onCreateArtifact && isReady) ? (
        <div className="omni-source-card__actions">
          {onOpen && isReady ? (
            <button
              type="button"
              className="omni-source-card__action omni-source-card__action--secondary"
              data-ux-control={sourceControlId('sources.library.open-source', source.id)}
              data-ux-flow="sources.selection.toggle"
              onClick={() => onOpen(source)}
            >
              Đọc nguồn
            </button>
          ) : null}
          {onCreateArtifact && isReady ? (
            <button
              type="button"
              className="omni-source-card__action omni-source-card__action--primary"
              data-ux-control={sourceControlId('sources.artifact.open-modal', source.id)}
              data-ux-flow="sources.artifact.open-modal"
              onClick={() => onCreateArtifact(source)}
            >
              <ArrowUpRight aria-hidden="true" />
              Tạo bản nháp
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export { RIGHTS_LABELS, PROCESSING_LABELS, TYPE_META };
