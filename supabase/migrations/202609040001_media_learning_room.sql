-- OMNI Media Learning Room Schema & Multi-Tenant RLS Policies (P04)
-- Date: 2026-09-04
-- Constraints: auth.uid() ownership on all tables, cross-row ownership checks,
-- immutable transcript versions with database-owned non-spoofable cascade delete,
-- provenance ownership enforcement, and structural zero raw audio binary/base64 storage.

-- 0. Internal private schema for database-owned non-spoofable cascade tracking
CREATE SCHEMA IF NOT EXISTS omni_internal;
REVOKE ALL ON SCHEMA omni_internal FROM PUBLIC, anon, authenticated;

CREATE UNLOGGED TABLE IF NOT EXISTS omni_internal.active_deleting_media_lessons (
  lesson_id UUID NOT NULL,
  tx_id XID8 NOT NULL,
  PRIMARY KEY (lesson_id, tx_id)
);
REVOKE ALL ON TABLE omni_internal.active_deleting_media_lessons FROM PUBLIC, anon, authenticated;

-- 1. Media Lessons
CREATE TABLE IF NOT EXISTS public.media_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('youtube', 'audio')),
  media_url TEXT NOT NULL,
  youtube_id TEXT,
  channel_title TEXT,
  duration_ms INT NOT NULL DEFAULT 0,
  current_version_id UUID,
  source_record_id UUID REFERENCES public.source_records(id) ON DELETE SET NULL,
  source_version_id UUID REFERENCES public.source_versions(id) ON DELETE SET NULL,
  processing_state TEXT NOT NULL DEFAULT 'queued' CHECK (
    processing_state IN ('queued', 'probing', 'captions', 'transcribing', 'normalizing', 'validating', 'ready', 'degraded', 'unavailable', 'failed', 'needs_review', 'requires_original_audio')
  ),
  transcript_state TEXT CHECK (
    transcript_state IN ('ready', 'unavailable_transcript', 'coverage_insufficient', 'needs_review')
  ),
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_lessons_media_url_no_raw_audio CHECK (
    NOT (lower(media_url) LIKE 'data:%') AND
    NOT (lower(media_url) LIKE '%base64%')
  )
);

-- 2. Media Transcript Versions (immutable append-only)
CREATE TABLE IF NOT EXISTS public.media_transcript_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.media_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  stage TEXT NOT NULL CHECK (stage IN ('raw_caption', 'ai_transcription', 'user_edited', 'normalised')),
  content_hash TEXT NOT NULL,
  normalizer_version TEXT NOT NULL DEFAULT 'v1',
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  coverage_ratio NUMERIC(4,3) NOT NULL DEFAULT 0.000,
  word_count INT NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lesson_id, version_number),
  CONSTRAINT transcript_no_raw_audio CHECK (
    NOT (lower(segments::text) LIKE '%data:audio/%') AND
    NOT (lower(segments::text) LIKE '%base64%')
  )
);

-- 3. Media Shadowing Attempts
CREATE TABLE IF NOT EXISTS public.media_shadowing_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.media_lessons(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL,
  transcript_version_id UUID NOT NULL REFERENCES public.media_transcript_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_duration_ms INT NOT NULL DEFAULT 0,
  acoustic_status TEXT NOT NULL CHECK (acoustic_status IN ('measured', 'unavailable')),
  evaluation JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shadowing_evaluation_schema_valid CHECK (
    evaluation IS NULL OR (
      jsonb_typeof(evaluation) = 'object'
      AND (evaluation ?& ARRAY['overallScore', 'fluencyScore', 'intonationScore', 'accuracyScore', 'feedbackVi', 'swallowedWords', 'stressHighlights', 'acousticStatus'])
      AND ((evaluation - ARRAY['overallScore', 'fluencyScore', 'intonationScore', 'accuracyScore', 'feedbackVi', 'swallowedWords', 'stressHighlights', 'actionableAdviceVi', 'acousticStatus', 'telemetry']) = '{}'::jsonb)
      AND NOT (lower(evaluation::text) LIKE '%data:audio/%')
      AND NOT (lower(evaluation::text) LIKE '%base64%')
    )
  )
);

