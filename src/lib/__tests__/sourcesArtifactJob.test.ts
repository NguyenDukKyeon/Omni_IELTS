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
    const validPayload = {
      skill: 'reading',
      targetBand: 7.0,
      activityTitle: 'Reading Exercise on Renewable Energy',
      sourceSpanRef: { sourceId: 's1', sourceVersionId: 'v1', blockIds: ['b_001'] },
      questionPayload: {
        type: 'true_false_not_given',
        questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
      },
      provenance: {
        originType: 'user_upload',
        retrievalDate: '2026-08-30T00:00:00Z',
        rightsState: 'owned_by_learner',
        rawContentHash: 'hash',
        canonicalCitation: 'Doc 1',
      },
    };

    const validation = validateDraftPayload('practice', validPayload);
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
      value: {
        skill: 'reading',
        targetBand: 7,
        activityTitle: 'Reading Exercise on Renewable Energy',
        sourceSpanRef: sourceSpan,
        questionPayload: {
          type: 'true_false_not_given',
          questions: [{ id: 'q1', statement: 'Subsidies are expensive.', correctAnswer: 'TRUE' }],
        },
        provenance,
      },
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
