-- 1. Source Records
CREATE TABLE IF NOT EXISTS public.source_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL CHECK (media_type IN ('text', 'pdf', 'docx', 'url', 'youtube', 'audio', 'vtt_srt', 'chart_image')),
  collection_ids UUID[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_version_id UUID,
  processing_state TEXT NOT NULL DEFAULT 'queued' CHECK (processing_state IN ('queued', 'processing', 'ready', 'degraded', 'failed', 'rejected', 'unavailable', 'handoff_required')),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Source Versions (append-only; UNIQUE(source_id, version_number))
CREATE TABLE IF NOT EXISTS public.source_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.source_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  stage TEXT NOT NULL CHECK (stage IN ('raw', 'normalised', 'edited')),
  content_hash TEXT NOT NULL,
  plain_text TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  word_count INT NOT NULL DEFAULT 0,
  page_count INT,
  duration_ms INT,
  media_url TEXT,
  extraction_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, version_number)
);

-- 3. Source Collections
CREATE TABLE IF NOT EXISTS public.source_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'vermilion',
  icon TEXT NOT NULL DEFAULT 'folder',
  description TEXT,
  source_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Source Artifact Jobs
CREATE TABLE IF NOT EXISTS public.source_artifact_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_version_id UUID NOT NULL REFERENCES public.source_versions(id) ON DELETE CASCADE,
  selection JSONB,
  destination TEXT NOT NULL CHECK (destination IN ('practice', 'mock_section', 'vocabulary_deck', 'note', 'idea_bank')),
  target_band NUMERIC(3,1) NOT NULL DEFAULT 7.0,
  custom_instruction TEXT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'validating', 'ready', 'needs_review', 'retry_wait', 'rejected', 'failed', 'cancelled')),
  artifact_draft JSONB,
  destination_handoff JSONB NOT NULL DEFAULT '{"status": "pending"}'::jsonb,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE public.source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_artifact_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "source_records_owner_all" ON public.source_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "source_collections_owner_all" ON public.source_collections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Versions: select/insert only when the parent source_records row belongs to auth.uid().
-- No UPDATE policy. DELETE is allowed by RLS only so parent ON DELETE CASCADE can fire;
-- prevent_source_version_mutation still rejects direct DELETE/UPDATE.
CREATE POLICY "source_versions_owner_select" ON public.source_versions
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_records r
      WHERE r.id = source_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "source_versions_owner_insert" ON public.source_versions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_records r
      WHERE r.id = source_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "source_versions_cascade_delete" ON public.source_versions
  FOR DELETE USING (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM public.source_records r
        WHERE r.id = source_id AND r.user_id = auth.uid()
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.source_records r WHERE r.id = source_id
      )
    )
  );

-- Artifact jobs must resolve to a source_version whose source_record is owned by auth.uid().
CREATE POLICY "source_artifact_jobs_owner_select" ON public.source_artifact_jobs
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_versions v
      JOIN public.source_records r ON r.id = v.source_id
      WHERE v.id = source_version_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "source_artifact_jobs_owner_insert" ON public.source_artifact_jobs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_versions v
      JOIN public.source_records r ON r.id = v.source_id
      WHERE v.id = source_version_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "source_artifact_jobs_owner_update" ON public.source_artifact_jobs
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_versions v
      JOIN public.source_records r ON r.id = v.source_id
      WHERE v.id = source_version_id AND r.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_versions v
      JOIN public.source_records r ON r.id = v.source_id
      WHERE v.id = source_version_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "source_artifact_jobs_owner_delete" ON public.source_artifact_jobs
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.source_versions v
      JOIN public.source_records r ON r.id = v.source_id
      WHERE v.id = source_version_id AND r.user_id = auth.uid()
    )
  );

-- Append-only versions: block direct UPDATE/DELETE. Parent delete sets omni.sources_cascade
-- so the ON DELETE CASCADE path is permitted.
CREATE OR REPLACE FUNCTION public.prevent_source_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('omni.sources_cascade', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'source_versions are append-only'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS source_versions_append_only ON public.source_versions;
CREATE TRIGGER source_versions_append_only
  BEFORE UPDATE OR DELETE ON public.source_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_source_version_mutation();

CREATE OR REPLACE FUNCTION public.mark_source_record_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('omni.sources_cascade', 'on', true);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS source_records_before_delete ON public.source_records;
CREATE TRIGGER source_records_before_delete
  BEFORE DELETE ON public.source_records
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_source_record_cascade_delete();
