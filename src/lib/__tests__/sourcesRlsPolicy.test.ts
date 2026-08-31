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
    expect(sql).toMatch(/CREATE POLICY "source_versions_owner_update"/);
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

describe('Disposable DB RLS runner safety and contracts', () => {
  it('accepts only literal 127.0.0.1 and ::1 targeting omni_sources_rls_test', async () => {
    const { assertLocalDatabaseUrl } = await import('../../../scripts/test-sources-rls-postgres');
    const localIpv4 = assertLocalDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:54322/omni_sources_rls_test');
    expect(localIpv4.host).toBe('127.0.0.1');
    expect(localIpv4.port).toBe(54322);
    expect(localIpv4.database).toBe('omni_sources_rls_test');

    const localIpv6 = assertLocalDatabaseUrl('postgres://postgres:pass@[::1]:54322/omni_sources_rls_test');
    expect(localIpv6.host).toBe('::1');
    expect(localIpv6.port).toBe(54322);
    expect(localIpv6.database).toBe('omni_sources_rls_test');
  });

  it('rejects localhost and every hostname, including loopback aliases', async () => {
    const { assertLocalDatabaseUrl } = await import('../../../scripts/test-sources-rls-postgres');
    const rejectedHosts = [
      'postgres://postgres:pass@localhost:54322/omni_sources_rls_test',
      'postgres://postgres:pass@LOCALHOST:54322/omni_sources_rls_test',
      'postgres://postgres:pass@localhost.:54322/omni_sources_rls_test',
      'postgres://postgres:pass@ip6-localhost:54322/omni_sources_rls_test',
      'postgres://postgres:pass@ip6-loopback:54322/omni_sources_rls_test',
      'postgres://postgres:pass@loopback:54322/omni_sources_rls_test',
      'postgres://postgres:pass@host.docker.internal:54322/omni_sources_rls_test',
    ];
    for (const url of rejectedHosts) {
      expect(() => assertLocalDatabaseUrl(url)).toThrow(/SECURITY_VIOLATION/);
    }
  });

  it('strictly rejects non-local, 0.0.0.0, Supabase, or remote database URLs before any connection', async () => {
    const { assertLocalDatabaseUrl } = await import('../../../scripts/test-sources-rls-postgres');
    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@0.0.0.0:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@db.supabase.co:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@aws.rds.amazonaws.com:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('https://abcdef.supabase.co'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@10.0.0.5:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@192.168.1.50:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@172.16.0.2:54322/omni_sources_rls_test'))
      .toThrow(/SECURITY_VIOLATION/);
  });

  it('strictly rejects any database name other than omni_sources_rls_test', async () => {
    const { assertLocalDatabaseUrl } = await import('../../../scripts/test-sources-rls-postgres');
    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@127.0.0.1:54322/postgres'))
      .toThrow(/omni_sources_rls_test/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@127.0.0.1:54322/production_db'))
      .toThrow(/omni_sources_rls_test/);

    expect(() => assertLocalDatabaseUrl('postgres://postgres:pass@127.0.0.1:54322/'))
      .toThrow(/omni_sources_rls_test/);
  });

  it('never returns raw URLs, component passwords, query tokens, usernames, or malformed input', async () => {
    const { sanitizeUrlForDisplay, REDACTED_DISPOSABLE_DB_URL } = await import('../../../scripts/test-sources-rls-postgres');
    const cases = [
      'postgres://postgres:component_secret@127.0.0.1:54322/omni_sources_rls_test?sslkey=query_secret',
      'postgres://postgres:component_secret@127.0.0.1:54322/omni_sources_rls_test',
      'not-a-url?token=query_secret',
      'postgres://user:password@127.0.0.1:54322/omni_sources_rls_test?token=query_secret',
    ];
    for (const input of cases) {
      const scrubbed = sanitizeUrlForDisplay(input);
      expect(scrubbed).toBe(REDACTED_DISPOSABLE_DB_URL);
      expect(scrubbed).toBe('[redacted disposable database URL]');
      expect(scrubbed).not.toContain('component_secret');
      expect(scrubbed).not.toContain('query_secret');
      expect(scrubbed).not.toContain('token=');
      expect(scrubbed).not.toContain('sslkey');
      expect(scrubbed).not.toContain('postgres://');
      expect(scrubbed).not.toContain(input);
    }
  });

  it('enforces disposable marker presence outside public schema', async () => {
    const { assertDisposableMarker } = await import('../../../scripts/test-sources-rls-postgres');

    const mockPassingClient = {
      query: async () => ({ rows: [{ disposable: true }] }),
    } as any;
    await expect(assertDisposableMarker(mockPassingClient)).resolves.toBeUndefined();

    const mockFailingClient = {
      query: async () => ({ rows: [] }),
    } as any;
    await expect(assertDisposableMarker(mockFailingClient)).rejects.toThrow(/SECURITY_VIOLATION/);

    const mockErrorClient = {
      query: async () => { throw new Error('relation "omni_test.disposable_marker" does not exist'); },
    } as any;
    await expect(assertDisposableMarker(mockErrorClient)).rejects.toThrow(/SECURITY_VIOLATION/);
  });

  it('does not leak invalid marker underlying errors or credentials', async () => {
    const { assertDisposableMarker } = await import('../../../scripts/test-sources-rls-postgres');
    const mockErrorClient = {
      query: async () => {
        throw new Error('password authentication failed for user "postgres" sslkey=query_secret token=query_secret');
      },
    } as any;
    await expect(assertDisposableMarker(mockErrorClient)).rejects.toThrow(/SECURITY_VIOLATION/);
    await expect(assertDisposableMarker(mockErrorClient)).rejects.toThrow(/omni_test.disposable_marker/);
    try {
      await assertDisposableMarker(mockErrorClient);
      throw new Error('expected marker assertion to throw');
    } catch (err: any) {
      expect(err.message).not.toContain('query_secret');
      expect(err.message).not.toContain('password authentication failed');
      expect(err.message).not.toContain('sslkey');
      expect(err.message).not.toContain('token=');
    }
  });

  it('connect failure reporting uses a fixed message and does not leak credentials', async () => {
    const net = await import('node:net');
    const { runSourcesRlsProof } = await import('../../../scripts/test-sources-rls-postgres');
    const server = net.createServer((socket) => socket.destroy());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as { port: number }).port;
    try {
      const result = await runSourcesRlsProof({
        strict: true,
        dbUrl: `postgres://postgres:component_secret@127.0.0.1:${port}/omni_sources_rls_test?sslkey=query_secret`,
      });
      expect(result.status).toBe('failed');
      expect(result.proven).toBe(false);
      const joined = result.details.join('\n');
      expect(joined).toMatch(/FAIL-CLOSED: Failed to connect to disposable database/);
      expect(joined).not.toContain('component_secret');
      expect(joined).not.toContain('query_secret');
      expect(joined).not.toContain('sslkey');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it('ignores DATABASE_URL even if present; only LOCAL_DISPOSABLE_DB_URL or dbUrl may be considered', async () => {
    const { runSourcesRlsProof } = await import('../../../scripts/test-sources-rls-postgres');
    const originalLocal = process.env.LOCAL_DISPOSABLE_DB_URL;
    const originalDb = process.env.DATABASE_URL;
    delete process.env.LOCAL_DISPOSABLE_DB_URL;
    process.env.DATABASE_URL = 'postgres://postgres:component_secret@db.supabase.co:5432/postgres?sslkey=query_secret';
    try {
      const skipped = await runSourcesRlsProof({ strict: false });
      expect(skipped.status).toBe('skipped_no_db');
      expect(skipped.proven).toBe(false);
      expect(skipped.executable).toBe(false);
      const skippedJoined = skipped.details.join('\n');
      expect(skippedJoined).toMatch(/LOCAL_DISPOSABLE_DB_URL/);
      expect(skippedJoined).not.toContain('component_secret');
      expect(skippedJoined).not.toContain('query_secret');
      expect(skippedJoined).not.toContain('db.supabase.co');
      expect(skippedJoined).not.toMatch(/DATABASE_URL/);

      const withArg = await runSourcesRlsProof({
        strict: true,
        dbUrl: 'postgres://postgres:postgres@127.0.0.1:59999/omni_sources_rls_test',
      });
      expect(withArg.status).toBe('failed');
      expect(withArg.proven).toBe(false);
      expect(withArg.details.some((d) => d.includes('FAIL-CLOSED'))).toBe(true);
      const argJoined = withArg.details.join('\n');
      expect(argJoined).not.toContain('component_secret');
      expect(argJoined).not.toContain('query_secret');
      expect(argJoined).not.toContain('db.supabase.co');
    } finally {
      if (originalLocal) process.env.LOCAL_DISPOSABLE_DB_URL = originalLocal;
      else delete process.env.LOCAL_DISPOSABLE_DB_URL;
      if (originalDb) process.env.DATABASE_URL = originalDb;
      else delete process.env.DATABASE_URL;
    }
  });

  it('returns skipped_no_db and proven=false when LOCAL_DISPOSABLE_DB_URL is omitted in non-strict mode', async () => {
    const { runSourcesRlsProof } = await import('../../../scripts/test-sources-rls-postgres');
    const originalEnv = process.env.LOCAL_DISPOSABLE_DB_URL;
    delete process.env.LOCAL_DISPOSABLE_DB_URL;
    try {
      const result = await runSourcesRlsProof({ strict: false });
      expect(result.status).toBe('skipped_no_db');
      expect(result.proven).toBe(false);
      expect(result.executable).toBe(false);
      expect(result.details.some((d) => d.includes('LOCAL_DISPOSABLE_DB_URL'))).toBe(true);
    } finally {
      if (originalEnv) process.env.LOCAL_DISPOSABLE_DB_URL = originalEnv;
    }
  });

  it('fails closed when LOCAL_DISPOSABLE_DB_URL is omitted in strict mode', async () => {
    const { runSourcesRlsProof } = await import('../../../scripts/test-sources-rls-postgres');
    const originalEnv = process.env.LOCAL_DISPOSABLE_DB_URL;
    delete process.env.LOCAL_DISPOSABLE_DB_URL;
    try {
      const result = await runSourcesRlsProof({ strict: true });
      expect(result.status).toBe('failed');
      expect(result.proven).toBe(false);
      expect(result.executable).toBe(true);
      expect(result.details.some((d) => d.includes('FAIL-CLOSED'))).toBe(true);
    } finally {
      if (originalEnv) process.env.LOCAL_DISPOSABLE_DB_URL = originalEnv;
    }
  });

  it('fails closed in strict mode when target DB is unreachable', async () => {
    const { runSourcesRlsProof } = await import('../../../scripts/test-sources-rls-postgres');
    const result = await runSourcesRlsProof({
      strict: true,
      dbUrl: 'postgres://postgres:postgres@127.0.0.1:59999/omni_sources_rls_test',
    });

    expect(result.status).toBe('failed');
    expect(result.proven).toBe(false);
    expect(result.executable).toBe(true);
    expect(result.details.some((d) => d.includes('FAIL-CLOSED'))).toBe(true);
  });
});
