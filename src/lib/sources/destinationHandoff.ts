import type { ModuleId } from '../../types';
import type {
  DestinationType,
  SourceArtifactJob,
  SourceProvenance,
  SourceSpan,
  ValidatedArtifactDraftPayload,
} from '../../types/sources';

type NavigableHandoff = {
  navigable: true;
  targetModule: ModuleId;
  targetRoute: ModuleId;
  draftId: string;
  draftRef: {
    draftId: string;
    destination: DestinationType;
    provenance?: SourceProvenance;
    sourceSpan?: SourceSpan;
    sourceVersionId: string;
    selection?: SourceSpan;
  };
  ctaPrimaryLabelVi: string;
  ctaSecondaryLabelVi: string;
  autoRedirect: false;
  opensOnLearnerAction: true;
};

type NonNavigableHandoff = {
  navigable: false;
  status: 'not_ready';
  code: 'VALIDATION_FAILED';
  userMessageVi: string;
  suggestedActionVi: string;
  autoRedirect: false;
  ctaSecondaryLabelVi: string;
  targetRoute?: undefined;
  draftId?: undefined;
  ctaPrimaryLabelVi?: undefined;
};

export type DestinationHandoffResult = NavigableHandoff | NonNavigableHandoff;

const DESTINATION_MODULE: Record<DestinationType, ModuleId> = {
  practice: 'practice',
  mock_section: 'mock_test',
  vocabulary_deck: 'vocabulary',
  note: 'sources',
  idea_bank: 'sources',
};

const PRIMARY_CTA_VI: Record<DestinationType, string> = {
  practice: 'Mở bài luyện tập',
  mock_section: 'Mở bài thi thử',
  vocabulary_deck: 'Mở bộ từ vựng',
  note: 'Mở ghi chú',
  idea_bank: 'Mở ngân hàng ý',
};

const SECONDARY_CTA_VI = 'Tạo đầu ra khác từ nguồn này';

function provenanceOf(payload: ValidatedArtifactDraftPayload | undefined): SourceProvenance | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  if ('provenance' in payload) return payload.provenance;
  return undefined;
}

function sourceSpanOf(payload: ValidatedArtifactDraftPayload | undefined): SourceSpan | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  if ('sourceSpanRef' in payload) return payload.sourceSpanRef;
  if ('cards' in payload) return payload.cards[0]?.sourceSpan;
  if ('ideas' in payload) return payload.ideas[0]?.sourceSpan;
  return undefined;
}

function nonNavigable(): NonNavigableHandoff {
  return {
    navigable: false,
    status: 'not_ready',
    code: 'VALIDATION_FAILED',
    userMessageVi: 'Bản nháp chưa sẵn sàng để mở trong module đích.',
    suggestedActionVi: 'Chờ bản nháp hoàn tất hoặc tạo lại đầu ra từ nguồn này.',
    autoRedirect: false,
    ctaSecondaryLabelVi: SECONDARY_CTA_VI,
  };
}

function isGenuineReadyDraft(job: SourceArtifactJob): boolean {
  if (job.state !== 'ready') return false;
  const draft = job.artifactDraft;
  if (!draft?.id || draft.destination !== job.destination) return false;
  if (draft.validationErrors && draft.validationErrors.length > 0) return false;
  if (!draft.payload || typeof draft.payload !== 'object') return false;
  return Boolean(provenanceOf(draft.payload));
}

export function prepareDestinationHandoff(
  job: SourceArtifactJob,
  _options?: { persistDestination?: (...args: unknown[]) => unknown },
): DestinationHandoffResult {
  if (!isGenuineReadyDraft(job) || !job.artifactDraft) {
    return nonNavigable();
  }

  const destination = job.artifactDraft.destination;
  const draftId = job.artifactDraft.id;
  const payload = job.artifactDraft.payload;
  const targetModule = DESTINATION_MODULE[destination];

  return {
    navigable: true,
    targetModule,
    targetRoute: targetModule,
    draftId,
    draftRef: {
      draftId,
      destination,
      provenance: provenanceOf(payload),
      sourceSpan: sourceSpanOf(payload) || job.selection,
      sourceVersionId: job.sourceVersionId,
      selection: job.selection,
    },
    ctaPrimaryLabelVi: PRIMARY_CTA_VI[destination],
    ctaSecondaryLabelVi: SECONDARY_CTA_VI,
    autoRedirect: false,
    opensOnLearnerAction: true,
  };
}
