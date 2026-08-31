import { createClient } from '@supabase/supabase-js';
import type { SourceRecord, SourceVersion, VersionStage, SourceMediaType, SourceProcessingState, SourceProvenance } from '../../types/sources';
import type { SourcesRepository, SourceHydrationResult } from './groundedChat';

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

export function createLearnerJwtSourcesRepository(input: {
  accessToken: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}): SourcesRepository {
  const client = createClient(input.supabaseUrl, input.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${input.accessToken}` } },
  });

  return {
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
  };
}