-- 4. Media Dictation Attempts
CREATE TABLE IF NOT EXISTS public.media_dictation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.media_lessons(id) ON DELETE CASCADE,
  segment_id TEXT NOT NULL,
  transcript_version_id UUID NOT NULL REFERENCES public.media_transcript_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('full_sentence', 'gap_fill', 'word_arrange')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  user_response_text TEXT NOT NULL,
  expected_text TEXT NOT NULL,
  accuracy_score INT NOT NULL CHECK (accuracy_score BETWEEN 0 AND 100),
  diff_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  mistake_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dictation_no_raw_audio CHECK (
    NOT (lower(user_response_text) LIKE 'data:%') AND
    NOT (lower(user_response_text) LIKE '%base64%')
  )
);

-- 5. Media Resume States
CREATE TABLE IF NOT EXISTS public.media_resume_states (
  lesson_id UUID PRIMARY KEY REFERENCES public.media_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  active_segment_id TEXT NOT NULL,
  playback_position_ms INT NOT NULL DEFAULT 0,
  last_mode TEXT NOT NULL CHECK (last_mode IN ('shadowing', 'dictation')),
  playback_speed NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  loop_count INT NOT NULL DEFAULT 1,
  wait_interval_ms INT NOT NULL DEFAULT 0,
  completed_segment_ids TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_lessons_user ON public.media_lessons(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_versions_lesson ON public.media_transcript_versions(lesson_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_media_shadowing_user ON public.media_shadowing_attempts(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_media_dictation_user ON public.media_dictation_attempts(user_id, lesson_id);

-- Enforce Provenance Ownership and Cross-Row Constraints on media_lessons
CREATE OR REPLACE FUNCTION public.enforce_media_lesson_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_owner_id UUID;
BEGIN
  IF v_auth_uid IS NOT NULL AND NEW.user_id <> v_auth_uid THEN
    RAISE EXCEPTION 'Invalid user ownership' USING ERRCODE = '42501';
  END IF;

  v_owner_id := COALESCE(v_auth_uid, NEW.user_id);

  -- 1. If source_record_id is supplied, it must belong to owner
  IF NEW.source_record_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.source_records
      WHERE id = NEW.source_record_id AND user_id = v_owner_id
    ) THEN
      RAISE EXCEPTION 'Invalid source reference' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 2. If source_version_id is supplied, it must belong to source_record_id and owner
  IF NEW.source_version_id IS NOT NULL THEN
    IF NEW.source_record_id IS NULL THEN
      RAISE EXCEPTION 'Invalid source reference' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.source_versions
      WHERE id = NEW.source_version_id
        AND source_id = NEW.source_record_id
        AND user_id = v_owner_id
    ) THEN
      RAISE EXCEPTION 'Invalid source reference' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 3. If current_version_id is supplied, it must belong to this lesson and owner
  IF NEW.current_version_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.media_transcript_versions
      WHERE id = NEW.current_version_id
        AND lesson_id = NEW.id
        AND user_id = v_owner_id
    ) THEN
      RAISE EXCEPTION 'Invalid version reference' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_lessons_enforce_provenance ON public.media_lessons;
CREATE TRIGGER media_lessons_enforce_provenance
  BEFORE INSERT OR UPDATE OF user_id, source_record_id, source_version_id, current_version_id ON public.media_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_media_lesson_provenance();

-- Append-only trigger for media_transcript_versions: blocks direct UPDATE/DELETE
-- Allows parent cascade delete ONLY via database-owned non-spoofable transaction tracking table in omni_internal schema.
CREATE OR REPLACE FUNCTION public.prevent_media_transcript_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, omni_internal, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'media_transcript_versions are append-only; update forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF EXISTS (
      SELECT 1 FROM omni_internal.active_deleting_media_lessons
      WHERE lesson_id = OLD.lesson_id AND tx_id = pg_current_xact_id()
    ) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'media_transcript_versions are append-only; direct delete forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_transcript_versions_append_only ON public.media_transcript_versions;
