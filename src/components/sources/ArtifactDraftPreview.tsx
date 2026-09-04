import { ArrowUpRight, RotateCcw, ShieldCheck } from 'lucide-react';
import type { DestinationHandoffResult } from '../../lib/sources/destinationHandoff';
import type { SourceArtifactJob } from '../../types/sources';

const DESTINATION_LABELS: Record<SourceArtifactJob['destination'], string> = {
  practice: 'Bài luyện tập',
  mock_section: 'Phần thi thử',
  vocabulary_deck: 'Bộ từ vựng',
  note: 'Ghi chú',
  idea_bank: 'Ngân hàng ý',
};

export interface ArtifactDraftPreviewProps {
  job?: SourceArtifactJob;
  handoff?: DestinationHandoffResult;
  onOpen?: () => void;
  onCreateAnother?: () => void;
}

function draftTitle(job: SourceArtifactJob): string {
  const payload = job.artifactDraft?.payload;
  if (!payload || typeof payload !== 'object') return 'Bản nháp đã kiểm tra';
  if ('activityTitle' in payload && typeof payload.activityTitle === 'string') return payload.activityTitle;
  if ('deckTitle' in payload && typeof payload.deckTitle === 'string') return payload.deckTitle;
  if ('title' in payload && typeof payload.title === 'string') return payload.title;
  if ('topic' in payload && typeof payload.topic === 'string') return payload.topic;
  return 'Bản nháp đã kiểm tra';
}

export function ArtifactDraftPreview({
  job,
  handoff,
  onOpen,
  onCreateAnother,
}: ArtifactDraftPreviewProps) {
  const isNavigable = Boolean(handoff?.navigable);
  const destination = job?.destination || (handoff?.navigable ? handoff.draftRef.destination : undefined);

  if (!isNavigable || !handoff?.navigable) {
    return (
      <div className="omni-artifact-preview omni-artifact-preview--not-ready" role="status">
        <strong>Bản nháp cần được xem lại</strong>
        <p>{job?.artifactDraft?.validationErrors?.join(', ') || 'Máy chủ chưa trả về bản nháp đã kiểm tra để mở.'}</p>
      </div>
    );
  }

  return (
    <div className="omni-artifact-preview" data-artifact-job-id={job?.id}>
      <div className="omni-artifact-preview__status">
        <ShieldCheck aria-hidden="true" />
        <span>Bản nháp đã sẵn sàng</span>
      </div>
      <p className="omni-artifact-preview__destination">{destination ? DESTINATION_LABELS[destination] : 'Bản nháp đích'}</p>
      <h3>{job ? draftTitle(job) : 'Bản nháp đã kiểm tra'}</h3>
      <p className="omni-artifact-preview__note">Module đích sẽ lưu bản nháp sau thao tác mở của bạn.</p>
      <div className="omni-artifact-preview__actions">
        {onOpen ? (
          <button
            type="button"
            className="omni-artifact-preview__open"
            data-ux-control="sources.artifact.open"
            data-ux-flow="sources.artifact.open"
            onClick={onOpen}
          >
            <ArrowUpRight aria-hidden="true" />
            Mở bản nháp
          </button>
        ) : null}
        {onCreateAnother ? (
          <button
            type="button"
            className="omni-artifact-preview__another"
            data-ux-control="sources.artifact.create-another"
            data-ux-flow="sources.artifact.create-another"
            onClick={onCreateAnother}
          >
            <RotateCcw aria-hidden="true" />
            Tạo bản nháp khác
          </button>
        ) : null}
      </div>
    </div>
  );
}
