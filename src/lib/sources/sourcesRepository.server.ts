import { createClient } from '@supabase/supabase-js';
import type {
  SourceArtifactJob,
  SourceCollection,
  SourceRecord,
  SourceVersion,
  VersionStage,
  SourceMediaType,
  SourceProcessingState,
  SourceProvenance,
} from '../../types/sources';
import type { LearnerAuthResult, SourcesRepository, SourceHydrationResult } from './groundedChat';
import { SourceVersionConflictError, SourceVersionEditError } from './versioning';

export function resolveSourcesSupabaseConfig(env: Record<string, string | undefined>): {
  supabaseUrl: string;
  supabaseAnonKey: string;
  configured: boolean;
} {
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
  const supabaseAnonKey = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
  return {
    supabaseUrl,
    supabaseAnonKey,
    configured: Boolean(supabaseUrl && supabaseAnonKey),
  };
}

const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isServiceRoleKey(anonKey: string): boolean {
  if (!JWT_SHAPE.test(anonKey)) return /service_role/i.test(anonKey);
  const payload = decodeJwtPayload(anonKey);
  return payload?.role === 'service_role' || payload?.role === 'supabase_admin';
}

function isAuthRejection(error: { status?: number; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const message = (error.message || '').toLowerCase();
  return message.includes('invalid jwt')
    || message.includes('invalid token')
    || message.includes('malformed')
    || message.includes('expired')
    || message.includes('jwt')
    || message.includes('unauthorized')
    || message.includes('unauthenticated');
}

export async function verifyLearnerAccessToken(input: {
  accessToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  getUser?: (jwt: string) => Promise<{
    user: { id: string } | null;
    error: { status?: number; message?: string } | null;
  }>;
}): Promise<LearnerAuthResult> {
  const accessToken = input.accessToken.trim();
  if (!accessToken || !JWT_SHAPE.test(accessToken)) return { status: 'auth_required' };
  if (!input.supabaseUrl.trim() || !input.supabaseAnonKey.trim()) return { status: 'unavailable' };
  if (isServiceRoleKey(input.supabaseAnonKey)) return { status: 'unavailable' };

  const getUser = input.getUser || (async (jwt: string) => {
    const client = createClient(input.supabaseUrl, input.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.getUser(jwt);
    return {
      user: data.user ? { id: data.user.id } : null,
      error: error ? { status: (error as { status?: number }).status, message: error.message } : null,
    };
  });

  try {
    const { user, error } = await getUser(accessToken);
    if (error) return isAuthRejection(error) ? { status: 'auth_required' } : { status: 'unavailable' };
    if (!user?.id) return { status: 'auth_required' };
    return { status: 'ok', userId: user.id, accessToken };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isAuthRejection({ message })) return { status: 'auth_required' };
    return { status: 'unavailable' };
  }
}

function recordFromRow(row: Record<string, unknown>): SourceRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    summary: String(row.summary ?? ''),
    type: row.media_type as SourceMediaType,
    collectionIds: Array.isArray(row.collection_ids) ? row.collection_ids.map(String) : [],
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    provenance: (row.provenance ?? {}) as SourceProvenance,
    currentVersionId: row.current_version_id ? String(row.current_version_id) : '',
    processingState: row.processing_state as SourceProcessingState,
    lastUsedAt: String(row.last_used_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function versionFromRow(row: Record<string, unknown>): SourceVersion {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    versionNumber: Number(row.version_number),
    stage: row.stage as VersionStage,
    contentHash: String(row.content_hash),
    plainText: String(row.plain_text ?? ''),
    blocks: Array.isArray(row.blocks) ? row.blocks as SourceVersion['blocks'] : [],
    wordCount: Number(row.word_count ?? 0),
    pageCount: row.page_count == null ? undefined : Number(row.page_count),
    durationMs: row.duration_ms == null ? undefined : Number(row.duration_ms),
    mediaUrl: row.media_url == null ? undefined : String(row.media_url),
    extractionReport: row.extraction_report as SourceVersion['extractionReport'],
    createdAt: String(row.created_at),
  };
}

function collectionFromRow(row: Record<string, unknown>): SourceCollection {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    color: String(row.color ?? 'vermilion'),
    icon: String(row.icon ?? 'folder'),
    description: row.description == null ? undefined : String(row.description),
    sourceIds: Array.isArray(row.source_ids) ? row.source_ids.map(String) : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastUsedAt: String(row.last_used_at),
  };
}

