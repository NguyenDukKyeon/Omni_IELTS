import { describe, expect, it, vi } from 'vitest';
import { createArtifactJob, executeArtifactJob, validateDraftPayload } from '../sources/artifactJobMachine';
import { AI_TASK_PROFILES } from '../aiTaskProfiles';
import type { SourceProvenance, SourceSpan, SourceVersion } from '../../types/sources';

const provenance: SourceProvenance = {
  originType: 'user_upload',
  retrievalDate: '2026-08-30T00:00:00Z',
  rightsState: 'owned_by_learner',
  rawContentHash: 'hash',
  canonicalCitation: 'Doc 1',
};

const sourceSpan: SourceSpan = { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_001'] };

const version: SourceVersion = {
  id: 'v1',
  sourceId: 's1',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'hash',
  plainText: 'Solar subsidies reduce macroeconomic risk.',
  blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: 'Solar subsidies reduce macroeconomic risk.' }],
  wordCount: 5,
  createdAt: '2026-08-30T00:00:00Z',
};

const validPracticePayload = {
  skill: 'reading' as const,
  targetBand: 7.0,
  activityTitle: 'Reading Exercise on Renewable Energy',
  sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_001'] },
  questionPayload: {
    type: 'true_false_not_given',
    questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
  },
  provenance,
};

describe('Artifact Job Machine', () => {
  it('enforces single-destination contract and rejects multi-destination payloads', () => {
    const job = createArtifactJob({
      id: 'job_art_1',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7.0,
    });

    expect(job.destination).toBe('practice');
    expect(job.state).toBe('queued');
  });

  it('validates Practice draft payload against required question schema', () => {
    const validation = validateDraftPayload('practice', validPracticePayload);
    expect(validation.isValid).toBe(true);
  });

  it('does not emit mastery, XP, or vocabulary side effects from draft creation', () => {
    const job = createArtifactJob({
      id: 'job_art_2',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'vocabulary_deck',
      targetBand: 7.0,
    });
    expect(job).not.toHaveProperty('xpDelta');
    expect(job).not.toHaveProperty('masteryUpdate');
  });
});

