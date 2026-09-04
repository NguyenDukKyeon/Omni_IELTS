import { readFileSync } from 'node:fs';
import net from 'node:net';
import pg from 'pg';

const { Client } = pg;
const SOURCES_MIGRATION_PATH = 'supabase/migrations/202608300001_sources_library.sql';
const MEDIA_MIGRATION_PATH = 'supabase/migrations/202609040001_media_learning_room.sql';
const MIGRATION_PATHS = [SOURCES_MIGRATION_PATH, MEDIA_MIGRATION_PATH];

export const REQUIRED_DISPOSABLE_DB_NAME = 'omni_media_rls_test';
export const REQUIRED_MARKER_NAME = 'OMNI_MEDIA_RLS_TEST_ENVIRONMENT';
export const REDACTED_DISPOSABLE_DB_URL = '[redacted disposable database URL]';
const PINNED_LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1']);
const CONNECT_FAILURE_MESSAGE = 'Failed to connect to disposable database';
const MARKER_FAILURE_MESSAGE =
  'SECURITY_VIOLATION: Missing or invalid disposable database marker omni_test.disposable_marker. Refusing to run destructive operations on non-disposable database.';
const LIVE_EXECUTION_FAILURE_MESSAGE = 'Live database execution error';
const UNEXPECTED_FAILURE_MESSAGE = 'Unexpected disposable database runner error';

export type RlsProofResult = {
  executable: boolean;
  proven: boolean;
  status: 'passed' | 'skipped_no_db' | 'failed';
  details: string[];
};

export const USER_A_ID = 'a0000000-0000-4000-8000-000000000001';
export const USER_B_ID = 'b0000000-0000-4000-8000-000000000002';

export type PostgresConfig = {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
};

export function sanitizeUrlForDisplay(_rawUrl: string): string {
  return REDACTED_DISPOSABLE_DB_URL;
}

function isSafeInternalFailureMessage(message: string): boolean {
  return (
    message.startsWith('SECURITY_VIOLATION:') ||
    message.startsWith('Policy violation:') ||
    message.startsWith('Cascade deletion failed:') ||
    message.startsWith('Provenance violation:') ||
    message.startsWith('Privacy constraint violation:')
  );
}

function safeFailureMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : '';
  if (isSafeInternalFailureMessage(message)) {
    return message;
  }
  return fallback;
}