function artifactJobFromRow(row: Record<string, unknown>): SourceArtifactJob {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sourceVersionId: String(row.source_version_id),
    selection: row.selection && typeof row.selection === 'object'
      ? row.selection as SourceArtifactJob['selection']
      : undefined,
    destination: row.destination as SourceArtifactJob['destination'],
    targetBand: Number(row.target_band),
    customInstruction: row.custom_instruction == null ? undefined : String(row.custom_instruction),
    state: row.state as SourceArtifactJob['state'],
    artifactDraft: row.artifact_draft && typeof row.artifact_draft === 'object'
      ? row.artifact_draft as SourceArtifactJob['artifactDraft']
      : undefined,
    destinationHandoff: row.destination_handoff && typeof row.destination_handoff === 'object'
      ? row.destination_handoff as SourceArtifactJob['destinationHandoff']
      : undefined,
    error: row.error_details && typeof row.error_details === 'object'
      ? row.error_details as SourceArtifactJob['error']
      : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function recordRow(record: SourceRecord) {
  return {
    id: record.id,
    user_id: record.userId,
    title: record.title,
    summary: record.summary,
    media_type: record.type,
    collection_ids: record.collectionIds,
    tags: record.tags,
    provenance: record.provenance,
    current_version_id: record.currentVersionId || null,
    processing_state: record.processingState,
    last_used_at: record.lastUsedAt,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function versionRow(version: SourceVersion, userId: string) {
  return {
    id: version.id,
    source_id: version.sourceId,
    user_id: userId,
    version_number: version.versionNumber,
    stage: version.stage,
    content_hash: version.contentHash,
    plain_text: version.plainText,
    blocks: version.blocks,
    word_count: version.wordCount,
    page_count: version.pageCount ?? null,
    duration_ms: version.durationMs ?? null,
    media_url: version.mediaUrl ?? null,
    extraction_report: version.extractionReport ?? {},
    created_at: version.createdAt,
  };
}

function collectionRow(collection: SourceCollection) {
  return {
    id: collection.id,
    user_id: collection.userId,
    name: collection.name,
    color: collection.color,
    icon: collection.icon,
    description: collection.description ?? null,
    source_ids: collection.sourceIds,
    created_at: collection.createdAt,
    updated_at: collection.updatedAt,
    last_used_at: collection.lastUsedAt,
  };
}

function artifactJobRow(job: SourceArtifactJob) {
  return {
    id: job.id,
    user_id: job.userId,
    source_version_id: job.sourceVersionId,
    selection: job.selection ?? null,
    destination: job.destination,
    target_band: job.targetBand,
    custom_instruction: job.customInstruction ?? null,
    state: job.state,
    artifact_draft: job.artifactDraft ?? null,
    destination_handoff: job.destinationHandoff ?? { status: 'pending' },
    error_details: job.error ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

export type SourcesLibrarySnapshot = {
  records: SourceRecord[];
  collections: SourceCollection[];
};

export type CreateEditedVersionInput = {
  sourceId: string;
  baseVersionId: string;
  editedText: string;
  userId: string;
};

export type CreateEditedVersionResult = {
  sourceRecord: SourceRecord;
  sourceVersion: SourceVersion;
};

export interface SourcesPersistenceRepository extends SourcesRepository {
  listLibrary(): Promise<SourcesLibrarySnapshot>;
  getVersionById(versionId: string): Promise<SourceVersion | undefined>;
  listVersionsBySource(sourceId: string): Promise<SourceVersion[]>;
  createEditedVersion(input: CreateEditedVersionInput): Promise<CreateEditedVersionResult>;
  saveRecord(record: SourceRecord): Promise<SourceRecord>;
  saveVersion(version: SourceVersion, userId: string): Promise<SourceVersion>;
  updateRecord(record: SourceRecord): Promise<SourceRecord>;
  saveCollection(collection: SourceCollection): Promise<SourceCollection>;
  saveArtifactJob(job: SourceArtifactJob): Promise<SourceArtifactJob>;
  getArtifactJob(jobId: string): Promise<SourceArtifactJob | undefined>;
}

export function createLearnerJwtSourcesRepository(input: {
  accessToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}): SourcesPersistenceRepository {
  const client = createClient(input.supabaseUrl, input.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
  });

  const repository: SourcesPersistenceRepository = {
    async getSelectedVersions(selectedVersionIds): Promise<SourceHydrationResult> {
      const ids = [...new Set(selectedVersionIds)];
      if (!ids.length) return { status: 'selection_unavailable' };
      try {
        const { data: versionRows, error: versionError } = await client
          .from('source_versions')
          .select('id, source_id, version_number, stage, content_hash, plain_text, blocks, word_count, page_count, duration_ms, media_url, extraction_report, created_at')
          .in('id', ids);
        if (versionError) return { status: 'unavailable' };
        if (!versionRows || versionRows.length !== ids.length) return { status: 'selection_unavailable' };

        const versions = versionRows.map((row) => versionFromRow(row as Record<string, unknown>));
        const sourceIds = [...new Set(versions.map((version) => version.sourceId))];
        const { data: recordRows, error: recordError } = await client
          .from('source_records')
          .select('id, user_id, title, summary, media_type, collection_ids, tags, provenance, current_version_id, processing_state, last_used_at, created_at, updated_at')
          .in('id', sourceIds);
        if (recordError) return { status: 'unavailable' };
        if (!recordRows || recordRows.length !== sourceIds.length) return { status: 'selection_unavailable' };

        const records = recordRows.map((row) => recordFromRow(row as Record<string, unknown>));
        const recordById = new Map(records.map((record) => [record.id, record]));
        const versionById = new Map(versions.map((version) => [version.id, version]));
        const items = [];
        for (const id of ids) {
          const version = versionById.get(id);
          const record = version ? recordById.get(version.sourceId) : undefined;
          if (!version || !record) return { status: 'selection_unavailable' };
          items.push({ version, record });
        }
        return { status: 'ok', items };
      } catch {
        return { status: 'unavailable' };
      }
    },

    async listLibrary(): Promise<SourcesLibrarySnapshot> {
      const { data: recordRows, error: recordError } = await client
        .from('source_records')
        .select('id, user_id, title, summary, media_type, collection_ids, tags, provenance, current_version_id, processing_state, last_used_at, created_at, updated_at')
        .order('updated_at', { ascending: false });
      if (recordError) throw recordError;

      const { data: collectionRows, error: collectionError } = await client
        .from('source_collections')
        .select('id, user_id, name, color, icon, description, source_ids, created_at, updated_at, last_used_at')
        .order('updated_at', { ascending: false });
      if (collectionError) throw collectionError;

      return {
        records: (recordRows ?? []).map((row) => recordFromRow(row as Record<string, unknown>)),
        collections: (collectionRows ?? []).map((row) => collectionFromRow(row as Record<string, unknown>)),
      };
    },

    async getVersionById(versionId: string): Promise<SourceVersion | undefined> {
      const { data, error } = await client
        .from('source_versions')
        .select('id, source_id, version_number, stage, content_hash, plain_text, blocks, word_count, page_count, duration_ms, media_url, extraction_report, created_at')
        .eq('id', versionId)
        .maybeSingle();
      if (error) throw error;
      return data ? versionFromRow(data as Record<string, unknown>) : undefined;
    },

    async listVersionsBySource(sourceId: string): Promise<SourceVersion[]> {
      const { data, error } = await client
        .from('source_versions')
        .select('id, source_id, version_number, stage, content_hash, plain_text, blocks, word_count, page_count, duration_ms, media_url, extraction_report, created_at')
        .eq('source_id', sourceId)
        .order('version_number', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => versionFromRow(row as Record<string, unknown>));
    },

    async createEditedVersion(input: CreateEditedVersionInput): Promise<CreateEditedVersionResult> {
      const { data, error } = await client.rpc('append_source_edited_version', {
        p_source_id: input.sourceId,
        p_base_version_id: input.baseVersionId,
        p_edited_text: input.editedText,
      });
      if (error) {
        if (error.code === 'P0001' && /VERSION_CONFLICT/i.test(error.message)) {
          throw new SourceVersionConflictError();
        }
        if (error.code === 'P0001' && /RESOURCE_LIMIT_EXCEEDED/i.test(error.message)) {
          throw new SourceVersionEditError('RESOURCE_LIMIT_EXCEEDED', 'Edited source text exceeds the safe limit.');
        }
        if (error.code === 'P0001' && /INVALID_INPUT/i.test(error.message)) {
          throw new SourceVersionEditError('INVALID_INPUT', 'Edited source text is invalid.');
        }
        throw error;
      }

      const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
      if (!row) throw new SourceVersionConflictError();
      const sourceVersion = versionFromRow(row);
      if (sourceVersion.sourceId !== input.sourceId || sourceVersion.stage !== 'edited') {
        throw new SourceVersionConflictError();
      }

      const { data: recordData, error: recordError } = await client
        .from('source_records')
        .select('id, user_id, title, summary, media_type, collection_ids, tags, provenance, current_version_id, processing_state, last_used_at, created_at, updated_at')
        .eq('id', input.sourceId)
        .maybeSingle();
      if (recordError) throw recordError;
      if (!recordData) throw new SourceVersionConflictError();
      const sourceRecord = recordFromRow(recordData as Record<string, unknown>);
      if (sourceRecord.userId !== input.userId || sourceRecord.currentVersionId !== sourceVersion.id) {
        throw new SourceVersionConflictError();
      }
      return { sourceRecord, sourceVersion };
    },

    async saveRecord(record: SourceRecord): Promise<SourceRecord> {
      const { error } = await client.from('source_records').upsert(recordRow(record));
      if (error) throw error;
      return record;
    },

    async saveVersion(version: SourceVersion, userId: string): Promise<SourceVersion> {
      const { error } = await client.from('source_versions').insert(versionRow(version, userId));
      if (error) throw error;
      return version;
    },

    async updateRecord(record: SourceRecord): Promise<SourceRecord> {
      const { error } = await client
        .from('source_records')
        .update(recordRow(record))
        .eq('id', record.id);
      if (error) throw error;
      return record;
    },

    async saveCollection(collection: SourceCollection): Promise<SourceCollection> {
      const { error } = await client.from('source_collections').upsert(collectionRow(collection));
      if (error) throw error;
      return collection;
    },

    async saveArtifactJob(job: SourceArtifactJob): Promise<SourceArtifactJob> {
      const { error } = await client.from('source_artifact_jobs').upsert(artifactJobRow(job));
      if (error) throw error;
      return job;
    },

    async getArtifactJob(jobId: string): Promise<SourceArtifactJob | undefined> {
      const { data, error } = await client
        .from('source_artifact_jobs')
        .select('id, user_id, source_version_id, selection, destination, target_band, custom_instruction, state, artifact_draft, destination_handoff, error_details, created_at, updated_at')
        .eq('id', jobId)
        .maybeSingle();
      if (error) throw error;
      return data ? artifactJobFromRow(data as Record<string, unknown>) : undefined;
    },
  };

  return repository;
}
