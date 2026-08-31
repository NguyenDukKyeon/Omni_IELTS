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

const sourceSpan = { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_001'] };

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
      questionPayload: {
        type: 'true_false_not_given',
        questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
      },
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

    expect(handoff.navigable).toBe(true);
    if (!handoff.navigable) throw new Error('expected navigable handoff');
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
          packagePayload: { passage: 'text' },
          provenance,
          sourceSpanRef: sourceSpan,
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
          cards: [{
            word: 'subsidy',
            pos: 'noun',
            contextSentence: 'x',
            definitionVi: 'x',
            definitionEn: 'x',
            phonetic: 'x',
            collocations: [],
            cefrLevel: 'B2',
            sourceSpan,
          }],
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
          sourceSpanRef: sourceSpan,
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
          ideas: [{
            perspective: 'fiscal',
            argumentEn: 'x',
            explanationVi: 'x',
            exampleOrData: 'x',
            sourceSpan,
          }],
          provenance,
        },
      },
    });

    expect(mockHandoff.navigable).toBe(true);
    expect(vocabHandoff.navigable).toBe(true);
    expect(noteHandoff.navigable).toBe(true);
    expect(ideaHandoff.navigable).toBe(true);
    if (!mockHandoff.navigable || !vocabHandoff.navigable || !noteHandoff.navigable || !ideaHandoff.navigable) {
      throw new Error('expected navigable handoffs');
    }
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

    expect(handoff.navigable).toBe(true);
    if (!handoff.navigable) throw new Error('expected navigable handoff');
    expect(handoff.draftRef.draftId).toBe('draft_01');
    expect(handoff.draftRef.destination).toBe('practice');
    expect(handoff.draftRef.provenance).toEqual(provenance);
    expect(handoff.draftRef.sourceSpan).toEqual({ sourceId: 's1', sourceVersionId: 'v1' });
    expect(handoff.draftRef.sourceVersionId).toBe('v1');
    expect(persistDestination).not.toHaveBeenCalled();
    expect(handoff.opensOnLearnerAction).toBe(true);
  });
});

describe('Handoff gated on genuine ready drafts', () => {
  it('returns a non-navigable result for queued, processing, failed, or missing-draft jobs', () => {
    const persistDestination = vi.fn();
    for (const state of ['queued', 'processing', 'failed', 'needs_review'] as const) {
      const job: SourceArtifactJob = {
        ...practiceJob,
        state,
        artifactDraft: state === 'queued' ? undefined : practiceJob.artifactDraft,
      };
      const handoff = prepareDestinationHandoff(job, { persistDestination });
      if (handoff.navigable !== false) throw new Error('expected non-navigable');
      expect(handoff.targetRoute).toBeUndefined();
      expect(handoff.draftId).toBeUndefined();
      expect(handoff.ctaPrimaryLabelVi).toBeUndefined();
      expect(handoff.autoRedirect).toBe(false);
      expect(handoff.status).toBe('not_ready');
    }
    expect(persistDestination).not.toHaveBeenCalled();
  });

  it('does not navigate when the draft destination does not match the job', () => {
    const handoff = prepareDestinationHandoff({
      ...practiceJob,
      destination: 'practice',
      artifactDraft: {
        ...practiceJob.artifactDraft!,
        destination: 'note',
      },
    });
    expect(handoff.navigable).toBe(false);
    if (handoff.navigable) throw new Error('expected non-navigable');
    expect(handoff.targetRoute).toBeUndefined();
    expect(handoff.draftId).toBeUndefined();
    expect(handoff.ctaPrimaryLabelVi).toBeUndefined();
  });

  it('preserves controlled provenance plus sourceVersionId/selection for all five destinations', () => {
    const destinations = [
      practiceJob,
      {
        ...practiceJob,
        id: 'job_mock',
        destination: 'mock_section' as const,
        selection: sourceSpan,
        artifactDraft: {
          id: 'draft_mock',
          destination: 'mock_section' as const,
          payload: {
            sectionType: 'reading_passage' as const,
            targetBand: 7,
            packagePayload: { passage: 'text' },
            provenance,
            sourceSpanRef: sourceSpan,
          },
        },
      },
      {
        ...practiceJob,
        id: 'job_vocab',
        destination: 'vocabulary_deck' as const,
        selection: sourceSpan,
        artifactDraft: {
          id: 'draft_vocab',
          destination: 'vocabulary_deck' as const,
          payload: {
            deckTitle: 'Energy',
            targetBand: 7,
            cards: [{
              word: 'subsidy',
              pos: 'noun',
              contextSentence: 'x',
              definitionVi: 'x',
              definitionEn: 'x',
              phonetic: 'x',
              collocations: [],
              cefrLevel: 'B2' as const,
              sourceSpan,
            }],
            provenance,
          },
        },
      },
      {
        ...practiceJob,
        id: 'job_note',
        destination: 'note' as const,
        selection: sourceSpan,
        artifactDraft: {
          id: 'draft_note',
          destination: 'note' as const,
          payload: {
            title: 'Note',
            summaryVi: 'Tóm tắt',
            keyTakeaways: ['a'],
            annotatedCitations: [{ claim: 'a', blockId: 'b_001' }],
            provenance,
            sourceSpanRef: sourceSpan,
          },
        },
      },
      {
        ...practiceJob,
        id: 'job_idea',
        destination: 'idea_bank' as const,
        selection: sourceSpan,
        artifactDraft: {
          id: 'draft_idea',
          destination: 'idea_bank' as const,
          payload: {
            topic: 'Energy',
            ideas: [{
              perspective: 'fiscal',
              argumentEn: 'x',
              explanationVi: 'x',
              exampleOrData: 'x',
              sourceSpan,
            }],
            provenance,
          },
        },
      },
    ] satisfies SourceArtifactJob[];

    for (const job of destinations) {
      const handoff = prepareDestinationHandoff(job);
      expect(handoff.navigable).toBe(true);
      if (!handoff.navigable) throw new Error('expected navigable');
      expect(handoff.draftRef.provenance).toEqual(provenance);
      expect(handoff.draftRef.sourceVersionId).toBe('v1');
      expect(handoff.draftRef.sourceSpan || handoff.draftRef.selection).toBeTruthy();
      expect(handoff.autoRedirect).toBe(false);
    }
  });
});

