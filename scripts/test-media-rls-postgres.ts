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
    message.startsWith('Cascade deletion failed:')
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
    port: url.port ? Number(url.port) : 54322,
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || ''),
    database: dbName,
  };
}

async function isPortReachable(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
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
  await client.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
  await client.query(`CREATE SCHEMA public;`);
  await client.query(`GRANT ALL ON SCHEMA public TO postgres;`);
  await client.query(`GRANT ALL ON SCHEMA public TO public;`);
  details.push('PASS: Reset disposable test schemas (auth, public)');

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

  const lessonAId = 'a0000000-0000-4000-8000-000000000010';
  const versionA1Id = 'a0000000-0000-4000-8000-000000000020';
  const versionA2Id = 'a0000000-0000-4000-8000-000000000021';
  const shadowingAId = 'a0000000-0000-4000-8000-000000000030';
  const dictationAId = 'a0000000-0000-4000-8000-000000000040';

  const lessonBId = 'b0000000-0000-4000-8000-000000000010';

  // --- USER A CREATES INITIAL RECORDS ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);

  // Insert Lesson A
  await client.query(
    `INSERT INTO public.media_lessons (id, user_id, title, media_type, media_url, duration_ms, processing_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [lessonAId, USER_A_ID, 'Alice Lesson on Sustainable Urbanism', 'youtube', 'https://www.youtube.com/watch?v=wr6fQ4KpbRM', 120000, 'ready']
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

  // Insert Shadowing Attempt A
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
      JSON.stringify({ overallScore: 88, fluencyScore: 85, intonationScore: 90, accuracyScore: 89, feedbackVi: 'Phát âm tốt', swallowedWords: [], stressHighlights: [] }),
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

  // --- PROOF 1: User B cannot select User A lesson (returns 0 rows) ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectRes = await client.query(`SELECT * FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');
  if (selectRes.rows.length !== 0) {
    throw new Error('Policy violation: User B was able to SELECT User A media lesson!');
  }
  details.push('PASS: Proof 1: User B cannot select User A media lesson (0 rows returned)');

  // --- PROOF 2: User B cannot update User A lesson (0 rows affected) ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const updateRes = await client.query(`UPDATE public.media_lessons SET title = 'Hacked' WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');
  if (updateRes.rowCount !== 0) {
    throw new Error('Policy violation: User B was able to UPDATE User A media lesson!');
  }
  details.push('PASS: Proof 2: User B cannot update User A media lesson (0 rows affected)');

  // --- PROOF 3: User B cannot delete User A lesson (0 rows affected) ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const deleteRes = await client.query(`DELETE FROM public.media_lessons WHERE id = $1;`, [lessonAId]);
  await client.query('COMMIT;');
  if (deleteRes.rowCount !== 0) {
    throw new Error('Policy violation: User B was able to DELETE User A media lesson!');
  }
  details.push('PASS: Proof 3: User B cannot delete User A media lesson (0 rows affected)');

  // --- PROOF 4: User B cannot select User A transcript version (returns 0 rows) ---
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectVerRes = await client.query(`SELECT * FROM public.media_transcript_versions WHERE id = $1;`, [versionA1Id]);
  await client.query('COMMIT;');
  if (selectVerRes.rows.length !== 0) {
    throw new Error('Policy violation: User B was able to SELECT User A transcript version!');
  }
  details.push('PASS: Proof 4: User B cannot select User A transcript version (0 rows returned)');

  // --- PROOF 5: User B cannot insert a transcript version targeting User A lesson ---
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
  if (!crossUserVersionBlocked) {
    throw new Error('Policy violation: User B was able to INSERT a transcript version into User A lesson!');
  }
  details.push('PASS: Proof 5: User B cannot insert transcript version targeting User A lesson (cross-row RLS blocked)');

  // --- PROOF 6: User B cannot attach a shadowing attempt to User A lesson and version ---
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
  if (!crossUserShadowingBlocked) {
    throw new Error('Policy violation: User B was able to attach a shadowing attempt to User A lesson/version!');
  }
  details.push('PASS: Proof 6: User B cannot attach shadowing attempt to User A lesson/version (cross-row RLS blocked)');

  // --- PROOF 7: User B cannot attach a dictation attempt to User A lesson and version ---
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
  if (!crossUserDictationBlocked) {
    throw new Error('Policy violation: User B was able to attach a dictation attempt to User A lesson/version!');
  }
  details.push('PASS: Proof 7: User B cannot attach dictation attempt to User A lesson/version (cross-row RLS blocked)');

  // --- PROOF 8: User B cannot create or access resume state for User A lesson ---
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
  if (!crossUserResumeBlocked) {
    throw new Error('Policy violation: User B was able to insert resume state for User A lesson!');
  }
  details.push('PASS: Proof 8: User B cannot insert or access resume state for User A lesson (cross-row RLS blocked)');

  // --- PROOF 9: Direct UPDATE on media_transcript_versions is rejected by trigger ---
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
  if (!directUpdateBlocked) {
    throw new Error('Policy violation: Direct UPDATE on media_transcript_versions was not blocked by append-only trigger!');
  }
  details.push('PASS: Proof 9: Direct UPDATE on media_transcript_versions is rejected (immutable append-only trigger)');

  // --- PROOF 10: Direct DELETE on media_transcript_versions is rejected by trigger ---
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
  if (!directDeleteBlocked) {
    throw new Error('Policy violation: Direct DELETE on media_transcript_versions was not blocked by trigger!');
  }
  details.push('PASS: Proof 10: Direct DELETE on media_transcript_versions is rejected (immutable append-only trigger)');

  // --- PROOF 11: User A creates valid immutable transcript version 2 while v1 remains unchanged ---
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
  details.push('PASS: Proof 11: User A created immutable transcript v2 while v1 remains preserved and unchanged');

  // --- PROOF 12: Duplicate version number on same lesson is rejected by UNIQUE constraint ---
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
  if (!duplicateVersionBlocked) {
    throw new Error('Integrity error: Duplicate version_number was not blocked by UNIQUE constraint!');
  }
  details.push('PASS: Proof 12: Duplicate version number rejected by UNIQUE(lesson_id, version_number)');

  // --- PROOF 13: Raw audio binary is rejected by table check constraint ---
  let rawAudioBlocked = false;
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
        versionA2Id,
        USER_A_ID,
        2000,
        'measured',
        JSON.stringify({ audio: 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ8USA...' }),
      ]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '23514') rawAudioBlocked = true; // check constraint violation
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!rawAudioBlocked) {
    throw new Error('Privacy violation: Raw audio base64 payload was not blocked by check constraint!');
  }
  details.push('PASS: Proof 13: Raw audio binary/base64 payload is strictly blocked by check constraint');

  // --- PROOF 14: Non-disclosing access check ---
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
  details.push('PASS: Proof 14: Non-disclosing access: Foreign and missing records return identical 0-row results');

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

  // --- PROOF 15: Cascade delete on User A lesson removes only owned relational records ---
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
  details.push('PASS: Proof 15: Parent cascade delete cleanly removes owned versions, attempts, and resume state without affecting other tenants');

  return details;
}

