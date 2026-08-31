import { readFileSync } from 'node:fs';
import net from 'node:net';
import pg from 'pg';

const { Client } = pg;
const MIGRATION_PATH = 'supabase/migrations/202608300001_sources_library.sql';
export const REQUIRED_DISPOSABLE_DB_NAME = 'omni_sources_rls_test';
export const REQUIRED_MARKER_NAME = 'OMNI_SOURCES_RLS_TEST_ENVIRONMENT';

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

/**
 * Sanitizes a database connection URL for safe logging/display by redacting passwords.
 */
export function sanitizeUrlForDisplay(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return rawUrl.replace(/:([^:@/]+)@/, ':***@');
  }
}

/**
 * Validates that a database URL is strictly a local loopback address targeting the
 * dedicated disposable database `omni_sources_rls_test`.
 * Rejects 0.0.0.0, LAN/WAN addresses, remote hostnames, supabase domains, non-postgres protocols,
 * and any database name other than `omni_sources_rls_test` before any connection is attempted.
 */
export function assertLocalDatabaseUrl(rawUrl: string): PostgresConfig {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`SECURITY_VIOLATION: Invalid database URL format: "${sanitizeUrlForDisplay(rawUrl)}"`);
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error(`SECURITY_VIOLATION: Database protocol must be postgres: or postgresql:, got "${url.protocol}"`);
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // Reject Supabase / remote indicators
  if (
    hostname.includes('supabase.co') ||
    hostname.includes('supabase.com') ||
    hostname.includes('amazonaws.com') ||
    hostname.includes('azure.com')
  ) {
    throw new Error('SECURITY_VIOLATION: Supabase or remote cloud database endpoints are strictly forbidden for disposable RLS tests.');
  }

  // Strict literal loopback verification
  const isStrictLoopback =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  if (!isStrictLoopback) {
    throw new Error(
      `SECURITY_VIOLATION: Remote or non-loopback database URLs are strictly forbidden (0.0.0.0, LAN, WAN disallowed). Disposable DB runner must only target local loopback (localhost/127.0.0.1/[::1]), got "${hostname}".`
    );
  }

  // Dedicated database name verification
  const dbName = decodeURIComponent((url.pathname || '').replace(/^\//, '')).trim();
  if (dbName !== REQUIRED_DISPOSABLE_DB_NAME) {
    throw new Error(
      `SECURITY_VIOLATION: Database name must be exactly "${REQUIRED_DISPOSABLE_DB_NAME}", got "${dbName || '(empty)'}". Refusing to connect to non-test database.`
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

/**
 * Checks if a TCP port on a loopback host is reachable with a timeout.
 */
async function isPortReachable(host: string, port: number, timeoutMs = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => {
      isConnected = true;
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

/**
 * Verifies that the connected database contains the disposable marker outside public schema.
 */
export async function assertDisposableMarker(client: pg.Client): Promise<void> {
  try {
    const markerRes = await client.query(
      `SELECT disposable FROM omni_test.disposable_marker WHERE marker_name = $1;`,
      [REQUIRED_MARKER_NAME]
    );
    if (markerRes.rows.length === 0 || markerRes.rows[0].disposable !== true) {
      throw new Error('Disposable marker value mismatch');
    }
  } catch (err: any) {
    throw new Error(
      `SECURITY_VIOLATION: Missing or invalid disposable database marker omni_test.disposable_marker: ${err.message}. Refusing to run destructive operations on non-disposable database.`
    );
  }
}

/**
 * Executes the full suite of RLS and cascade trigger proofs against a live disposable Postgres DB using pg.Client.
 * Every step and transaction statement uses separate, discrete client.query() calls.
 */
export async function executeDisposableDbSuite(client: pg.Client): Promise<string[]> {
  const details: string[] = [];

  // 1. Verify disposable database marker before any destructive schema setup
  await assertDisposableMarker(client);
  details.push('PASS: Verified disposable database marker omni_test.disposable_marker');

  // 2. Reset only the disposable schemas (preserving omni_test marker schema)
  await client.query(`DROP SCHEMA IF EXISTS auth CASCADE;`);
  await client.query(`CREATE SCHEMA auth;`);
  await client.query(`DROP SCHEMA IF EXISTS public CASCADE;`);
  await client.query(`CREATE SCHEMA public;`);
  await client.query(`GRANT ALL ON SCHEMA public TO postgres;`);
  await client.query(`GRANT ALL ON SCHEMA public TO public;`);
  details.push('PASS: Reset disposable test schemas (auth, public)');

  // 3. Initialize auth helpers, roles, and functions
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
  await client.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;`);
  await client.query(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;`);
  await client.query(`GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;`);
  details.push('PASS: Auth schema, functions, and authenticated role permissions initialized');

  // 4. Apply migration SQL
  const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');
  await client.query(migrationSql);
  details.push('PASS: 202608300001_sources_library.sql applied to disposable database');

  // 5. Seed authenticated test identities User A and User B
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2), ($3, $4) ON CONFLICT (id) DO NOTHING;`,
    [USER_A_ID, 'alice@disposable.test', USER_B_ID, 'bob@disposable.test']
  );
  details.push('PASS: Seeded authenticated test identities User A and User B');

  const recordAId = 'a0000000-0000-4000-8000-000000000010';
  const versionAId = 'a0000000-0000-4000-8000-000000000020';
  const jobAId = 'a0000000-0000-4000-8000-000000000030';

  // User A creates a source record, version, and job
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.source_records (id, user_id, title, summary, media_type, provenance, processing_state)
     VALUES ($1, $2, $3, $4, $5, $6, $7);`,
    [recordAId, USER_A_ID, 'Alice Article', 'A summary of renewable energy', 'text', JSON.stringify({ originType: 'pasted_text' }), 'ready']
  );
  await client.query(
    `INSERT INTO public.source_versions (id, source_id, user_id, version_number, stage, content_hash, plain_text, extraction_report)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
    [versionAId, recordAId, USER_A_ID, 1, 'raw', 'hash_a1', 'Renewable energy content', JSON.stringify({ extractor: 'text' })]
  );
  await client.query(
    `INSERT INTO public.source_artifact_jobs (id, user_id, source_version_id, destination, target_band, state)
     VALUES ($1, $2, $3, $4, $5, $6);`,
    [jobAId, USER_A_ID, versionAId, 'practice', 7.5, 'ready']
  );
  await client.query('COMMIT;');

  // Proof 1: User B cannot select User A source (returns 0 rows)
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  const selectResB = await client.query(`SELECT * FROM public.source_records WHERE id = $1;`, [recordAId]);
  await client.query('COMMIT;');
  if (selectResB.rows.length !== 0) {
    throw new Error('Policy violation: User B was able to SELECT User A source record!');
  }
  details.push('PASS: Proof 1: User B cannot SELECT User A source_records (returns zero rows)');

  // Proof 2: User B cannot insert a version into User A source (fails RLS)
  let insertVersionBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.source_versions (id, source_id, user_id, version_number, stage, content_hash, plain_text, extraction_report)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
      ['b0000000-0000-4000-8000-000000000021', recordAId, USER_B_ID, 2, 'raw', 'hash_b', 'Stolen content', JSON.stringify({ extractor: 'text' })]
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err).includes('row-level security') || String(err).includes('policy')) {
      insertVersionBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!insertVersionBlocked) {
    throw new Error('Policy violation: User B was able to INSERT a version for User A source ID without RLS rejection!');
  }
  details.push('PASS: Proof 2: User B cannot INSERT source_versions with User A source_id (fails RLS)');

  // Proof 3: User B cannot insert an artifact job into User A version (fails RLS)
  let insertJobBlocked = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_B_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(
      `INSERT INTO public.source_artifact_jobs (id, user_id, source_version_id, destination, target_band, state)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      ['b0000000-0000-4000-8000-000000000031', USER_B_ID, versionAId, 'vocabulary_deck', 7.0, 'queued']
    );
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err).includes('row-level security') || String(err).includes('policy')) {
      insertJobBlocked = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!insertJobBlocked) {
    throw new Error('Policy violation: User B was able to INSERT artifact job for User A version ID without RLS rejection!');
  }
  details.push('PASS: Proof 3: User B cannot INSERT source_artifact_jobs with User A version_id (fails RLS)');

  // Proof 4: User A direct version UPDATE gives SQLSTATE 42501
  let updateVersionFailedWith42501 = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`UPDATE public.source_versions SET plain_text = $1 WHERE id = $2;`, ['tampered', versionAId]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err).includes('42501') || String(err).includes('append-only')) {
      updateVersionFailedWith42501 = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!updateVersionFailedWith42501) {
    throw new Error('Policy violation: Direct UPDATE of source_versions did not raise 42501!');
  }
  details.push('PASS: Proof 4: User A direct version UPDATE gives SQLSTATE 42501');

  // Proof 5: User A direct version DELETE gives SQLSTATE 42501
  let deleteVersionFailedWith42501 = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`DELETE FROM public.source_versions WHERE id = $1;`, [versionAId]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err).includes('42501') || String(err).includes('append-only')) {
      deleteVersionFailedWith42501 = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!deleteVersionFailedWith42501) {
    throw new Error('Policy violation: Direct DELETE of source_versions did not raise 42501!');
  }
  details.push('PASS: Proof 5: User A direct version DELETE gives SQLSTATE 42501');

  // Proof 6: User A parent source delete cascades versions and jobs
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(`DELETE FROM public.source_records WHERE id = $1;`, [recordAId]);
  await client.query('COMMIT;');

  const versionsCountRes = await client.query(
    `SELECT count(*)::text AS count FROM public.source_versions WHERE id = $1;`,
    [versionAId]
  );
  const jobsCountRes = await client.query(
    `SELECT count(*)::text AS count FROM public.source_artifact_jobs WHERE id = $1;`,
    [jobAId]
  );
  if (versionsCountRes.rows[0]?.count !== '0' || jobsCountRes.rows[0]?.count !== '0') {
    throw new Error('Cascade deletion failed: source_versions or source_artifact_jobs remained after parent source_records delete');
  }
  details.push('PASS: Proof 6: User A parent source delete cascades versions/jobs');

  // Proof 7: Deleting parent A2 cannot enable later direct version delete for A3 in the same transaction
  const recordA2Id = 'a0000000-0000-4000-8000-000000000040';
  const versionA2Id = 'a0000000-0000-4000-8000-000000000041';
  const recordA3Id = 'a0000000-0000-4000-8000-000000000050';
  const versionA3Id = 'a0000000-0000-4000-8000-000000000051';

  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  await client.query(
    `INSERT INTO public.source_records (id, user_id, title, media_type) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8);`,
    [recordA2Id, USER_A_ID, 'Record A2', 'text', recordA3Id, USER_A_ID, 'Record A3', 'text']
  );
  await client.query(
    `INSERT INTO public.source_versions (id, source_id, user_id, version_number, stage, content_hash, plain_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7), ($8, $9, $10, $11, $12, $13, $14);`,
    [versionA2Id, recordA2Id, USER_A_ID, 1, 'raw', 'hash2', 'Version 2', versionA3Id, recordA3Id, USER_A_ID, 1, 'raw', 'hash3', 'Version 3']
  );
  await client.query('COMMIT;');

  let exploitedDeleteRaised42501 = false;
  await client.query('BEGIN;');
  await client.query('SET LOCAL ROLE authenticated;');
  await client.query(`SET LOCAL "request.jwt.claim.sub" = '${USER_A_ID}';`);
  await client.query(`SET LOCAL "request.jwt.claim.role" = 'authenticated';`);
  try {
    await client.query(`DELETE FROM public.source_records WHERE id = $1;`, [recordA2Id]);
    await client.query(`DELETE FROM public.source_versions WHERE id = $1;`, [versionA3Id]);
    await client.query('COMMIT;');
  } catch (err: any) {
    if (err.code === '42501' || String(err).includes('42501') || String(err).includes('append-only')) {
      exploitedDeleteRaised42501 = true;
    }
    await client.query('ROLLBACK;').catch(() => {});
  }
  if (!exploitedDeleteRaised42501) {
    throw new Error('Cascade state exploit failed to be blocked: later direct child delete succeeded within same transaction!');
  }
  details.push('PASS: Proof 7: Deleting parent A2 cannot enable later direct version delete for A3 in the same transaction');

  return details;
}