describe('Handoff runtime provenance and span gates', () => {
  it('does not navigate a ready draft that has provenance but no source span', () => {
    const persistDestination = vi.fn();
    const job = {
      ...practiceJob,
      artifactDraft: {
        id: 'draft_01',
        destination: 'practice' as const,
        payload: {
          skill: 'reading' as const,
          targetBand: 7,
          activityTitle: 'Clean Energy Subsidies',
          questionPayload: {
            type: 'true_false_not_given',
            questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
          },
          provenance,
        },
      },
    } as unknown as SourceArtifactJob;

    const handoff = prepareDestinationHandoff(job, { persistDestination });
    expect(handoff.navigable).toBe(false);
    if (handoff.navigable) throw new Error('expected non-navigable');
    expect(handoff.targetRoute).toBeUndefined();
    expect(handoff.draftId).toBeUndefined();
    expect(handoff.ctaPrimaryLabelVi).toBeUndefined();
    expect(handoff.autoRedirect).toBe(false);
    expect(persistDestination).not.toHaveBeenCalled();
  });

  it('does not navigate when the draft span sourceVersionId does not match the job', () => {
    const handoff = prepareDestinationHandoff({
      ...practiceJob,
      sourceVersionId: 'v1',
      artifactDraft: {
        ...practiceJob.artifactDraft!,
        payload: {
          ...practiceJob.artifactDraft!.payload,
          sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v_other', blockIds: ['b_001'] },
        },
      },
    } as SourceArtifactJob);

    expect(handoff.navigable).toBe(false);
    if (handoff.navigable) throw new Error('expected non-navigable');
    expect(handoff.targetRoute).toBeUndefined();
    expect(handoff.draftId).toBeUndefined();
    expect(handoff.ctaPrimaryLabelVi).toBeUndefined();
  });

  it('does not navigate when job.selection exists and the draft span does not match it exactly', () => {
    const persistDestination = vi.fn();
    const mismatched = prepareDestinationHandoff({
      ...practiceJob,
      selection: sourceSpan,
      artifactDraft: {
        ...practiceJob.artifactDraft!,
        payload: {
          ...practiceJob.artifactDraft!.payload,
          sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_other'] },
        },
      },
    } as SourceArtifactJob, { persistDestination });

    const missingBlocks = prepareDestinationHandoff({
      ...practiceJob,
      selection: sourceSpan,
      artifactDraft: {
        ...practiceJob.artifactDraft!,
        payload: {
          ...practiceJob.artifactDraft!.payload,
          sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1' },
        },
      },
    } as SourceArtifactJob);

    expect(mismatched.navigable).toBe(false);
    expect(missingBlocks.navigable).toBe(false);
    if (mismatched.navigable) throw new Error('expected non-navigable');
    expect(mismatched.targetRoute).toBeUndefined();
    expect(mismatched.draftId).toBeUndefined();
    expect(mismatched.ctaPrimaryLabelVi).toBeUndefined();
    expect(persistDestination).not.toHaveBeenCalled();
  });
});
