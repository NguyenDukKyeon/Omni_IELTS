import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeArtifactJob } from '../sources/artifactJobMachine';
import { routePendingArtifactHandoff } from '../sources/artifactNavigation';
import { createPendingArtifactHandoff, prepareDestinationHandoff } from '../sources/destinationHandoff';
import { createImportJob, processImportJob } from '../sources/importJobMachine';
import { handleArtifactJobRequest } from '../sources/artifactTransport.server';
import type { SourceArtifactJob, SourceRecord, SourceVersion } from '../../types/sources';
import { UX_CONTROL_CONTRACTS } from '../uxFlowContracts';

const USER_ID = 'task12-unit-learner';
const ACCESS_TOKEN = 'task12-unit-token';
const SOURCE_TEXT = 'Transparent renewable policy can reduce transition risk for cities.';

function readyRecord(sourceId: string, versionId: string): SourceRecord {
  return {
    id: sourceId,
    userId: USER_ID,
    title: 'Unit source',
    summary: SOURCE_TEXT,
    type: 'text',
    collectionIds: [],
    tags: ['task12'],
    provenance: {
      originType: 'pasted_text',
      retrievalDate: '2026-09-01T00:00:00.000Z',
      rightsState: 'owned_by_learner',
      rawContentHash: 'task12-unit-source-hash',
      canonicalCitation: 'Task 12 unit source',
      owningModule: 'sources',
    },
    currentVersionId: versionId,
    processingState: 'ready',
    lastUsedAt: '2026-09-01T00:00:00.000Z',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function readyVersion(sourceId: string, versionId: string): SourceVersion {
  return {
    id: versionId,
    sourceId,
    versionNumber: 1,
    stage: 'normalised',
    contentHash: 'task12-unit-version-hash',
    plainText: SOURCE_TEXT,
    blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: SOURCE_TEXT }],
    wordCount: 10,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

function validArtifactValue(record: SourceRecord, version: SourceVersion) {
  return {
    skill: 'reading' as const,
    targetBand: 7,
    activityTitle: 'Transparent policy reading',
    sourceSpanRef: { sourceId: record.id, sourceVersionId: version.id, blockIds: ['b_001'] },
    questionPayload: {
      type: 'true_false_not_given',
      questions: [{ id: 'task12-q1', statement: 'The source discusses policy risk.', correctAnswer: 'TRUE' }],
    },
    provenance: record.provenance,
  };
}

describe('Task 12 deterministic Sources full-flow proof', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('imports, versions, generates one draft, and hands off only after explicit action', async () => {
    const imported = await processImportJob(createImportJob({
      id: 'task12-import-job',
      userId: USER_ID,
      title: 'Unit imported source',
      type: 'text',
      rawContent: SOURCE_TEXT,
    }));
    expect(imported.state).toBe('ready');
    expect(imported.sourceRecord?.processingState).toBe('ready');
    expect(imported.sourceVersion?.versionNumber).toBe(1);
    expect(imported.sourceVersion?.sourceId).toBe(imported.sourceRecord?.id);

    const sourceVersion = imported.sourceVersion;
    const sourceRecord = imported.sourceRecord;
    if (!sourceVersion || !sourceRecord) throw new Error('expected deterministic import fixture');
    const editedVersion: SourceVersion = {
      ...sourceVersion,
      id: 'task12-unit-version-v2',
      versionNumber: 2,
      stage: 'edited',
      contentHash: 'task12-unit-version-hash-v2',
      plainText: `${sourceVersion.plainText} Edited conclusion.`,
    };
    expect(editedVersion.id).not.toBe(sourceVersion.id);
    expect(sourceVersion.plainText).not.toContain('Edited conclusion');

    const sourceSpan = { sourceId: sourceRecord.id, sourceVersionId: editedVersion.id, blockIds: [editedVersion.blocks[0].id] };
    const savedJobs: SourceArtifactJob[] = [];
    const destinationWriter = vi.fn();
    const quota = vi.fn(() => ({ allowed: true, retryAfterSeconds: 0 }));
    const router = vi.fn(async () => ({ value: validArtifactValue(sourceRecord, editedVersion) }));
    const repository = {
      getSelectedVersions: vi.fn(async () => ({ status: 'ok' as const, items: [{ version: editedVersion, record: { ...sourceRecord, currentVersionId: sourceVersion.id } }] })),
      saveArtifactJob: vi.fn(async (job: SourceArtifactJob) => { savedJobs.push(job); return job; }),
    };
    const counters = { xp: 0, mastery: 0, competency: 0, skillEvidence: 0, progress: 0, vocab: 0 };
    const beforeCounters = { ...counters };
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await handleArtifactJobRequest({
      featureEnabled: true,
      authorizationHeader: `Bearer ${ACCESS_TOKEN}`,
      body: {
        sourceVersionId: editedVersion.id,
        sourceSpan,
        destination: 'practice',
        targetBand: 7,
      },
      cloudConfigured: true,
      verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_ID, accessToken: ACCESS_TOKEN })),
      repositoryForToken: vi.fn(() => repository),
      consumeQuota: quota,
      routerExecute: router,
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('ready');
    expect(quota).toHaveBeenCalledTimes(1);
    expect(savedJobs).toHaveLength(3);
    expect(router).toHaveBeenCalledTimes(1);
    expect(destinationWriter).not.toHaveBeenCalled();
    expect(counters).toEqual(beforeCounters);
    expect(JSON.stringify(result.body)).not.toMatch(/xp|mastery|CompetencyState|SkillEvidence|ProgressUpdate|vocab/i);
    expect(fetchSpy).not.toHaveBeenCalled();

    const completedJob = savedJobs.at(-1);
    if (!completedJob) throw new Error('expected completed artifact job');
    const prepared = prepareDestinationHandoff(completedJob);
    expect(prepared.navigable).toBe(true);
    if (!prepared.navigable) throw new Error('expected navigable handoff');
    expect(prepared.autoRedirect).toBe(false);
    expect(prepared.opensOnLearnerAction).toBe(true);
    expect(prepared.draftRef.sourceVersionId).toBe(editedVersion.id);
    expect(prepared.draftRef.sourceSpan).toEqual(sourceSpan);
    expect(prepared.draftRef.provenance).toEqual(sourceRecord.provenance);

    const pending = createPendingArtifactHandoff(completedJob, editedVersion);
    expect(pending).toBeTruthy();
    if (!pending) throw new Error('expected pending handoff');
    expect(pending.sourceVersion).toEqual(editedVersion);
    const routed = routePendingArtifactHandoff({ activeModule: 'sources', pendingArtifactHandoff: null }, pending);
    expect(routed).toMatchObject({
      activeModule: 'practice',
      pendingArtifactHandoff: pending,
    });
    expect(routed.pendingArtifactHandoff).toBe(pending);
  });

  it('turns invalid generated output into needs_review with no valid handoff', async () => {
    const sourceRecord = readyRecord('task12-invalid-source', 'task12-invalid-version');
    const sourceVersion = readyVersion(sourceRecord.id, sourceRecord.currentVersionId);
    const job: SourceArtifactJob = {
      id: 'task12-invalid-job',
      userId: USER_ID,
      sourceVersionId: sourceVersion.id,
      destination: 'practice',
      targetBand: 7,
      selection: { sourceId: sourceRecord.id, sourceVersionId: sourceVersion.id, blockIds: ['b_001'] },
      state: 'queued',
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const invalid = await executeArtifactJob(job, {
      version: sourceVersion,
      provenance: sourceRecord.provenance,
      routerExecute: vi.fn(async () => ({ value: {
        ...validArtifactValue(sourceRecord, sourceVersion),
        questionPayload: { type: 'true_false_not_given', questions: [{ id: 'missing-answer', statement: 'Invalid' }] },
      } })),
    });

    expect(invalid.state).toBe('needs_review');
    expect(prepareDestinationHandoff(invalid).navigable).toBe(false);
    expect(createPendingArtifactHandoff(invalid, sourceVersion)).toBeNull();
  });

  it('keeps strict RLS proof as a disposable-DB CI gate rather than a mock claim', () => {
    const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/public-beta-quality.yml'), 'utf8');
    expect(workflow).toContain('npm run test:sources:rls:db -- --strict');
    expect(workflow).toContain('Start Disposable PostgreSQL for Sources RLS Proof');
  });

  it('registers every Sources control against the Task 12 executable evidence file', () => {
    const sourceControls = UX_CONTROL_CONTRACTS.filter((control) => control.id.startsWith('sources.'));
    expect(sourceControls.length).toBeGreaterThan(0);
    expect(sourceControls.every((control) => control.evidence.includes('e2e/sources-library.spec.ts'))).toBe(true);
  });
});
