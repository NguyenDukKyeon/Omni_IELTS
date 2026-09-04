import { FileCheck2, ShieldCheck } from 'lucide-react';
import {
  usePendingArtifactHandoff,
  usePendingArtifactHandoffForDestinations,
} from '../../context/AppContext';
import type { DestinationType, PendingArtifactHandoff } from '../../types/sources';

const DESTINATION_LABELS: Record<DestinationType, string> = {
  practice: 'bài luyện tập',
  mock_section: 'phần thi thử',
  vocabulary_deck: 'bộ từ vựng',
  note: 'ghi chú',
  idea_bank: 'ngân hàng ý',
};

const RIGHTS_LABELS: Record<PendingArtifactHandoff['provenance']['rightsState'], string> = {
  owned_by_learner: 'Nội dung do bạn sở hữu',
  licensed_public: 'Nội dung được cấp phép công khai',
  fair_use_academic: 'Sử dụng học thuật hợp lý',
  restricted_citation_only: 'Chỉ được trích dẫn có giới hạn',
  rejected_unsupported: 'Quyền sử dụng chưa được chấp nhận',
};

function draftTitle(handoff: PendingArtifactHandoff): string {
  const payload = handoff.draft.payload;
  if ('activityTitle' in payload) return payload.activityTitle;
  if ('deckTitle' in payload) return payload.deckTitle;
  if ('title' in payload) return payload.title;
  if ('topic' in payload) return payload.topic;
  return 'Bản nháp từ Sources';
}

function PendingArtifactDraftPanelContent({ handoff }: { handoff: PendingArtifactHandoff }) {
  const { destination } = handoff;
  if (!handoff) return null;

  const blockCount = handoff.sourceSpan?.blockIds?.length;
  return (
    <section
      className="omni-pending-artifact-panel"
      role="status"
      aria-labelledby={`pending-artifact-${destination}-title`}
      data-pending-artifact-destination={destination}
    >
      <div className="omni-pending-artifact-panel__heading">
        <div className="omni-pending-artifact-panel__icon" aria-hidden="true"><FileCheck2 /></div>
        <div>
          <p className="omni-pending-artifact-panel__label">Bản nháp từ Sources</p>
          <h2 id={`pending-artifact-${destination}-title`}>Xem lại trước khi lưu vào {DESTINATION_LABELS[destination]}</h2>
        </div>
      </div>

      <div className="omni-pending-artifact-panel__draft">
        <strong>{draftTitle(handoff)}</strong>
        <span>{handoff.provenance.canonicalCitation}</span>
      </div>

      <dl className="omni-pending-artifact-panel__facts">
        <div><dt>Đích tiếp nhận</dt><dd>{DESTINATION_LABELS[destination]}</dd></div>
        <div><dt>Phiên bản nguồn</dt><dd>{handoff.sourceVersion.versionNumber}</dd></div>
        <div><dt>Phạm vi</dt><dd>{blockCount ? `${blockCount} khối đã chọn` : 'Toàn bộ phiên bản'}</dd></div>
        <div><dt>Quyền</dt><dd><ShieldCheck aria-hidden="true" />{RIGHTS_LABELS[handoff.provenance.rightsState]}</dd></div>
      </dl>

      <p className="omni-pending-artifact-panel__note">
        Bản nháp đang nằm trong phiên làm việc này và chưa được lưu vào dữ liệu của module đích. Hãy kiểm tra nội dung trước khi chủ động tiếp nhận.
      </p>
    </section>
  );
}

export function PendingArtifactDraftPanel({ destination }: { destination: DestinationType }) {
  const handoff = usePendingArtifactHandoff(destination);
  if (!handoff) return null;
  return <PendingArtifactDraftPanelContent handoff={handoff} />;
}

export function PendingSourcesDraftPanel() {
  const handoff = usePendingArtifactHandoffForDestinations(['note', 'idea_bank']);
  if (!handoff) return null;
  return <PendingArtifactDraftPanelContent handoff={handoff} />;
}