CREATE TRIGGER media_transcript_versions_append_only
  BEFORE UPDATE OR DELETE ON public.media_transcript_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_media_transcript_version_mutation();

CREATE OR REPLACE FUNCTION public.mark_media_lesson_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, omni_internal, pg_temp
AS $$
BEGIN
  INSERT INTO omni_internal.active_deleting_media_lessons (lesson_id, tx_id)
  VALUES (OLD.id, pg_current_xact_id())
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_media_lesson_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, omni_internal, pg_temp
AS $$
BEGIN
  DELETE FROM omni_internal.active_deleting_media_lessons
  WHERE lesson_id = OLD.id AND tx_id = pg_current_xact_id();
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS media_lessons_before_cascade ON public.media_lessons;
CREATE TRIGGER media_lessons_before_cascade
  BEFORE DELETE ON public.media_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_media_lesson_cascade_delete();

DROP TRIGGER IF EXISTS media_lessons_after_cascade ON public.media_lessons;
CREATE TRIGGER media_lessons_after_cascade
  AFTER DELETE ON public.media_lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_media_lesson_cascade_delete();

-- Row Level Security (RLS) Enforcement
ALTER TABLE public.media_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_transcript_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_shadowing_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_dictation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_resume_states ENABLE ROW LEVEL SECURITY;

-- 1. media_lessons RLS
CREATE POLICY "media_lessons_owner_all" ON public.media_lessons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. media_transcript_versions RLS (requires parent lesson owned by auth.uid())
CREATE POLICY "media_transcript_versions_owner_select" ON public.media_transcript_versions
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "media_transcript_versions_owner_insert" ON public.media_transcript_versions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "media_transcript_versions_owner_update" ON public.media_transcript_versions
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "media_transcript_versions_owner_delete" ON public.media_transcript_versions
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

-- 3. media_shadowing_attempts RLS (requires parent lesson & version owned by auth.uid())
CREATE POLICY "media_shadowing_attempts_owner_select" ON public.media_shadowing_attempts
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      JOIN public.media_transcript_versions v ON v.lesson_id = l.id
      WHERE l.id = lesson_id AND v.id = transcript_version_id AND l.user_id = auth.uid() AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "media_shadowing_attempts_owner_insert" ON public.media_shadowing_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      JOIN public.media_transcript_versions v ON v.lesson_id = l.id
      WHERE l.id = lesson_id AND v.id = transcript_version_id AND l.user_id = auth.uid() AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "media_shadowing_attempts_owner_delete" ON public.media_shadowing_attempts
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

-- 4. media_dictation_attempts RLS (requires parent lesson & version owned by auth.uid())
CREATE POLICY "media_dictation_attempts_owner_select" ON public.media_dictation_attempts
  FOR SELECT USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      JOIN public.media_transcript_versions v ON v.lesson_id = l.id
      WHERE l.id = lesson_id AND v.id = transcript_version_id AND l.user_id = auth.uid() AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "media_dictation_attempts_owner_insert" ON public.media_dictation_attempts
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      JOIN public.media_transcript_versions v ON v.lesson_id = l.id
      WHERE l.id = lesson_id AND v.id = transcript_version_id AND l.user_id = auth.uid() AND v.user_id = auth.uid()
    )
  );

CREATE POLICY "media_dictation_attempts_owner_delete" ON public.media_dictation_attempts
  FOR DELETE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

-- 5. media_resume_states RLS (requires parent lesson owned by auth.uid())
CREATE POLICY "media_resume_states_owner_all" ON public.media_resume_states
  FOR ALL USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.media_lessons l
      WHERE l.id = lesson_id AND l.user_id = auth.uid()
    )
  );

-- Permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_transcript_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_shadowing_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_dictation_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_resume_states TO authenticated;