describe('Artifact destination validators and execution', () => {
  it('validates each destination payload and requires provenance plus source span support', () => {
    expect(validateDraftPayload('mock_section', {
      sectionType: 'reading_passage',
      targetBand: 7,
      packagePayload: { passage: 'Solar subsidies reduce macroeconomic risk.' },
      provenance,
      sourceSpanRef: sourceSpan,
    }).isValid).toBe(true);

    expect(validateDraftPayload('vocabulary_deck', {
      deckTitle: 'Energy lexis',
      targetBand: 7,
      cards: [{
        word: 'subsidy',
        pos: 'noun',
        contextSentence: 'Solar subsidies reduce macroeconomic risk.',
        definitionVi: 'trợ cấp',
        definitionEn: 'a grant of money',
        phonetic: '/ˈsʌbsɪdi/',
        collocations: ['government subsidy'],
        cefrLevel: 'B2',
        sourceSpan,
      }],
      provenance,
    }).isValid).toBe(true);

    expect(validateDraftPayload('note', {
      title: 'Macro note',
      summaryVi: 'Trợ cấp năng lượng sạch.',
      keyTakeaways: ['Subsidies reduce risk'],
      annotatedCitations: [{ claim: 'Subsidies reduce risk', blockId: 'b_001' }],
      provenance,
      sourceSpanRef: sourceSpan,
    }).isValid).toBe(true);

    expect(validateDraftPayload('idea_bank', {
      topic: 'Energy policy',
      ideas: [{
        perspective: 'fiscal',
        argumentEn: 'Subsidies reduce macroeconomic risk.',
        explanationVi: 'Trợ cấp làm giảm rủi ro.',
        exampleOrData: 'IEA 2024',
        sourceSpan,
      }],
      provenance,
    }).isValid).toBe(true);
  });

  it('marks invalid output as needs_review, rejected, or failed rather than a fake ready draft', async () => {
    expect(validateDraftPayload('practice', { skill: 'reading' }).isValid).toBe(false);

    const webSearch = vi.fn();
    const routerExecute = vi.fn(async () => ({
      value: { skill: 'reading' },
    }));
    const job = await executeArtifactJob(createArtifactJob({
      id: 'job_invalid',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute,
      webSearch,
    });

    expect(['needs_review', 'rejected', 'failed']).toContain(job.state);
    expect(job.state).not.toBe('ready');
    expect(job.artifactDraft?.destination === 'practice' && job.state === 'ready').toBeFalsy();
    expect(job).not.toHaveProperty('xpDelta');
    expect(job).not.toHaveProperty('masteryUpdate');
    expect(job).not.toHaveProperty('score');
    expect(webSearch).not.toHaveBeenCalled();
  });

  it('executes a single destination through the injected router without web search or destination persistence', async () => {
    const webSearch = vi.fn();
    const persistDestination = vi.fn();
    const routerExecute = vi.fn(async () => ({
      value: validPracticePayload,
    }));

    const job = await executeArtifactJob(createArtifactJob({
      id: 'job_ok',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute,
      webSearch,
      persistDestination,
    });

    expect(job.destination).toBe('practice');
    expect(job.state).toBe('ready');
    expect(job.artifactDraft?.destination).toBe('practice');
    expect(webSearch).not.toHaveBeenCalled();
    expect(persistDestination).not.toHaveBeenCalled();
    expect(routerExecute).toHaveBeenCalledWith(expect.objectContaining({
      profile: AI_TASK_PROFILES.balanced,
      tools: [],
    }));
    expect(AI_TASK_PROFILES.grounded.tools).toContain('googleSearch');
  });
});

describe('Artifact job fail-closed validation', () => {
  it('does not produce a job for unknown or multi-destination input', () => {
    expect(() => createArtifactJob({
      id: 'job_multi',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: ['practice', 'note'] as never,
      targetBand: 7,
    })).toThrow();

    expect(() => createArtifactJob({
      id: 'job_unknown',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'flashcards' as never,
      targetBand: 7,
    })).toThrow();
  });

  it('rejects empty or malformed Practice question payloads', () => {
    const emptyQuestions = validateDraftPayload('practice', {
      ...validPracticePayload,
      questionPayload: {},
    });
    const missingQuestions = validateDraftPayload('practice', {
      ...validPracticePayload,
      questionPayload: { type: 'true_false_not_given', questions: [] },
    });
    const missingAnswers = validateDraftPayload('practice', {
      ...validPracticePayload,
      questionPayload: { type: 'true_false_not_given', questions: [{ id: 'q1', statement: 'Subsidies are expensive.' }] },
    });
    expect(emptyQuestions.isValid).toBe(false);
    expect(missingQuestions.isValid).toBe(false);
    expect(missingAnswers.isValid).toBe(false);
  });

  it('rejects Mock, Note, vocabulary, and Idea Bank payloads that omit source references', () => {
    expect(validateDraftPayload('mock_section', {
      sectionType: 'reading_passage',
      targetBand: 7,
      packagePayload: { passage: 'text' },
      provenance,
    }).isValid).toBe(false);

    expect(validateDraftPayload('note', {
      title: 'Macro note',
      summaryVi: 'Trợ cấp.',
      keyTakeaways: ['a'],
      annotatedCitations: [{ claim: 'a', blockId: 'b_001' }],
      provenance,
    }).isValid).toBe(false);

    expect(validateDraftPayload('vocabulary_deck', {
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
      }],
      provenance,
    }, version).isValid).toBe(false);

    expect(validateDraftPayload('idea_bank', {
      topic: 'Energy',
      ideas: [{
        perspective: 'fiscal',
        argumentEn: 'x',
        explanationVi: 'x',
        exampleOrData: 'x',
      }],
      provenance,
    }, version).isValid).toBe(false);
  });

  it('rejects unsupported block IDs against the supplied version', () => {
    const badSpan = { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_missing'] };
    expect(validateDraftPayload('practice', { ...validPracticePayload, sourceSpanRef: badSpan }, version).isValid).toBe(false);
    expect(validateDraftPayload('mock_section', {
      sectionType: 'reading_passage',
      targetBand: 7,
      packagePayload: { passage: 'text' },
      provenance,
      sourceSpanRef: badSpan,
    }, version).isValid).toBe(false);
    expect(validateDraftPayload('note', {
      title: 'Note',
      summaryVi: 'x',
      keyTakeaways: ['a'],
      annotatedCitations: [{ claim: 'a', blockId: 'b_missing' }],
      provenance,
      sourceSpanRef: sourceSpan,
    }, version).isValid).toBe(false);
  });

  it('does not call the router when the job version or selection does not match the supplied version', async () => {
    const routerExecute = vi.fn();
    const mismatchedVersion = await executeArtifactJob(createArtifactJob({
      id: 'job_mismatch_version',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
    }), {
      version: { ...version, id: 'v2' },
      provenance,
      routerExecute,
    });
    expect(routerExecute).not.toHaveBeenCalled();
    expect(['failed', 'needs_review']).toContain(mismatchedVersion.state);
    expect(mismatchedVersion.state).not.toBe('ready');

    const mismatchedSelection = await executeArtifactJob(createArtifactJob({
      id: 'job_mismatch_span',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_missing'] },
    }), {
      version,
      provenance,
      routerExecute,
    });
    expect(routerExecute).not.toHaveBeenCalled();
    expect(['failed', 'needs_review']).toContain(mismatchedSelection.state);
    expect(mismatchedSelection.state).not.toBe('ready');
  });

  it('overwrites model-invented provenance with the input source provenance on ready drafts', async () => {
    const routerExecute = vi.fn(async () => ({
      value: {
        ...validPracticePayload,
        provenance: {
          ...provenance,
          rawContentHash: 'model-forged-hash',
          canonicalCitation: 'Model invented citation',
        },
      },
    }));
    const job = await executeArtifactJob(createArtifactJob({
      id: 'job_prov',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute,
    });
    expect(job.state).toBe('ready');
    expect(job.artifactDraft?.payload).toMatchObject({ provenance });
    expect(JSON.stringify(job.artifactDraft?.payload)).not.toContain('model-forged-hash');
    expect(JSON.stringify(job.artifactDraft?.payload)).not.toContain('Model invented citation');
  });

  it('retains a source-version/span reference on ready Mock and Note drafts', async () => {
    const mockJob = await executeArtifactJob(createArtifactJob({
      id: 'job_mock_ref',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'mock_section',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute: async () => ({
        value: {
          sectionType: 'reading_passage',
          targetBand: 7,
          packagePayload: { passage: 'Solar subsidies reduce macroeconomic risk.' },
          provenance,
          sourceSpanRef: sourceSpan,
        },
      }),
    });
    expect(mockJob.state).toBe('ready');
    expect(mockJob.artifactDraft?.payload).toMatchObject({ sourceSpanRef: sourceSpan, provenance });

    const noteJob = await executeArtifactJob(createArtifactJob({
      id: 'job_note_ref',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'note',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute: async () => ({
        value: {
          title: 'Note',
          summaryVi: 'Tóm tắt',
          keyTakeaways: ['a'],
          annotatedCitations: [{ claim: 'a', blockId: 'b_001' }],
          provenance,
          sourceSpanRef: sourceSpan,
        },
      }),
    });
    expect(noteJob.state).toBe('ready');
    expect(noteJob.artifactDraft?.payload).toMatchObject({ sourceSpanRef: sourceSpan, provenance });
  });

  it('never marks Listening audio, transcripts, scores, mastery, or XP as a ready P03 draft', async () => {
    const persistDestination = vi.fn();
    const listening = await executeArtifactJob(createArtifactJob({
      id: 'job_listening',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      persistDestination,
      routerExecute: async () => ({
        value: {
          skill: 'listening',
          targetBand: 7,
          activityTitle: 'Listening from text source',
          sourceSpanRef: sourceSpan,
          questionPayload: {
            type: 'form_completion',
            questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
            audioUrl: 'https://cdn.example/fake-audio.mp3',
            audioTranscript: 'fabricated transcript',
            score: 8.5,
          },
          provenance,
        },
      }),
    });
    expect(listening.state).not.toBe('ready');
    expect(['needs_review', 'failed']).toContain(listening.state);
    expect(persistDestination).not.toHaveBeenCalled();
    expect(listening).not.toHaveProperty('xpDelta');
    expect(listening).not.toHaveProperty('masteryUpdate');

    const scored = await executeArtifactJob(createArtifactJob({
      id: 'job_score',
      userId: 'u1',
      sourceVersionId: 'v1',
      destination: 'practice',
      targetBand: 7,
      selection: sourceSpan,
    }), {
      version,
      provenance,
      routerExecute: async () => ({
        value: {
          ...validPracticePayload,
          score: 9,
          xp: 50,
          mastery: true,
        },
      }),
    });
    expect(scored.state).not.toBe('ready');
  });
});
