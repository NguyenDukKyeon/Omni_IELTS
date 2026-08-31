import type { ModuleId } from '../../types';
import type {
  DestinationType,
  SourceArtifactJob,
  SourceProvenance,
  SourceSpan,
  ValidatedArtifactDraftPayload,
} from '../../types/sources';

export interface DestinationHandoffResult {
  targetModule: ModuleId;
  targetRoute: ModuleId;
  draftId: string;
  draftRef: {
    draftId: string;
    destination: DestinationType;
    provenance?: SourceProvenance;
    sourceSpan?: SourceSpan;
  };
  ctaPrimaryLabelVi: string;
  ctaSecondaryLabelVi: string;
  autoRedirect: false;
  opensOnLearnerAction: true;
}

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
  if ('annotatedCitations' in payload && payload.annotatedCitations[0]) {
    return undefined;
  }
  return undefined;
}

export function prepareDestinationHandoff(
  job: SourceArtifactJob,
  _options?: { persistDestination?: (...args: unknown[]) => unknown },
): DestinationHandoffResult {
  const destination = job.artifactDraft?.destination ?? job.destination;
  const draftId = job.artifactDraft?.id ?? job.id;
  const payload = job.artifactDraft?.payload;
  const targetModule = DESTINATION_MODULE[destination];

  return {
    targetModule,
    targetRoute: targetModule,
    draftId,
    draftRef: {
      draftId,
      destination,
      provenance: provenanceOf(payload),
      sourceSpan: sourceSpanOf(payload),
    },
    ctaPrimaryLabelVi: PRIMARY_CTA_VI[destination],
    ctaSecondaryLabelVi: SECONDARY_CTA_VI,
    autoRedirect: false,
    opensOnLearnerAction: true,
  };
}