export async function runMediaRlsProof(customUrl?: string): Promise<RlsProofResult> {
  const rawUrl =
    customUrl ||
    process.env.LOCAL_DISPOSABLE_DB_URL ||
    'postgres://postgres:postgres@127.0.0.1:54322/omni_media_rls_test';

  const details: string[] = [];

  let config: PostgresConfig;
  try {
    config = assertLocalDatabaseUrl(rawUrl);
  } catch (err) {
    // If not configured or security violation on URL
    if (!process.env.LOCAL_DISPOSABLE_DB_URL && !customUrl) {
      return {
        executable: false,
        proven: false,
        status: 'skipped_no_db',
        details: [
          'GATE-STATUS: LOCAL_DISPOSABLE_DB_URL environment variable is not set.',
          'GATE-STATUS: Real disposable-DB RLS test skipped locally (status: skipped_no_db).',
          'GATE-STATUS: NOT claiming RLS is proven; marked as required CI / disposable-DB gate.',
        ],
      };
    }
    return {
      executable: false,
      proven: false,
      status: 'failed',
      details: [safeFailureMessage(err, UNEXPECTED_FAILURE_MESSAGE)],
    };
  }

  const reachable = await isPortReachable(config.host, config.port);
  if (!reachable) {
    if (!process.env.LOCAL_DISPOSABLE_DB_URL && !customUrl) {
      return {
        executable: false,
        proven: false,
        status: 'skipped_no_db',
        details: [
          `GATE-STATUS: Local test database port ${config.port} is not reachable.`,
          'GATE-STATUS: Real disposable-DB RLS test skipped locally (status: skipped_no_db).',
        ],
      };
    }
    return {
      executable: false,
      proven: false,
      status: 'failed',
      details: [CONNECT_FAILURE_MESSAGE],
    };
  }

  const client = new Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: false,
  });

  try {
    await client.connect();
    const suiteDetails = await executeDisposableDbSuite(client);
    details.push(...suiteDetails);
    return {
      executable: true,
      proven: true,
      status: 'passed',
      details,
    };
  } catch (err) {
    return {
      executable: true,
      proven: false,
      status: 'failed',
      details: [...details, safeFailureMessage(err, LIVE_EXECUTION_FAILURE_MESSAGE)],
    };
  } finally {
    await client.end().catch(() => {});
  }
}

// Direct execution CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-media-rls-postgres.ts')) {
  runMediaRlsProof()
    .then((result) => {
      console.log(`[RLS-PROOF] Status: ${result.status} (proven: ${result.proven})`);
      for (const d of result.details) {
        console.log(` - ${d}`);
      }
      if (result.status === 'failed') {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[RLS-PROOF] Fatal error:', err.message);
      process.exit(1);
    });
}
