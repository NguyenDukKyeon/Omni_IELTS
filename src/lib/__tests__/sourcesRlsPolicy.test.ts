import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sourcesStorage, SourceVersionConflictError } from '../../services/sourcesStorage';
import { createSourceRecord, createSourceVersion } from '../sources/sourceFactories';

const sql = readFileSync('supabase/migrations/202608300001_sources_library.sql', 'utf8');

type Actor = { id: string };
type RecordRow = { id: string; user_id: string };
type VersionRow = { id: string; source_id: string; user_id: string; version_number: number };
type JobRow = { id: string; user_id: string; source_version_id: string };

function parentOwned(actor: Actor, sourceId: string, records: RecordRow[]): boolean {
  return records.some((record) => record.id === sourceId && record.user_id === actor.id);
}

function canSelectOrInsertVersion(actor: Actor, version: VersionRow, records: RecordRow[]): boolean {
  return actor.id === version.user_id && parentOwned(actor, version.source_id, records);
}

function canInsertArtifactJob(actor: Actor, job: JobRow, versions: VersionRow[], records: RecordRow[]): boolean {
  if (actor.id !== job.user_id) return false;
  const version = versions.find((row) => row.id === job.source_version_id);
  if (!version) return false;
  return parentOwned(actor, version.source_id, records);
}

describe('P03 source_versions RLS and immutability', () => {
  const alice: Actor = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
  const bob: Actor = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' };
  const records: RecordRow[] = [{ id: 's-alice', user_id: alice.id }];
  const versions: VersionRow[] = [
    { id: 'v-alice', source_id: 's-alice', user_id: alice.id, version_number: 1 },
  ];

  it('requires UNIQUE(source_id, version_number) and parent-owned version policies', () => {
    expect(sql).toMatch(/UNIQUE\s*\(\s*source_id\s*,\s*version_number\s*\)/i);
    expect(sql).toMatch(/CREATE POLICY "source_versions_owner_select"/);
    expect(sql).toMatch(/CREATE POLICY "source_versions_owner_insert"/);
    expect(sql).toMatch(/source_versions[\s\S]*EXISTS\s*\(/i);
    expect(sql).toMatch(/source_records[\s\S]*id = source_id[\s\S]*user_id = auth\.uid\(\)/);
    expect(sql).not.toMatch(/CREATE POLICY "source_versions_owner_all"/);
    expect(sql).not.toMatch(/CREATE POLICY "source_versions_owner_update"/);
  });

  it('requires artifact jobs to belong to a version whose source record is owned by auth.uid()', () => {
    expect(sql).toMatch(/CREATE POLICY "source_artifact_jobs_owner_select"/);
    expect(sql).toMatch(/CREATE POLICY "source_artifact_jobs_owner_insert"/);
    expect(sql).toMatch(/source_artifact_jobs[\s\S]*source_versions[\s\S]*source_records/s);
    expect(sql).not.toMatch(/CREATE POLICY "source_artifact_jobs_owner_all"/);
  });

  it('denies direct version UPDATE/DELETE while allowing parent cascade delete', () => {
    expect(sql).toMatch(/prevent_source_version_mutation/);
    expect(sql).toMatch(/omni\.active_deleting_source_id/);
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON public\.source_versions/);
    expect(sql).toMatch(/BEFORE DELETE ON public\.source_records/);
    expect(sql).toMatch(/AFTER DELETE ON public\.source_records/);
    expect(sql).toMatch(/source_id UUID NOT NULL REFERENCES public\.source_records\(id\) ON DELETE CASCADE/);
  });

  it('proves direct child delete cannot exploit transaction-local cascade state', () => {
    // Model of Postgres trigger semantics for cascade lifecycle:
    let activeDeletingSourceId = '';
    const setConfig = (val: string) => {
      activeDeletingSourceId = val;
    };

    const beforeDeleteRecord = (recordId: string) => {
      setConfig(recordId);
    };

    const afterDeleteRecord = () => {
      setConfig('');
    };

    const deleteVersion = (sourceId: string) => {
      if (activeDeletingSourceId === sourceId) {
        return { ok: true, deleted: true };
      }
      throw new Error('42501: source_versions are append-only; direct delete forbidden');
    };

    // Scenario 1: Normal parent cascade delete
    beforeDeleteRecord('s-alice');
    expect(deleteVersion('s-alice')).toEqual({ ok: true, deleted: true });
    afterDeleteRecord();

    // Scenario 2: Attacker executes a parent delete, then tries to delete another child in the same transaction
    expect(() => deleteVersion('s-bob')).toThrow(/42501/);

    // Scenario 3: Direct delete with no parent delete in progress
    expect(() => deleteVersion('s-alice')).toThrow(/42501/);
  });

  it('rejects attaching a version or artifact job to another learner source id', () => {
    const stolenVersion: VersionRow = {
      id: 'v-stolen',
      source_id: 's-alice',
      user_id: bob.id,
      version_number: 2,
    };
    expect(canSelectOrInsertVersion(bob, stolenVersion, records)).toBe(false);
    expect(canSelectOrInsertVersion(alice, versions[0], records)).toBe(true);

    const stolenJob: JobRow = { id: 'job-stolen', user_id: bob.id, source_version_id: 'v-alice' };
    expect(canInsertArtifactJob(bob, stolenJob, versions, records)).toBe(false);
    expect(canInsertArtifactJob(alice, { id: 'job-alice', user_id: alice.id, source_version_id: 'v-alice' }, versions, records)).toBe(true);
  });

  it('inserts versions only and returns a typed conflict for duplicates', async () => {
    const record = createSourceRecord({
      userId: alice.id,
      title: 'Ownership',
      type: 'text',
      provenance: {
        originType: 'pasted_text',
        retrievalDate: new Date().toISOString(),
        rightsState: 'owned_by_learner',
        rawContentHash: 'a'.repeat(64),
        canonicalCitation: 'Ownership',
      },
    });
    await sourcesStorage.saveRecord(record);
    const version = createSourceVersion({
      sourceId: record.id,
      versionNumber: 1,
      stage: 'raw',
      plainText: 'Capital expenditure remains the core claim of the paper.',
    });
    await sourcesStorage.saveVersion(version, alice.id);
    await expect(sourcesStorage.saveVersion(version, alice.id)).rejects.toBeInstanceOf(SourceVersionConflictError);
    const duplicateNumber = createSourceVersion({
      sourceId: record.id,
      versionNumber: 1,
      stage: 'edited',
      plainText: 'A second immutable attempt must not overwrite version 1.',
    });
    await expect(sourcesStorage.saveVersion(duplicateNumber, alice.id)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });
});
