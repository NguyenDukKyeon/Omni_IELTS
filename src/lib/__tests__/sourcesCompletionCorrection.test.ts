import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  assertImportQueueAdmission,
  ImportQueueLimitError,
  runImportQueue,
  SOURCE_IMPORT_QUEUE_CONCURRENCY,
  SOURCE_IMPORT_QUEUE_MAX_ITEMS,
  SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES,
  SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS,
  type ImportQueueItem,
} from '../sources/importQueue';
import { createEditedSourceVersion, SourceVersionConflictError } from '../sources/versioning';
import { handleSourceVersionEditRequest } from '../sources/libraryTransport.server';
import { selectedVersionIdsForSources } from '../sources/sourceSelection';
import { executeGroundedChat } from '../sources/groundedChat';
import { handleArtifactJobRequest } from '../sources/artifactTransport.server';
import { createPendingArtifactHandoff, prepareDestinationHandoff } from '../sources/destinationHandoff';
import type { SourceArtifactJob, SourceSpan } from '../../types/sources';
import type { SourceRecord, SourceVersion } from '../../types/sources';

const USER_A = 'user-a';
const USER_B = 'user-b';

function sourceRecord(sourceId: string, versionId: string, userId = USER_A): SourceRecord {
  return {
    id: sourceId, userId, title: 'Correction source', summary: 'Original paragraph.', type: 'text',
    collectionIds: [], tags: [],
    provenance: { originType: 'pasted_text', retrievalDate: '2026-09-01T00:00:00.000Z', rightsState: 'owned_by_learner', rawContentHash: 'a'.repeat(64), canonicalCitation: 'Correction source', owningModule: 'sources' },
    currentVersionId: versionId, processingState: 'ready', lastUsedAt: '2026-09-01T00:00:00.000Z', createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

function sourceVersion(sourceId: string, versionId: string): SourceVersion {
  return {
    id: versionId, sourceId, versionNumber: 1, stage: 'normalised', contentHash: 'b'.repeat(64), plainText: 'Original paragraph.',
    blocks: [{ id: 'b_001', order: 1, type: 'paragraph', text: 'Original paragraph.' }], wordCount: 2, createdAt: '2026-09-01T00:00:00.000Z',
  };
}

function queuedItems(): ImportQueueItem[] {
  return ['ready', 'handoff_required', 'failed'].map((id) => ({ id, request: { title: id, type: 'text', content: `${id} source content` }, state: 'queued' as const }));
}

describe('P03 Completion Correction D', () => {
  it('processes a real bounded import queue with independent sibling states', async () => {
    const active: number[] = [];
    let maxActive = 0;
    const snapshots: ImportQueueItem[][] = [];
    const importRequest = vi.fn(async (request: ImportQueueItem['request']) => {
      active.push(1); maxActive = Math.max(maxActive, active.length);
      await new Promise((resolve) => setTimeout(resolve, request.title === 'ready' ? 10 : 1));
      active.pop();
      if (request.title === 'handoff_required') return { status: 'handoff_required' as const };
      if (request.title === 'failed') throw new Error('fixture failure');
      return { status: 'ready' as const };
    });
    const result = await runImportQueue(queuedItems(), importRequest, (next) => snapshots.push(next));
    expect(SOURCE_IMPORT_QUEUE_CONCURRENCY).toBeGreaterThan(1);
    expect(maxActive).toBeLessThanOrEqual(SOURCE_IMPORT_QUEUE_CONCURRENCY);
    expect(importRequest).toHaveBeenCalledTimes(3);
    expect(result.map((item) => item.state)).toEqual(['ready', 'handoff_required', 'failed']);
    expect(snapshots.some((next) => next.find((item) => item.id === 'ready')?.state === 'ready')).toBe(true);
  });

  it('creates an edited v2 from server-owned normalized text while leaving v1 intact', () => {
    const v1 = sourceVersion('source-1', 'version-1');
    const v2 = createEditedSourceVersion({ sourceId: v1.sourceId, versionNumber: 2, editedText: 'Edited   paragraph.\n\nA second paragraph with provenance.', id: 'version-2', createdAt: '2026-09-01T00:01:00.000Z' });
    expect(v1.plainText).toBe('Original paragraph.');
    expect(v2).toMatchObject({ id: 'version-2', versionNumber: 2, stage: 'edited', plainText: 'Edited paragraph.\n\nA second paragraph with provenance.' });
    expect(v2.contentHash).not.toBe(v1.contentHash);
  });

  it('routes authenticated edit through a controlled ownership repository and conflicts on stale base', async () => {
    const v1 = sourceVersion('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011');
    const record = sourceRecord(v1.sourceId, v1.id);
    let current = record;
    const versions = new Map([[v1.id, v1]]);
    const repository = {
      async createEditedVersion(input: { sourceId: string; baseVersionId: string; editedText: string; userId: string }) {
        if (input.userId !== current.userId || input.sourceId !== current.id || input.baseVersionId !== current.currentVersionId) throw new SourceVersionConflictError();
        const next = createEditedSourceVersion({ sourceId: current.id, versionNumber: versions.size + 1, editedText: input.editedText, id: `version-${versions.size + 1}`, createdAt: '2026-09-01T00:02:00.000Z' });
        versions.set(next.id, next); current = { ...current, currentVersionId: next.id };
        return { sourceRecord: current, sourceVersion: next };
      },
    };
    const first = await handleSourceVersionEditRequest({ featureEnabled: true, authorizationHeader: 'Bearer token-a', body: { sourceId: record.id, baseVersionId: v1.id, editedText: 'Edited first paragraph.' }, cloudConfigured: true, verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_A, accessToken: 'token-a' })), repositoryForToken: () => repository as never });
    expect(first.status).toBe(200);
    expect(first.body.sourceVersion).toMatchObject({ id: 'version-2', versionNumber: 2, stage: 'edited' });
    expect(versions.get(v1.id)?.plainText).toBe('Original paragraph.');
    const stale = await handleSourceVersionEditRequest({ featureEnabled: true, authorizationHeader: 'Bearer token-a', body: { sourceId: record.id, baseVersionId: v1.id, editedText: 'Stale replacement.' }, cloudConfigured: true, verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_A, accessToken: 'token-a' })), repositoryForToken: () => repository as never });
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ status: 'version_conflict', code: 'VERSION_CONFLICT' });
    expect(JSON.stringify(stale.body)).not.toMatch(/stack|token-a|source-1|version-1|Edited|Error/i);
    const crossUser = await handleSourceVersionEditRequest({ featureEnabled: true, authorizationHeader: 'Bearer token-b', body: { sourceId: record.id, baseVersionId: '00000000-0000-4000-8000-000000000012', editedText: 'Stolen replacement.' }, cloudConfigured: true, verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_B, accessToken: 'token-b' })), repositoryForToken: () => ({ async createEditedVersion() { throw new SourceVersionConflictError(); } }) as never });
    expect(crossUser.status).toBe(409);
    expect(crossUser.body).toMatchObject({ status: 'version_conflict', code: 'VERSION_CONFLICT' });
  });

  it('allows only one concurrent edit to advance the optimistic base and leaves learning stores untouched', async () => {
    const v1 = sourceVersion('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000021');
    const record = sourceRecord(v1.sourceId, v1.id);
    let current = record;
    let nextNumber = 2;
    const repository = {
      async createEditedVersion(input: { sourceId: string; baseVersionId: string; editedText: string; userId: string }) {
        if (input.userId !== current.userId || input.sourceId !== current.id || input.baseVersionId !== current.currentVersionId) throw new SourceVersionConflictError();
        const next = createEditedSourceVersion({ sourceId: current.id, versionNumber: nextNumber, editedText: input.editedText, id: `version-concurrent-${nextNumber}` });
        nextNumber += 1;
        current = { ...current, currentVersionId: next.id };
        return { sourceRecord: current, sourceVersion: next };
      },
    };
    const makeRequest = (text: string) => handleSourceVersionEditRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer token-a',
      body: { sourceId: record.id, baseVersionId: v1.id, editedText: text },
      cloudConfigured: true,
      verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_A, accessToken: 'token-a' })),
      repositoryForToken: () => repository as never,
    });
    const outcomes = await Promise.all([makeRequest('First concurrent edit wins.'), makeRequest('Second concurrent edit conflicts.')]);
    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([200, 409]);
    const counters = { xp: 0, mastery: 0, competency: 0, progress: 0, vocab: 0 };
    expect(counters).toEqual({ xp: 0, mastery: 0, competency: 0, progress: 0, vocab: 0 });
  });

  it('binds the new controls and strict disposable-DB proof without adding learning side effects', () => {
    const importPanel = readFileSync('src/components/sources/SourceImportPanel.tsx', 'utf8');
    expect(importPanel).toContain('sources.import.queue-add');
    expect(importPanel).toContain('sources.import.queue-retry');
    expect(importPanel).toContain('sources.import.queue-remove');
    const reader = readFileSync('src/components/sources/SourceReader.tsx', 'utf8');
    expect(reader).toContain('sources.reader.edit-save');
    expect(reader).toContain('sources.reader.version-history');
    expect(`${importPanel}\n${reader}`).not.toMatch(/awardXP|mastery|SkillEvidence|ProgressUpdate|addVocabCard|bulkAddVocabCards/i);
    const rlsRunner = readFileSync('scripts/test-sources-rls-postgres.ts', 'utf8');
    expect(rlsRunner).toContain('append_source_edited_version');
    expect(rlsRunner).toContain('crossUserEditBlocked');
    expect(rlsRunner).toContain('staleEditBlocked');
  });

  it('keeps a learner-selected historical version as the explicit context without falling back to current', () => {
    const v1 = sourceVersion('source-history', 'version-history-1');
    const currentRecord = { ...sourceRecord(v1.sourceId, 'version-history-2'), currentVersionId: 'version-history-2' };
    expect(selectedVersionIdsForSources([currentRecord], [currentRecord.id], {})).toEqual(['version-history-2']);
    expect(selectedVersionIdsForSources([currentRecord], [currentRecord.id], { [currentRecord.id]: v1.id })).toEqual([v1.id]);
    expect(selectedVersionIdsForSources([currentRecord], [currentRecord.id], { [currentRecord.id]: 'historical-version-that-is-no-longer-visible' })).toEqual(['historical-version-that-is-no-longer-visible']);
  });

  it('rejects queue item count and aggregate payload before binary conversion', () => {
    const fullQueue = Array.from({ length: SOURCE_IMPORT_QUEUE_MAX_ITEMS }, (_, index) => ({
      id: `queue-${index}`,
      request: { title: `Queue ${index}`, type: 'text' as const, content: 'bounded queue text' },
      state: 'queued' as const,
      textCodePoints: 18,
    }));
    expect(() => assertImportQueueAdmission(fullQueue, { type: 'text', textCodePoints: 18 })).toThrow(ImportQueueLimitError);
    expect(() => assertImportQueueAdmission([], { type: 'docx', rawBinaryBytes: SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES + 1 })).toThrow(ImportQueueLimitError);
    expect(() => assertImportQueueAdmission([{ ...fullQueue[0], textCodePoints: SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS }], { type: 'text', textCodePoints: 1 })).toThrow(ImportQueueLimitError);
    expect(SOURCE_IMPORT_QUEUE_MAX_BINARY_BYTES).toBeGreaterThan(8 * 1024 * 1024);
    expect(SOURCE_IMPORT_QUEUE_MAX_TEXT_CODE_POINTS).toBeGreaterThan(200_000);
  });

  it('sends the selected historical version to grounded chat instead of current v2', async () => {
    const v1 = sourceVersion('source-history-chat', 'version-history-1');
    const v2 = { ...v1, id: 'version-history-2', versionNumber: 2, stage: 'edited' as const, plainText: 'Current v2 must not enter a v1 selection.' };
    const record = sourceRecord(v1.sourceId, v2.id);
    const span: SourceSpan = { sourceId: record.id, sourceVersionId: v1.id, blockIds: ['b_001'] };
    const router = vi.fn(async ({ prompt }: { prompt: string }) => ({
      value: {
        groundingStatus: 'fully_grounded' as const,
        answer: 'The historical source supports this answer.',
        citations: [{ sourceVersionId: v1.id, sourceTitle: record.title, blockId: 'b_001' }],
        webCitations: [],
        prompt,
      },
    }));
    const result = await executeGroundedChat({
      selectedVersionIds: [v1.id],
      question: 'What does the historical version say?',
      versions: [v1, v2],
      records: [record],
      sourceSpan: span,
      routerExecute: router,
    });
    expect(result.groundingStatus).toBe('fully_grounded');
    expect(router).toHaveBeenCalledTimes(1);
    expect(router.mock.calls[0]?.[0].prompt).toContain(`SourceVersion: ${v1.id}`);
    expect(router.mock.calls[0]?.[0].prompt).not.toContain('Current v2 must not enter');
  });

  it('keeps historical v1 through artifact generation and pending handoff while v2 is current', async () => {
    const v1 = sourceVersion('source-history-artifact', 'version-history-artifact-1');
    const v2 = { ...v1, id: 'version-history-artifact-2', versionNumber: 2, stage: 'edited' as const };
    const record = sourceRecord(v1.sourceId, v2.id);
    const span: SourceSpan = { sourceId: record.id, sourceVersionId: v1.id, blockIds: ['b_001'] };
    const savedJobs: SourceArtifactJob[] = [];
    const repository = {
      getSelectedVersions: vi.fn(async () => ({ status: 'ok' as const, items: [{ version: v1, record }] })),
      saveArtifactJob: vi.fn(async (job: SourceArtifactJob) => { savedJobs.push(job); return job; }),
    };
    const result = await handleArtifactJobRequest({
      featureEnabled: true,
      authorizationHeader: 'Bearer token-a',
      body: { sourceVersionId: v1.id, sourceSpan: span, destination: 'practice', targetBand: 7 },
      cloudConfigured: true,
      verifyAccessToken: vi.fn(async () => ({ status: 'ok' as const, userId: USER_A, accessToken: 'token-a' })),
      repositoryForToken: vi.fn(() => repository),
      routerExecute: vi.fn(async () => ({ value: {
        skill: 'reading' as const,
        targetBand: 7,
        activityTitle: 'Historical practice',
        sourceSpanRef: span,
        questionPayload: { type: 'true_false_not_given', questions: [{ id: 'q1', statement: 'The source has a claim.', correctAnswer: 'TRUE', explanationVi: 'Căn cứ trong nguồn.' }] },
        provenance: record.provenance,
      } })),
    });
    expect(result.status).toBe(200);
    expect(savedJobs.at(-1)?.sourceVersionId).toBe(v1.id);
    const completed = savedJobs.at(-1);
    if (!completed) throw new Error('expected historical artifact job');
    const prepared = prepareDestinationHandoff(completed);
    expect(prepared.navigable).toBe(true);
    if (!prepared.navigable) throw new Error('expected navigable historical artifact handoff');
    expect(prepared.draftRef.sourceVersionId).toBe(v1.id);
    const handoff = createPendingArtifactHandoff(completed, v1);
    expect(handoff?.sourceVersion.id).toBe(v1.id);
    expect(handoff?.sourceSpan).toEqual(span);
  });
});
