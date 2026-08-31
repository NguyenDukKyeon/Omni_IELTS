import { describe, expect, it } from 'vitest';
import type { ModuleId } from '../../types';
import type {
  PendingArtifactHandoff,
  SourceArtifactJob,
  SourceProvenance,
  SourceVersion,
} from '../../types/sources';
import {
  createPendingArtifactHandoff,
  isValidPendingArtifactHandoff,
} from '../sources/destinationHandoff';
import {
  consumePendingArtifactHandoff,
  routePendingArtifactHandoff,
} from '../sources/artifactNavigation';

const provenance: SourceProvenance = {
  originType: 'user_upload',
  retrievalDate: '2026-08-31T00:00:00.000Z',
  rightsState: 'owned_by_learner',
  rawContentHash: 'sha256:source',
  canonicalCitation: 'Renewable energy brief',
};

const sourceVersion: SourceVersion = {
  id: 'version-1',
  sourceId: 'source-1',
  versionNumber: 1,
  stage: 'normalised',
  contentHash: 'sha256:source',
  plainText: 'Renewable energy reduces long-term economic risk.',
  blocks: [{
    id: 'block-1',
    order: 1,
    type: 'paragraph',
    text: 'Renewable energy reduces long-term economic risk.',
  }],
  wordCount: 7,
  createdAt: '2026-08-31T00:00:00.000Z',
};

const readyJob: SourceArtifactJob = {
  id: 'job-1',
  userId: 'learner-1',
  sourceVersionId: sourceVersion.id,
  destination: 'practice',
  targetBand: 7,
  selection: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['block-1'] },
  state: 'ready',
  artifactDraft: {
    id: 'draft-1',
    destination: 'practice',
    payload: {
      skill: 'reading',
      targetBand: 7,
      activityTitle: 'Renewable energy reading',
      sourceSpanRef: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['block-1'] },
      questionPayload: {
        type: 'true_false_not_given',
        questions: [{ id: 'q-1', statement: 'The source discusses energy.', correctAnswer: 'TRUE' }],
      },
      provenance,
    },
  },
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
};

describe('typed Sources artifact handoff routing', () => {
  it('creates an in-memory pending handoff only from a ready, source-backed draft', () => {
    const pending = createPendingArtifactHandoff(readyJob, sourceVersion);

    expect(pending).toEqual(expect.objectContaining({
      destination: 'practice',
      targetModule: 'practice',
      targetRoute: 'practice',
      draftId: 'draft-1',
      sourceVersion,
      sourceSpan: readyJob.selection,
    }));
    expect(pending?.draft).toBe(readyJob.artifactDraft);
    expect(isValidPendingArtifactHandoff(pending)).toBe(true);
  });

  it('rejects non-ready, foreign-version, and unsupported-span handoffs', () => {
    expect(createPendingArtifactHandoff({ ...readyJob, state: 'processing' }, sourceVersion)).toBeNull();
    expect(createPendingArtifactHandoff({ ...readyJob, sourceVersionId: 'version-other' }, sourceVersion)).toBeNull();
    expect(createPendingArtifactHandoff({
      ...readyJob,
      selection: { sourceId: 'source-1', sourceVersionId: 'version-1', blockIds: ['missing-block'] },
    }, sourceVersion)).toBeNull();
  });

  it('routes only valid handoffs and leaves state untouched for invalid navigation', () => {
    const pending = createPendingArtifactHandoff(readyJob, sourceVersion);
    if (!pending) throw new Error('expected pending handoff');
    const initial = {
      activeModule: 'sources' as ModuleId,
      pendingArtifactHandoff: null,
    };

    const routed = routePendingArtifactHandoff(initial, pending);
    expect(routed.activeModule).toBe('practice');
    expect(routed.pendingArtifactHandoff).toBe(pending);

    const invalid = {
      ...pending,
      job: { ...pending.job, state: 'failed' as const },
    };
    expect(routePendingArtifactHandoff(initial, invalid)).toEqual(initial);
  });

  it('consumes a matching destination once and preserves a mismatch', () => {
    const pending = createPendingArtifactHandoff(readyJob, sourceVersion);
    if (!pending) throw new Error('expected pending handoff');
    const state = routePendingArtifactHandoff({
      activeModule: 'practice',
      pendingArtifactHandoff: pending,
    }, pending);

    const mismatch = consumePendingArtifactHandoff(state, 'vocabulary_deck');
    expect(mismatch.handoff).toBeNull();
    expect(mismatch.state.pendingArtifactHandoff).toBe(pending);

    const consumed = consumePendingArtifactHandoff(state, 'practice');
    expect(consumed.handoff).toBe(pending);
    expect(consumed.state.pendingArtifactHandoff).toBeNull();
  });

  it('does not expose a destination persistence callback or local-storage requirement', () => {
    const source = readyJob.artifactDraft;
    expect(source).toBeDefined();
    const pending = createPendingArtifactHandoff(readyJob, sourceVersion);
    expect(pending?.destination).toBe('practice');
    expect(JSON.stringify(pending)).not.toMatch(/localStorage|persistDestination|destinationEntityId/);
  });

  it('keeps the runtime guard structural and fails closed for malformed handoff data', () => {
    const pending = createPendingArtifactHandoff(readyJob, sourceVersion);
    expect(isValidPendingArtifactHandoff(JSON.parse(JSON.stringify(pending)))).toBe(true);
    expect(isValidPendingArtifactHandoff({ pending: true })).toBe(false);
    expect(isValidPendingArtifactHandoff({
      ...pending,
      sourceVersion: { id: 'version-1', sourceId: 'source-1' },
    })).toBe(false);
  });
});