export function assertLocalDatabaseUrl(rawUrl: string): PostgresConfig {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('SECURITY_VIOLATION: Invalid database URL format.');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('SECURITY_VIOLATION: Database protocol must be postgres: or postgresql.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    hostname.includes('supabase.co') ||
    hostname.includes('supabase.com') ||
    hostname.includes('amazonaws.com') ||
    hostname.includes('azure.com')
  ) {
    throw new Error(
      'SECURITY_VIOLATION: Supabase or remote cloud database endpoints are strictly forbidden for disposable RLS tests.'
    );
  }

  if (!PINNED_LOOPBACK_HOSTS.has(hostname)) {
    throw new Error(
      'SECURITY_VIOLATION: Remote or non-loopback database URLs are strictly forbidden (0.0.0.0, LAN, WAN, and hostnames including localhost disallowed). Disposable DB runner must only target literal loopback addresses 127.0.0.1 or ::1.'
    );
  }

  const dbName = decodeURIComponent((url.pathname || '').replace(/^\//, '')).trim();
  if (dbName !== REQUIRED_DISPOSABLE_DB_NAME) {
    throw new Error(
      `SECURITY_VIOLATION: Database name must be exactly "${REQUIRED_DISPOSABLE_DB_NAME}". Refusing to connect to non-test database.`
    );
  }

  return {
    host: hostname,
    port: url.port ? Number(url.port) : 54323,
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    database: dbName,
  };
}

async function isPortReachable(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function assertDisposableMarker(client: pg.Client): Promise<void> {
  try {
    const markerRes = await client.query(
      `SELECT disposable FROM omni_test.disposable_marker WHERE marker_name = $1;`,
      [REQUIRED_MARKER_NAME]
    );
    if (markerRes.rows.length === 0 || markerRes.rows[0].disposable !== true) {
      throw new Error('Disposable marker value mismatch');
    }
  } catch {
    throw new Error(MARKER_FAILURE_MESSAGE);
  }
}

export async function executeDisposableDbSuite(client: pg.Client): Promise<string[]> {
  const details: string[] = [];

  // 1. Verify marker
  await assertDisposableMarker(client);
  details.push('PASS: Verified disposable database marker omni_test.disposable_marker');

  // 2. Reset schemas
  await client.query(`DROP SCHEMA IF EXISTS auth CASCADE;`);
  await client.query(`CREATE SCHEMA auth;`);
  await client.query(`DROP SCHEMA IF EXISTS omni_internal CASCADE;`);
  await client.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
  await client.query(`CREATE SCHEMA public;`);
  await client.query(`GRANT ALL ON SCHEMA public TO postgres;`);
  await client.query(`GRANT ALL ON SCHEMA public TO public;`);
  details.push('PASS: Reset disposable test schemas (auth, omni_internal, public)');

  // 3. Auth helpers and roles
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  await client.query(`
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
  `);
  await client.query(`
    CREATE OR REPLACE FUNCTION auth.role()
    RETURNS text
    LANGUAGE sql
    STABLE
    AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
    $$;
  `);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
      END IF;
    END $$;
  `);
  await client.query(`GRANT USAGE ON SCHEMA public TO authenticated, anon;`);
  await client.query(`GRANT USAGE ON SCHEMA auth TO authenticated, anon;`);
  await client.query(`GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO authenticated, anon;`);
  await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;`);
  await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;`);
  await client.query(`GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;`);
  details.push('PASS: Auth schema, functions, and authenticated role permissions initialized');

  // 4. Apply migrations
  for (const migrationPath of MIGRATION_PATHS) {
    await client.query(readFileSync(migrationPath, 'utf8'));
    details.push(`PASS: ${migrationPath.split('/').at(-1)} applied to disposable database`);
  }

  // 5. Seed test users
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2), ($3, $4) ON CONFLICT (id) DO NOTHING;`,
    [USER_A_ID, 'alice@disposable.test', USER_B_ID, 'bob@disposable.test']
  );
  details.push('PASS: Seeded authenticated test identities User A and User B');

  const sourceRecordAId = 'a0000000-0000-4000-8000-000000000005';
  const sourceVersionAId = 'a0000000-0000-4000-8000-000000000006';
  const sourceRecordBId = 'b0000000-0000-4000-8000-000000000005';
  const sourceVersionBId = 'b0000000-0000-4000-8000-000000000006';

  const lessonAId = 'a0000000-0000-4000-8000-000000000010';
  const versionA1Id = 'a0000000-0000-4000-8000-000000000020';
  const versionA2Id = 'a0000000-0000-4000-8000-000000000021';
  const shadowingAId = 'a0000000-0000-4000-8000-000000000030';
  const dictationAId = 'a0000000-0000-4000-8000-000000000040';

  const lessonBId = 'b0000000-0000-4000-8000-000000000010';

  // Seed User A & B source records for provenance testing
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.source_records (id, user_id, title, media_type, processing_state)
     VALUES ($1, $2, 'Alice P03 Source', 'youtube', 'ready');`,
    [sourceRecordAId, USER_A_ID]
  );
  await client.query(
    `INSERT INTO public.source_versions (id, source_id, user_id, version_number, stage, content_hash, plain_text)
     VALUES ($1, $2, $3, 1, 'raw', 'hash_sa', 'Alice source text');`,
    [sourceVersionAId, sourceRecordAId, USER_A_ID]
  );
  await client.query('COMMIT;');

  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.source_records (id, user_id, title, media_type, processing_state)
     VALUES ($1, $2, 'Bob P03 Source', 'youtube', 'ready');`,
    [sourceRecordBId, USER_B_ID]
  );
  await client.query(
    `INSERT INTO public.source_versions (id, source_id, user_id, version_number, stage, content_hash, plain_text)
     VALUES ($1, $2, $3, 1, 'raw', 'hash_sb', 'Bob source text');`,
    [sourceVersionBId, sourceRecordBId, USER_B_ID]
  );
  await client.query('COMMIT;');

  // --- USER A CREATES INITIAL RECORDS ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);

  // Insert Lesson A with legitimate source_record_id and source_version_id
  await client.query(
    `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, duration_ms, processing_state, source_record_id, source_version_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
    [lessonAId, USER_A_ID, 'Alice Lesson on Sustainable Urbanism', 'youtube', 'https://www.youtube.com/watch?v=wr6fQ4KpbRM', 120000, 'ready', sourceRecordAId, sourceVersionAId]
  );

  // Insert Version A1
  await client.query(
    `INSERT INTO public.media_transcript_versions (id, lesson_id, user_id, version_number, stage, content_hash, segments, coverage_ratio, word_count, is_complete)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
    [
      versionA1Id,
      lessonAId,
      USER_A_ID,
      1,
      'raw_caption',
      'hash_a1',
      JSON.stringify([
        { id: 'seg_1', index: 0, startMs: 0, endMs: 5000, text: 'Welcome to urbanism.', confidence: 'high' },
      ]),
      0.95,
      4,
      true,
    ]
  );

  // Update current_version_id
  await client.query(`UPDATE public.media_lessons SET current_version_id = $1 WHERE id = $2;`, [versionA1Id, lessonAId]);

  // Insert Shadowing Attempt A with valid evaluation structure matching ShadowingEvaluationSchema
  await client.query(
    `INSERT INTO public.media_shadowing_attempts (id, lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
    [
      shadowingAId,
      lessonAId,
      'seg_1',
      versionA1Id,
      USER_A_ID,
      4800,
      'measured',
      JSON.stringify({
        overallScore: 88,
        fluencyScore: 85,
        intonationScore: 90,
        accuracyScore: 89,
        feedbackVi: 'Phát âm tốt',
        swallowedWords: [],
        stressHighlights: [],
        acousticStatus: 'measured',
      }),
    ]
  );

  // Insert Dictation Attempt A
  await client.query(
    `INSERT INTO public.media_dictation_attempts (id, lesson_id, segment_id, transcript_version_id, user_id, mode, difficulty, user_response_text, expected_text, accuracy_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
    [
      dictationAId,
      lessonAId,
      'seg_1',
      versionA1Id,
      USER_A_ID,
      'full_sentence',
      'medium',
      'Welcome to urbanism.',
      'Welcome to urbanism.',
      100,
    ]
  );

  // Insert Resume State A
  await client.query(
    `INSERT INTO public.media_resume_states (lesson_id, user_id, active_segment_id, playback_position_ms, last_mode, playback_speed)
     VALUES ($1, $2, $3, $4, $5, $6);`,
    [lessonAId, USER_A_ID, 'seg_1', 2500, 'shadowing', 1.0]
  );
  await client.query('COMMIT;');
  details.push('PASS: User A created lesson, version 1, shadowing attempt, dictation attempt, and resume state');

  // --- PROOFS 1-3: media_lessons tenant isolation ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectLessonRes = await client.query(`SELECT * FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  const updateLessonRes = await client.query(`UPDATE public.media_lessons SET title = 'Hacked' WHERE id = $1;`, [lessonAId]);
  const deleteLessonRes = await client.query(`DELETE FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');

  if (selectLessonRes.rows.length !== 0) throw new Error('Policy violation: User B was able to SELECT User A media lesson!');
  if (updateLessonRes.rowCount !== 0) throw new Error('Policy violation: User B was able to UPDATE User A media lesson!');
  if (deleteLessonRes.rowCount !== 0) throw new Error('Policy violation: User B was able to DELETE User A media lesson!');
  details.push('PASS: Proof 1-3: User B cannot SELECT (0 rows), UPDATE (0 rows), or DELETE (0 rows) User A media lesson');

  // --- PROOFS 4-7: media_transcript_versions tenant isolation & append-only ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectVerRes = await client.query(`SELECT * FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
  const updateVerRes = await client.query(`UPDATE public.media_transcript_versions SET content_hash = 'tampered' WHERE id = $1;`, [versionA1Id]);
  const deleteVerRes = await client.query(`DELETE FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
  await client.query('COMMIT;');

  if (selectVerRes.rows.length !== 0) throw new Error('Policy violation: User B was able to SELECT User A transcript version!');
  if (updateVerRes.rowCount !== 0) throw new Error('Policy violation: User B was able to UPDATE User A transcript version!');
  if (deleteVerRes.rowCount !== 0) throw new Error('Policy violation: User B was able to DELETE User A transcript version!');
  details.push('PASS: Proof 4-6: User B cannot SELECT (0 rows), UPDATE (0 rows), or DELETE (0 rows) User A transcript version');

  // Proof 7: User B cannot insert version into User A lesson
  let crossUserVersionBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_transcript_versions (lesson_id, user_id, version_number, stage, content_hash, segments)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [lessonAId, USER_B_ID, 2, 'user_edited', 'hash_b', '[]']
    );
    await client.query('COMMIT;');
  } catch {
    crossUserVersionBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!crossUserVersionBlocked) throw new Error('Policy violation: User B was able to INSERT transcript version into User A lesson!');
  details.push('PASS: Proof 7: User B cannot insert transcript version targeting User A lesson');

  // --- PROOFS 8-11: media_shadowing_attempts tenant isolation ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectShadowingRes = await client.query(`SELECT * FROM public.media_shadowing_attempts WHERE id = $1;`, [shadowingAId]);
  const updateShadowingRes = await client.query(`UPDATE public.media_shadowing_attempts SET audio_duration_ms = 9999 WHERE id = $1;`, [shadowingAId]);
  const deleteShadowingRes = await client.query(`DELETE FROM public.media_shadowing_attempts WHERE id = $1;`, [shadowingAId]);
  await client.query('COMMIT;');

  if (selectShadowingRes.rows.length !== 0) throw new Error('Policy violation: User B was able to SELECT User A shadowing attempt!');
  if (updateShadowingRes.rowCount !== 0) throw new Error('Policy violation: User B was able to UPDATE User A shadowing attempt!');
  if (deleteShadowingRes.rowCount !== 0) throw new Error('Policy violation: User B was able to DELETE User A shadowing attempt!');
  details.push('PASS: Proof 8-10: User B cannot SELECT (0 rows), UPDATE (0 rows), or DELETE (0 rows) User A shadowing attempt');

  // Proof 11: User B cannot insert shadowing attempt into User A lesson/version
  let crossUserShadowingBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [lessonAId, 'seg_1', versionA1Id, USER_B_ID, 3000, 'measured']
    );
    await client.query('COMMIT;');
  } catch {
    crossUserShadowingBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!crossUserShadowingBlocked) throw new Error('Policy violation: User B was able to attach shadowing attempt to User A lesson/version!');
  details.push('PASS: Proof 11: User B cannot attach shadowing attempt to User A lesson/version');

  // --- PROOFS 12-15: media_dictation_attempts tenant isolation ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectDictationRes = await client.query(`SELECT * FROM public.media_dictation_attempts WHERE id = $1;`, [dictationAId]);
  const updateDictationRes = await client.query(`UPDATE public.media_dictation_attempts SET user_response_text = 'tampered' WHERE id = $1;`, [dictationAId]);
  const deleteDictationRes = await client.query(`DELETE FROM public.media_dictation_attempts WHERE id = $1;`, [dictationAId]);
  await client.query('COMMIT;');

  if (selectDictationRes.rows.length !== 0) throw new Error('Policy violation: User B was able to SELECT User A dictation attempt!');
  if (updateDictationRes.rowCount !== 0) throw new Error('Policy violation: User B was able to UPDATE User A dictation attempt!');
  if (deleteDictationRes.rowCount !== 0) throw new Error('Policy violation: User B was able to DELETE User A dictation attempt!');
  details.push('PASS: Proof 12-14: User B cannot SELECT (0 rows), UPDATE (0 rows), or DELETE (0 rows) User A dictation attempt');

  // Proof 15: User B cannot insert dictation attempt into User A lesson/version
  let crossUserDictationBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_dictation_attempts (lesson_id, segment_id, transcript_version_id, user_id, mode, difficulty, user_response_text, expected_text, accuracy_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [lessonAId, 'seg_1', versionA1Id, USER_B_ID, 'full_sentence', 'medium', 'hi', 'hi', 100]
    );
    await client.query('COMMIT;');
  } catch {
    crossUserDictationBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!crossUserDictationBlocked) throw new Error('Policy violation: User B was able to attach dictation attempt to User A lesson/version!');
  details.push('PASS: Proof 15: User B cannot attach dictation attempt to User A lesson/version');

  // --- PROOFS 16-19: media_resume_states tenant isolation ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectResumeRes = await client.query(`SELECT * FROM public.media_resume_states WHERE lesson_id = $1;`, [lessonAId]);
  const updateResumeRes = await client.query(`UPDATE public.media_resume_states SET playback_position_ms = 9999 WHERE lesson_id = $1;`, [lessonAId]);
  const deleteResumeRes = await client.query(`DELETE FROM public.media_resume_states WHERE lesson_id = $1;`, [lessonAId]);
  await client.query('COMMIT;');

  if (selectResumeRes.rows.length !== 0) throw new Error('Policy violation: User B was able to SELECT User A resume state!');
  if (updateResumeRes.rowCount !== 0) throw new Error('Policy violation: User B was able to UPDATE User A resume state!');
  if (deleteResumeRes.rowCount !== 0) throw new Error('Policy violation: User B was able to DELETE User A resume state!');
  details.push('PASS: Proof 16-18: User B cannot SELECT (0 rows), UPDATE (0 rows), or DELETE (0 rows) User A resume state');

  // Proof 19: User B cannot insert resume state for User A lesson
  let crossUserResumeBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_resume_states (lesson_id, user_id, active_segment_id, playback_position_ms, last_mode)
       VALUES ($1, $2, $3, $4, $5);`,
      [lessonAId, USER_B_ID, 'seg_1', 1000, 'shadowing']
    );
    await client.query('COMMIT;');
  } catch {
    crossUserResumeBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!crossUserResumeBlocked) throw new Error('Policy violation: User B was able to insert resume state for User A lesson!');
  details.push('PASS: Proof 19: User B cannot insert or access resume state for User A lesson');

  // --- PROOF 20-21: Direct UPDATE and DELETE on media_transcript_versions blocked by trigger ---
  let directUpdateBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `UPDATE public.media_transcript_versions SET content_hash = 'tampered' WHERE id = $1;`,
      [versionA1Id]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err.message).includes('append-only')) {
      directUpdateBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!directUpdateBlocked) throw new Error('Policy violation: Direct UPDATE on media_transcript_versions was not blocked!');
  details.push('PASS: Proof 20: Direct UPDATE on media_transcript_versions is rejected by immutable append-only trigger');

  let directDeleteBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`DELETE FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err.message).includes('append-only')) {
      directDeleteBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!directDeleteBlocked) throw new Error('Policy violation: Direct DELETE on media_transcript_versions was not blocked!');
  details.push('PASS: Proof 21: Direct DELETE on media_transcript_versions is rejected by immutable append-only trigger');

  // --- PROOF 22: GUC spoofing exploit fails: setting omni.active_deleting_media_lesson_id does NOT allow deleting transcript version ---
  let gucSpoofBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`SELECT set_config('omni.active_deleting_media_lesson_id', $1, true);`, [lessonAId]);
    await client.query(`DELETE FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err.message).includes('append-only')) {
      gucSpoofBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!gucSpoofBlocked) throw new Error('Policy violation: GUC spoofing succeeded in deleting media_transcript_versions!');
  details.push('PASS: Proof 22: GUC spoofing attempt is completely ineffective against database-owned cascade');

  // --- PROOF 23: Direct access to omni_internal schema is rejected for authenticated users ---
  let internalSchemaDenied = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`INSERT INTO omni_internal.active_deleting_media_lessons (lesson_id, tx_id) VALUES ($1, pg_current_xact_id());`, [lessonAId]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501') {
      internalSchemaDenied = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!internalSchemaDenied) throw new Error('Security violation: Authenticated user could write to omni_internal!');
  details.push('PASS: Proof 23: Direct write to omni_internal schema is strictly denied for authenticated users (42501)');

  // --- PROOFS 24-27: Source Provenance Ownership & Cross-Row Verification ---
  // Proof 24: User A cannot link lesson to User B's source_record_id
  let foreignSourceRecordBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url, source_record_id)
       VALUES ($1, 'Stolen Source Lesson', 'youtube', 'https://youtube.com/watch?v=stolen', $2);`,
      [USER_A_ID, sourceRecordBId]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.message.includes('Invalid source reference') || err.code === '42501') {
      foreignSourceRecordBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!foreignSourceRecordBlocked) throw new Error('Provenance violation: User A linked lesson to User B source record!');
  details.push('PASS: Proof 24: Provenance ownership: User A cannot link lesson to User B source record');

  // Proof 25: User A cannot link lesson to non-existent source_record_id (identical error)
  let missingSourceRecordBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url, source_record_id)
       VALUES ($1, 'Missing Source Lesson', 'youtube', 'https://youtube.com/watch?v=missing', '00000000-0000-4000-8000-000000000099');`,
      [USER_A_ID]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.message.includes('Invalid source reference') || err.code === '42501') {
      missingSourceRecordBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!missingSourceRecordBlocked) throw new Error('Provenance violation: Non-existent source record did not fail non-disclosing check!');
  details.push('PASS: Proof 25: Provenance non-disclosure: Missing and foreign source references fail with identical error');

  // Proof 26: User A cannot link lesson to User B's source_version_id
  let foreignSourceVersionBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url, source_record_id, source_version_id)
       VALUES ($1, 'Stolen Version Lesson', 'youtube', 'https://youtube.com/watch?v=stolen', $2, $3);`,
      [USER_A_ID, sourceRecordAId, sourceVersionBId]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.message.includes('Invalid source reference') || err.code === '42501') {
      foreignSourceVersionBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!foreignSourceVersionBlocked) throw new Error('Provenance violation: User A linked lesson to foreign source version!');
  details.push('PASS: Proof 26: Provenance ownership: User A cannot link lesson to mismatched or foreign source version');

  // Proof 27: current_version_id must point to a version belonging to the same lesson
  let crossLessonVersionBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    const newLessonId = 'a0000000-0000-4000-8000-000000000099';
    await client.query(
      `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, current_version_id)
       VALUES ($1, $2, 'Cross Version Lesson', 'youtube', 'https://youtube.com/watch?v=cross', $3);`,
      [newLessonId, USER_A_ID, versionA1Id] // versionA1Id belongs to lessonAId, not newLessonId
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.message.includes('Invalid version reference') || err.code === '42501') {
      crossLessonVersionBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!crossLessonVersionBlocked) throw new Error('Provenance violation: current_version_id was linked to a version belonging to a different lesson!');
  details.push('PASS: Proof 27: current_version_id cross-reference constraint enforced on media_lessons');

  // --- PROOFS 28-30: Structural Raw Audio Privacy & Strict JSON Schemas ---
  // Proof 28: media_url with data: or base64 is rejected
  let rawDataUrlBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url)
       VALUES ($1, 'Data URL Attack', 'audio', 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USA...');`,
      [USER_A_ID]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') rawDataUrlBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!rawDataUrlBlocked) throw new Error('Privacy constraint violation: data: audio URL was not rejected by CHECK constraint!');
  details.push('PASS: Proof 28: Raw audio data: URLs are strictly rejected in media_url by CHECK constraint');

  // Proof 29: Shadowing evaluation with unknown key (e.g. 'audio') is rejected
  let unknownEvaluationKeyBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        lessonAId,
        'seg_1',
        versionA1Id,
        USER_A_ID,
        2000,
        'measured',
        JSON.stringify({
          overallScore: 88,
          fluencyScore: 85,
          intonationScore: 90,
          accuracyScore: 89,
          feedbackVi: 'Tốt',
          swallowedWords: [],
          stressHighlights: [],
          acousticStatus: 'measured',
          audio: 'binary_audio_data_here', // Unknown key!
        }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') unknownEvaluationKeyBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!unknownEvaluationKeyBlocked) throw new Error('Privacy constraint violation: Unknown key "audio" in shadowing evaluation was not blocked!');
  details.push('PASS: Proof 29: Unknown keys in shadowing evaluation are rejected by strict JSON schema CHECK');

  // Proof 30: Base64 audio in dictation response text is rejected
  let base64DictationBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_dictation_attempts (lesson_id, segment_id, transcript_version_id, user_id, mode, difficulty, user_response_text, expected_text, accuracy_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [lessonAId, 'seg_1', versionA1Id, USER_A_ID, 'full_sentence', 'easy', 'data:audio/wav;base64,UklGRiQAAABXQVZF', 'Hello', 0]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') base64DictationBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!base64DictationBlocked) throw new Error('Privacy constraint violation: Base64 audio payload in dictation attempt was not blocked!');
  details.push('PASS: Proof 30: Base64 audio payload in dictation response text is strictly rejected');

  // --- PROOF 31: State Contract Alignment: Terminal states accepted by CHECK constraint ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, processing_state)
     VALUES ('a0000000-0000-4000-8000-000000000081', $1, 'Needs Review Lesson', 'youtube', 'https://youtube.com/watch?v=nr', 'needs_review'),
            ('a0000000-0000-4000-8000-000000000082', $1, 'Requires Original Lesson', 'audio', 'https://storage.local/audio.mp3', 'requires_original_audio');`,
    [USER_A_ID]
  );
  await client.query('COMMIT;');
  details.push('PASS: Proof 31: Processing state CHECK constraint cleanly accepts needs_review and requires_original_audio');

  // --- PROOF 32: User A creates valid immutable transcript version 2 while v1 remains unchanged ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.media_transcript_versions (id, lesson_id, user_id, version_number, stage, content_hash, normalizer_version, segments, coverage_ratio, word_count, is_complete)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
    [
      versionA2Id,
      lessonAId,
      USER_A_ID,
      2,
      'user_edited',
      'hash_a2',
      'user-edited-v1',
      JSON.stringify([
        { id: 'seg_1', index: 0, startMs: 0, endMs: 5000, text: 'Welcome to sustainable urbanism.', confidence: 'high' },
      ]),
      0.95,
      5,
      true,
    ]
  );
  await client.query(`UPDATE public.media_lessons SET current_version_id = $1 WHERE id = $2;`, [versionA2Id, lessonAId]);

  const v1Check = await client.query(`SELECT stage, content_hash FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
  const v2Check = await client.query(`SELECT stage, content_hash FROM public.media_transcript_versions WHERE id = $1;`, [versionA2Id]);
  await client.query('COMMIT;');

  if (v1Check.rows[0]?.content_hash !== 'hash_a1' || v2Check.rows[0]?.content_hash !== 'hash_a2') {
    throw new Error('Version creation error: Version 1 was altered or Version 2 hash mismatched');
  }
  details.push('PASS: Proof 32: User A created immutable transcript v2 while v1 remains preserved and unchanged');

  // --- PROOF 33: Duplicate version number on same lesson is rejected by UNIQUE constraint ---
  let duplicateVersionBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_transcript_versions (lesson_id, user_id, version_number, stage, content_hash, segments)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [lessonAId, USER_A_ID, 2, 'user_edited', 'hash_dup', '[]']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23505') duplicateVersionBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!duplicateVersionBlocked) throw new Error('Integrity error: Duplicate version_number was not blocked by UNIQUE constraint!');
  details.push('PASS: Proof 33: Duplicate version number rejected by UNIQUE(lesson_id, version_number)');

  // --- PROOF 34: Non-disclosing access check ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const missingRes = await client.query(`SELECT * FROM public.media_lessons WHERE id = '00000000-0000-4000-8000-000000000099';`);
  const foreignRes = await client.query(`SELECT * FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');
  if (missingRes.rows.length !== 0 || foreignRes.rows.length !== 0) {
    throw new Error('Information disclosure: Foreign or missing records disclosed rows to unauthorized user!');
  }
  details.push('PASS: Proof 34: Non-disclosing access: Foreign and missing records return identical 0-row results');

  // --- USER B CREATES INDEPENDENT LESSON TO PROVE CASCADE ISOLATION ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, duration_ms, processing_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [lessonBId, USER_B_ID, 'Bob Independent Lesson', 'youtube', 'https://youtube.com/watch?v=bbb', 60000, 'ready']
  );
  await client.query('COMMIT;');

  // --- PROOF 35: Cascade delete on User A lesson removes only owned relational records ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(`DELETE FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');

  // Verify all child records of lesson A are gone (checked as admin/postgres)
  const remainingVersions = await client.query(`SELECT COUNT(*) FROM public.media_transcript_versions WHERE lesson_id = $1;`, [lessonAId]);
  const remainingShadowing = await client.query(`SELECT COUNT(*) FROM public.media_shadowing_attempts WHERE lesson_id = $1;`, [lessonAId]);
  const remainingDictation = await client.query(`SELECT COUNT(*) FROM public.media_dictation_attempts WHERE lesson_id = $1;`, [lessonAId]);
  const remainingResume = await client.query(`SELECT COUNT(*) FROM public.media_resume_states WHERE lesson_id = $1;`, [lessonAId]);
  const userBLesson = await client.query(`SELECT COUNT(*) FROM public.media_lessons WHERE id = $1;`, [lessonBId]);

  if (
    Number(remainingVersions.rows[0].count) !== 0 ||
    Number(remainingShadowing.rows[0].count) !== 0 ||
    Number(remainingDictation.rows[0].count) !== 0 ||
    Number(remainingResume.rows[0].count) !== 0
  ) {
    throw new Error('Cascade deletion failed: Orphaned child records remain after parent media lesson was deleted!');
  }

  if (Number(userBLesson.rows[0].count) !== 1) {
    throw new Error('Cascade deletion failed: User B lesson was affected by User A lesson deletion!');
  }
  details.push('PASS: Proof 35: Parent cascade delete cleanly removes owned versions, attempts, and resume state without affecting other tenants');

  // --- PROOFS 36-43: Trigger Hijacking Prevention and Deep Raw-Audio Privacy ---
  const lessonSecProofId = 'a2000000-0000-4000-8000-000000000001';
  const versionSecProofId = 'a2000000-0000-4000-8000-000000000002';

  // Seed Lesson & Version for Proofs 36-43
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, duration_ms, processing_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [lessonSecProofId, USER_A_ID, 'Lesson For Security Proofs', 'youtube', 'https://youtube.com/watch?v=proofs36to43', 30000, 'ready']
  );
  await client.query(
    `INSERT INTO public.media_transcript_versions (id, lesson_id, user_id, version_number, stage, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6);`,
    [versionSecProofId, lessonSecProofId, USER_A_ID, 1, 'raw_caption', 'hash_proof_36']
  );
  await client.query('COMMIT;');

  // Proof 36: User A attempts temp table trigger hijacking with mark_media_lesson_cascade_delete
  let triggerHijackBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`CREATE TEMP TABLE temp_spoof_cascade (id UUID);`);
    await client.query(`
      CREATE TRIGGER trg_hijack
      BEFORE DELETE ON temp_spoof_cascade
      FOR EACH ROW
      EXECUTE FUNCTION omni_internal.mark_media_lesson_cascade_delete();
    `);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501') triggerHijackBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  // Also verify that version remained intact
  const versionSecCheck = await client.query(
    `SELECT COUNT(*) FROM public.media_transcript_versions WHERE id = $1;`,
    [versionSecProofId]
  );
  if (!triggerHijackBlocked || Number(versionSecCheck.rows[0].count) !== 1) {
    throw new Error('SECURITY_VIOLATION: Attaching omni_internal trigger to temp table was not blocked with 42501 permission denied!');
  }
  details.push('PASS: Proof 36: Temp table trigger hijacking attempt is strictly rejected with 42501 permission denied; transcript versions remain intact');

  // Proof 37: Upper-case and lower-case data URIs in media_url are rejected
  let uppercaseDataUriBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url)
       VALUES ($1, $2, $3, $4);`,
      [USER_A_ID, 'Malicious Uppercase Data URI', 'audio', 'DATA:AUDIO/WEBM;BASE64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') uppercaseDataUriBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  let lowercaseDataUriBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url)
       VALUES ($1, $2, $3, $4);`,
      [USER_A_ID, 'Malicious Lowercase Data URI', 'audio', 'data:audio/wav;base64,UklGRiQAAABXQVZF']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') lowercaseDataUriBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  if (!uppercaseDataUriBlocked || !lowercaseDataUriBlocked) {
    throw new Error('Privacy constraint violation: Data URIs in media_url were not blocked by CHECK constraint!');
  }
  details.push('PASS: Proof 37: Upper-case and lower-case data URIs in media_url are strictly rejected by CHECK constraint');

  // Proof 38: Bare WAV/WebM base64 signatures in media_url are rejected
  let bareWavUrlBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url)
       VALUES ($1, $2, $3, $4);`,
      [USER_A_ID, 'Bare WAV Base64', 'audio', 'UklGRiQAAABXQVZFZmt0']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') bareWavUrlBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  let bareWebmUrlBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_lessons (user_id, title, media_type, media_url)
       VALUES ($1, $2, $3, $4);`,
      [USER_A_ID, 'Bare WebM Base64', 'audio', 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') bareWebmUrlBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  if (!bareWavUrlBlocked || !bareWebmUrlBlocked) {
    throw new Error('Privacy constraint violation: Bare audio base64 signatures in media_url were not blocked!');
  }
  details.push('PASS: Proof 38: Bare WAV/WebM audio base64 signatures in media_url are strictly rejected by CHECK constraint');

  // Proof 39: Bare base64 in user_response_text is rejected
  let bareBase64DictationBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_dictation_attempts (lesson_id, segment_id, transcript_version_id, user_id, mode, difficulty, user_response_text, expected_text, accuracy_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [lessonSecProofId, 'seg_1', versionSecProofId, USER_A_ID, 'full_sentence', 'easy', 'UklGRiQAAABXQVZFZmt0AAAACQAA', 'Hello', 0]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') bareBase64DictationBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!bareBase64DictationBlocked) {
    throw new Error('Privacy constraint violation: Bare base64 audio payload in user_response_text was not blocked!');
  }
  details.push('PASS: Proof 39: Bare base64 audio tokens in user_response_text are strictly rejected by CHECK constraint');

  // Proof 40: Reject bare base64 in evaluation.feedbackVi
  let bareBase64FeedbackBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        lessonSecProofId,
        'seg_1',
        versionSecProofId,
        USER_A_ID,
        3000,
        'measured',
        JSON.stringify({
          overallScore: 80,
          fluencyScore: 80,
          intonationScore: 80,
          accuracyScore: 80,
          feedbackVi: 'UklGRiQAAABXQVZFZmt0AAAACQAA',
          swallowedWords: [],
          stressHighlights: [],
          acousticStatus: 'measured',
        }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') bareBase64FeedbackBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!bareBase64FeedbackBlocked) {
    throw new Error('Privacy constraint violation: Bare base64 audio in evaluation feedbackVi was not blocked!');
  }
  details.push('PASS: Proof 40: Bare base64 audio tokens in evaluation feedbackVi are strictly rejected by structural CHECK validator');

  // Proof 41: Reject evaluation with valid keys but invalid types or score ranges
  let invalidScoreRangeBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        lessonSecProofId,
        'seg_1',
        versionSecProofId,
        USER_A_ID,
        3000,
        'measured',
        JSON.stringify({
          overallScore: 150, // Invalid range (>100)
          fluencyScore: 80,
          intonationScore: 80,
          accuracyScore: 80,
          feedbackVi: 'Tốt',
          swallowedWords: [],
          stressHighlights: [],
          acousticStatus: 'measured',
        }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') invalidScoreRangeBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  let invalidScoreTypeBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        lessonSecProofId,
        'seg_1',
        versionSecProofId,
        USER_A_ID,
        3000,
        'measured',
        JSON.stringify({
          overallScore: '80', // Invalid type (string)
          fluencyScore: 80,
          intonationScore: 80,
          accuracyScore: 80,
          feedbackVi: 'Tốt',
          swallowedWords: [],
          stressHighlights: [],
          acousticStatus: 'measured',
        }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') invalidScoreTypeBlocked = true;
    await client.query('ROLLBACK;').catch(() => {});
  }

  if (!invalidScoreRangeBlocked || !invalidScoreTypeBlocked) {
    throw new Error('Privacy constraint violation: Invalid evaluation score range or type was not blocked!');
  }
  details.push('PASS: Proof 41: Evaluations with invalid score ranges or invalid types are strictly rejected by structural CHECK validator');

  // Proof 42: Reject unknown evaluation keys
  let unknownEvaluationKeyBlocked42 = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        lessonSecProofId,
        'seg_1',
        versionSecProofId,
        USER_A_ID,
        3000,
        'measured',
        JSON.stringify({
          overallScore: 85,
          fluencyScore: 85,
          intonationScore: 85,
          accuracyScore: 85,
          feedbackVi: 'Tốt',
          swallowedWords: [],
          stressHighlights: [],
          acousticStatus: 'measured',
          rawAudioBlob: 'malicious_extra_field',
        }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') unknownEvaluationKeyBlocked42 = true;
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!unknownEvaluationKeyBlocked42) {
    throw new Error('Privacy constraint violation: Unknown evaluation key rawAudioBlob was not blocked!');
  }
  details.push('PASS: Proof 42: Evaluations with unknown keys are strictly rejected by structural CHECK validator');

  // Proof 43: Accept one valid, fully typed, bounded evaluation object with Vietnamese feedback
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const validInsertRes = await client.query(
    `INSERT INTO public.media_shadowing_attempts (lesson_id, segment_id, transcript_version_id, user_id, audio_duration_ms, acoustic_status, evaluation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, evaluation;`,
    [
      lessonSecProofId,
      'seg_1',
      versionSecProofId,
      USER_A_ID,
      4500,
      'measured',
      JSON.stringify({
        overallScore: 92,
        fluencyScore: 90,
        intonationScore: 94,
        accuracyScore: 91,
        feedbackVi: 'Phát âm rất chuẩn và ngữ điệu tự nhiên, cần duy trì tốc độ nói này.',
        swallowedWords: ['to'],
        stressHighlights: [
          { word: 'natural', isCorrect: true, tip: 'Nhấn đúng trọng âm 1' },
        ],
        actionableAdviceVi: 'Tiếp tục luyện tập các câu ghép phức tạp hơn.',
        acousticStatus: 'measured',
        telemetry: {
          rawWpm: 125,
          fillerCount: 0,
        },
      }),
    ]
  );
  await client.query('COMMIT;');

  if (!validInsertRes.rows[0]?.id || validInsertRes.rows[0].evaluation.overallScore !== 92) {
    throw new Error('Privacy constraint error: Valid typed evaluation object failed to insert!');
  }
  details.push('PASS: Proof 43: Fully typed, bounded evaluation object with Vietnamese feedback is accepted and verified');

  return details;
}