/**
 * Runs the full disposable-DB PostgreSQL RLS verification suite.
 */
export async function runSourcesRlsProof(options: { strict?: boolean; dbUrl?: string } = {}): Promise<RlsProofResult> {
  const details: string[] = [];
  const isStrict = options.strict ?? (process.env.CI === 'true' || process.argv.includes('--strict'));

  // 1. Verify migration SQL structure and trigger rules
  const sql = readFileSync(MIGRATION_PATH, 'utf8');
  if (!sql.includes('prevent_source_version_mutation') || !sql.includes('active_deleting_source_id')) {
    details.push('FAIL: Migration SQL is missing required append-only or cascade triggers');
    return { executable: true, proven: false, status: 'failed', details };
  }
  details.push('PASS: Migration SQL contains required append-only trigger and isolated cascade controls');

  // 2. Discover local disposable PostgreSQL instance from explicit LOCAL_DISPOSABLE_DB_URL ONLY
  // Do NOT auto-probe or read DATABASE_URL.
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
  } catch (err: any) {
    const scrubbedMsg = sanitizeUrlForDisplay(err.message || String(err));
    details.push(`FAIL-CLOSED: ${scrubbedMsg}`);
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
  } catch (err: any) {
    await client.end().catch(() => {});
    const scrubbedMsg = sanitizeUrlForDisplay(err.message || String(err));
    if (isStrict) {
      details.push(`FAIL-CLOSED: Failed to connect to disposable database: ${scrubbedMsg}`);
      return { executable: true, proven: false, status: 'failed', details };
    }
    details.push(`GATE-STATUS: Could not connect to database: ${scrubbedMsg} (status: skipped_no_db).`);
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
        'PASS: All 7 RLS proof contracts verified against live disposable database',
      ],
    };
  } catch (err: any) {
    await client.end().catch(() => {});
    const scrubbedMsg = sanitizeUrlForDisplay(err.message || String(err));
    details.push(`FAIL: Live database execution error: ${scrubbedMsg}`);
    return { executable: true, proven: false, status: 'failed', details };
  }
}

if (process.argv[1]?.endsWith('test-sources-rls-postgres.ts')) {
  const isStrict = process.argv.includes('--strict') || process.env.CI === 'true';
  runSourcesRlsProof({ strict: isStrict })
    .then((result) => {
      console.log(`[RLS-PROOF] Status: ${result.status} (proven: ${result.proven})`);
      for (const d of result.details) {
        console.log(' -', d);
      }
      if (result.status === 'failed' || (isStrict && !result.proven)) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('[RLS-PROOF] Unexpected error:', sanitizeUrlForDisplay(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    });
}
