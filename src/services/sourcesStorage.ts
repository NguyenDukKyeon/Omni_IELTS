import { supabase } from './supabase';
import type {
  SourceArtifactJob,
  SourceCollection,
  SourceMediaType,
  SourceProcessingState,
  SourceProvenance,
  SourceRecord,
  SourceVersion,
  VersionStage,
} from '../types/sources';

type MemoryCache = {
  records: Map<string, SourceRecord>;
  versions: Map<string, SourceVersion>;
  collections: Map<string, SourceCollection>;
  jobs: Map<string, SourceArtifactJob>;
};

const memory: MemoryCache = {
  records: new Map(),
  versions: new Map(),
  collections: new Map(),
  jobs: new Map(),
};

const IDB_NAME = 'omni-sources-library-v1';
const IDB_STORE = 'snapshot';

export class SourceVersionConflictError extends Error {
  readonly code = 'VERSION_CONFLICT';

  constructor(message = 'Source version already exists and cannot be overwritten.') {
    super(message);
    this.name = 'SourceVersionConflictError';
  }
}

function idbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function persistNativeCache(): Promise<void> {
  if (!idbAvailable()) return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IDB_STORE)) {
        request.result.createObjectStore(IDB_STORE);
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({
        records: [...memory.records.values()],
        versions: [...memory.versions.values()],
        collections: [...memory.collections.values()],
        jobs: [...memory.jobs.values()],
      }, 'all');
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
  });
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

function versionFromRow(row: Record<string, unknown>): SourceVersion {
  return {
    id: String(row.id),
    sourceId: String(row.source_id),
    versionNumber: Number(row.version_number),
    stage: row.stage as VersionStage,
    contentHash: String(row.content_hash),
    plainText: String(row.plain_text),
    blocks: Array.isArray(row.blocks) ? row.blocks as SourceVersion['blocks'] : [],
    wordCount: Number(row.word_count ?? 0),
    pageCount: row.page_count == null ? undefined : Number(row.page_count),
    durationMs: row.duration_ms == null ? undefined : Number(row.duration_ms),
    mediaUrl: row.media_url == null ? undefined : String(row.media_url),
    extractionReport: row.extraction_report as SourceVersion['extractionReport'],
    createdAt: String(row.created_at),
  };
}

function hasVersionConflict(version: SourceVersion): boolean {
  if (memory.versions.has(version.id)) return true;
  return [...memory.versions.values()].some(
    (existing) => existing.sourceId === version.sourceId && existing.versionNumber === version.versionNumber,
  );
}

export const sourcesStorage = {
  async saveRecord(record: SourceRecord): Promise<SourceRecord> {
    memory.records.set(record.id, record);
    if (supabase) {
      const { error } = await supabase.from('source_records').upsert(recordRow(record));
      if (error) throw error;
    }
    await persistNativeCache();
    return record;
  },

  async saveVersion(version: SourceVersion, userId: string): Promise<SourceVersion> {
    if (hasVersionConflict(version)) {
      throw new SourceVersionConflictError();
    }
    if (supabase) {
      const { error } = await supabase.from('source_versions').insert(versionRow(version, userId));
      if (error) {
        if (error.code === '23505') throw new SourceVersionConflictError();
        throw error;
      }
    }
    memory.versions.set(version.id, version);
    await persistNativeCache();
    return version;
  },

  async saveCollection(collection: SourceCollection): Promise<SourceCollection> {
    memory.collections.set(collection.id, collection);
    if (supabase) {
      const { error } = await supabase.from('source_collections').upsert({
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
      });
      if (error) throw error;
    }
    await persistNativeCache();
    return collection;
  },

  async saveArtifactJob(job: SourceArtifactJob): Promise<SourceArtifactJob> {
    memory.jobs.set(job.id, job);
    if (supabase) {
      const { error } = await supabase.from('source_artifact_jobs').upsert({
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
      });
      if (error) throw error;
    }
    await persistNativeCache();
    return job;
  },

  async listRecords(userId: string): Promise<SourceRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('source_records')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      if (data) return data.map((row) => recordFromRow(row as Record<string, unknown>));
    }
    return [...memory.records.values()].filter((record) => record.userId === userId);
  },

  async listVersions(sourceId: string): Promise<SourceVersion[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('source_versions')
        .select('*')
        .eq('source_id', sourceId);
      if (error) throw error;
      if (data) return data.map((row) => versionFromRow(row as Record<string, unknown>));
    }
    return [...memory.versions.values()].filter((version) => version.sourceId === sourceId);
  },

  getCachedRecord(id: string): SourceRecord | undefined {
    return memory.records.get(id);
  },

  getCachedVersion(id: string): SourceVersion | undefined {
    return memory.versions.get(id);
  },
};