export async function runMediaRlsProof(options: { strict?: boolean; dbUrl?: string } = {}): Promise<RlsProofResult> {
  const isStrict = options.strict ?? (process.env.CI === 'true' || process.argv.includes('--strict'));
  const details: string[] = [];

  // 1. Verify migration SQL structure and trigger rules
  const sql = MIGRATION_PATHS.map((migrationPath) => readFileSync(migrationPath, 'utf8')).join('\n');
  if (
    !sql.includes('omni_internal.prevent_media_transcript_version_mutation') ||
    !sql.includes('omni_internal.active_deleting_media_lessons') ||
    !sql.includes('omni_internal.enforce_media_lesson_provenance') ||
    !sql.includes('shadowing_evaluation_schema_valid') ||
    !sql.includes('media_lessons_media_url_no_raw_audio') ||
    !sql.includes('validate_shadowing_evaluation') ||
    sql.includes('omni.active_deleting_media_lesson_id')
  ) {
    details.push('FAIL: Migration SQL is missing required append-only, non-spoofable cascade, or provenance controls');
    return { executable: true, proven: false, status: 'failed', details };
  }
  details.push('PASS: Migration SQL contains required append-only, non-spoofable cascade, and provenance controls');

  // 2. Discover local disposable PostgreSQL instance
  const rawDbUrl = options.dbUrl || process.env.LOCAL_DISPOSABLE_DB_URL;

  if (!rawDbUrl) {
    if (isStrict) {
      details.push('FAIL-CLOSED: LOCAL_DISPOSABLE_DB_URL is required in strict mode/CI');
      return { executable: true, proven: false, status: 'failed', details };
    }

    details.push('GATE-STATUS: LOCAL_DISPOSABLE_DB_URL environment variable is not set.');
    details.push('GATE-STATUS: Real disposable-DB RLS test skipped locally (status: skipped_no_db).');
    details.push('GATE-STATUS: NOT claiming RLS is proven; marked as required CI / disposable-DB gate.');
    return { executable: false, proven: false, status: 'skipped_no_db', details };
  }

  let dbConfig: PostgresConfig;
  try {
    dbConfig = assertLocalDatabaseUrl(rawDbUrl);
  } catch (err: unknown) {
    details.push(`FAIL-CLOSED: ${safeFailureMessage(err, 'Invalid disposable database URL.')}`);
    return { executable: true, proven: false, status: 'failed', details };
  }

  const isAlive = await isPortReachable(dbConfig.host, dbConfig.port, 1500);
  if (!isAlive) {
    if (isStrict) {
      details.push(`FAIL-CLOSED: Disposable database host ${dbConfig.host}:${dbConfig.port} is unreachable`);
      return { executable: true, proven: false, status: 'failed', details };
    }

    details.push(`GATE-STATUS: Disposable database host ${dbConfig.host}:${dbConfig.port} is unreachable (status: skipped_no_db).`);
    details.push('GATE-STATUS: Real disposable-DB RLS test skipped locally.');
    details.push('GATE-STATUS: NOT claiming RLS is proven; marked as required CI / disposable-DB gate.');
    return { executable: false, proven: false, status: 'skipped_no_db', details };
  }

  const client = new Client(dbConfig);
  try {
    await client.connect();
  } catch {
    await client.end().catch(() => {});
    if (isStrict) {
      details.push(`FAIL-CLOSED: ${CONNECT_FAILURE_MESSAGE}`);
      return { executable: true, proven: false, status: 'failed', details };
    }
    details.push(`GATE-STATUS: ${CONNECT_FAILURE_MESSAGE} (status: skipped_no_db).`);
    return { executable: false, proven: false, status: 'skipped_no_db', details };
  }

  // 3. Execute live tests on reachable database instance
  try {
    details.push(`Connected to disposable PostgreSQL instance at ${dbConfig.host}:${dbConfig.port} (database: ${dbConfig.database})`);
    const suiteDetails = await executeDisposableDbSuite(client);
    details.push(...suiteDetails);
    await client.end();

    return {
      executable: true,
      proven: true,
      status: 'passed',
      details: [
        ...details,
        'PASS: All 43 Media RLS proof contracts verified against live disposable database',
      ],
    };
  } catch (err: unknown) {
    await client.end().catch(() => {});
    details.push(`FAIL: ${safeFailureMessage(err, LIVE_EXECUTION_FAILURE_MESSAGE)}`);
    return { executable: true, proven: false, status: 'failed', details };
  }
}

// Direct execution CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-media-rls-postgres.ts')) {
  const isStrict = process.argv.includes('--strict') || process.env.CI === 'true';
  runMediaRlsProof({ strict: isStrict })
    .then((result) => {
      console.log(`[RLS-PROOF] Status: ${result.status} (proven: ${result.proven})`);
      for (const d of result.details) {
        console.log(` - ${d}`);
      }
      if (result.status === 'failed' || (isStrict && !result.proven)) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[RLS-PROOF] Fatal error:', err.message);
      process.exit(1);
    });
}
