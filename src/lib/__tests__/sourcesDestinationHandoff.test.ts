import { describe, expect, it, vi } from 'vitest';
import { prepareDestinationHandoff } from '../sources/destinationHandoff';
import { SourceArtifactJob } from '../../types/sources';

const provenance = {
  originType: 'user_upload' as const,
  retrievalDate: '2026-08-30T00:00:00Z',
  rightsState: 'owned_by_learner' as const,
  rawContentHash: 'hash',
  canonicalCitation: 'Doc 1',
};

const practiceJob: SourceArtifactJob = {
  id: 'job_01',
  userId: 'u1',
  sourceVersionId: 'v1',
  destination: 'practice',
  targetBand: 7.0,
  state: 'ready',
  artifactDraft: {
    id: 'draft_01',
    destination: 'practice',
    payload: {
      skill: 'reading',
      targetBand: 7.0,
      activityTitle: 'Clean Energy Subsidies',
      sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1' },
      questionPayload: {},
      provenance,
    },
  },
  createdAt: '2026-08-30T00:00:00Z',
  updatedAt: '2026-08-30T00:00:00Z',
};

describe('Destination Handoff Adapters', () => {
  it('prepares view-state navigation and handoff token for Practice module', () => {
    const persistDestination = vi.fn();
    const handoff = prepareDestinationHandoff(practiceJob, { persistDestination });

    expect(handoff.targetModule).toBe('practice');
    expect(handoff.targetRoute).toBe('practice');
    expect(handoff.draftId).toBe('draft_01');
    expect(handoff.ctaPrimaryLabelVi).toBe('Mở bài luyện tập');
    expect(handoff.ctaSecondaryLabelVi).toBe('Tạo đầu ra khác từ nguồn này');
    expect(handoff.autoRedirect).toBe(false);
    expect(persistDestination).not.toHaveBeenCalled();
    expect(handoff.targetRoute.startsWith('/')).toBe(false);
  });

  it('maps remaining destinations onto existing modules without inventing URL routes', () => {
    const mockJob: SourceArtifactJob = {
      ...practiceJob,
      id: 'job_mock',
      destination: 'mock_section',
      artifactDraft: {
        id: 'draft_mock',
        destination: 'mock_section',
        payload: {
          sectionType: 'reading_passage',
          targetBand: 7,
          packagePayload: {},
          provenance,
        },
      },
    };
    const vocabJob: SourceArtifactJob = {
      ...practiceJob,
      id: 'job_vocab',
      destination: 'vocabulary_deck',
      artifactDraft: {
        id: 'draft_vocab',
        destination: 'vocabulary_deck',
        payload: {
          deckTitle: 'Energy',
          targetBand: 7,
          cards: [],
          provenance,
        },
      },
    };
    const noteJob: SourceArtifactJob = {
      ...practiceJob,
      id: 'job_note',
      destination: 'note',
      artifactDraft: {
        id: 'draft_note',
        destination: 'note',
        payload: {
          title: 'Note',
          summaryVi: 'Tóm tắt',
          keyTakeaways: ['a'],
          annotatedCitations: [{ claim: 'a', blockId: 'b_001' }],
          provenance,
        },
      },
    };

    const mockHandoff = prepareDestinationHandoff(mockJob);
    const vocabHandoff = prepareDestinationHandoff(vocabJob);
    const noteHandoff = prepareDestinationHandoff(noteJob);
    const ideaHandoff = prepareDestinationHandoff({
      ...noteJob,
      destination: 'idea_bank',
      artifactDraft: {
        id: 'draft_idea',
        destination: 'idea_bank',
        payload: {
          topic: 'Energy',
          ideas: [],
          provenance,
        },
      },
    });

    expect(mockHandoff.targetModule).toBe('mock_test');
    expect(mockHandoff.targetRoute).toBe('mock_test');
    expect(mockHandoff.ctaPrimaryLabelVi).toBe('Mở bài thi thử');
    expect(vocabHandoff.targetModule).toBe('vocabulary');
    expect(vocabHandoff.targetRoute).toBe('vocabulary');
    expect(vocabHandoff.ctaPrimaryLabelVi).toBe('Mở bộ từ vựng');
    expect(noteHandoff.targetModule).toBe('sources');
    expect(noteHandoff.targetRoute).toBe('sources');
    expect(noteHandoff.ctaPrimaryLabelVi).toBe('Mở ghi chú');
    expect(ideaHandoff.targetModule).toBe('sources');
    expect(ideaHandoff.ctaPrimaryLabelVi).toBe('Mở ngân hàng ý');
    expect(mockHandoff.autoRedirect).toBe(false);
    expect(vocabHandoff.ctaSecondaryLabelVi).toBe('Tạo đầu ra khác từ nguồn này');
  });

  it('preserves draft provenance and source-span reference without writing destination rows', () => {
    const persistDestination = vi.fn();
    const handoff = prepareDestinationHandoff(practiceJob, { persistDestination });

    expect(handoff.draftRef.draftId).toBe('draft_01');
    expect(handoff.draftRef.destination).toBe('practice');
    expect(handoff.draftRef.provenance).toEqual(provenance);
    expect(handoff.draftRef.sourceSpan).toEqual({ sourceId: 's1', sourceVersionId: 'v1' });
    expect(persistDestination).not.toHaveBeenCalled();
    expect(handoff.opensOnLearnerAction).toBe(true);
  });
});
