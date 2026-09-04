-- OMNI Media Learning Room Schema & Multi-Tenant RLS Policies (P04)
-- Date: 2026-09-04
-- Constraints: auth.uid() ownership on all tables, cross-row ownership checks,
-- immutable transcript versions with safe cascade delete, zero raw audio binary/base64 storage.

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
    processing_state IN ('queued', 'probing', 'captions', 'transcribing', 'normalizing', 'validating', 'ready', 'degraded', 'unavailable', 'failed')
  ),
  transcript_state TEXT CHECK (
    transcript_state IN ('ready', 'unavailable_transcript', 'coverage_insufficient', 'needs_review')
  ),
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    NOT (segments::text LIKE '%data:audio/%')
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
  CONSTRAINT no_raw_audio_binary CHECK (
    evaluation IS NULL OR (
      NOT (evaluation::text LIKE '%data:audio/%') AND
      NOT (evaluation::text LIKE '%base64%')
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
    NOT (user_response_text LIKE '%data:audio/%') AND
    NOT (user_response_text LIKE '%base64%')
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

-- Append-only trigger for media_transcript_versions: blocks direct UPDATE/DELETE
-- Allows parent cascade delete through session-scoped active deleting lesson marker.
CREATE OR REPLACE FUNCTION public.prevent_media_transcript_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'media_transcript_versions are append-only; update forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF current_setting('omni.active_deleting_media_lesson_id', true) = OLD.lesson_id::text THEN
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
AS $$
BEGIN
  PERFORM set_config('omni.active_deleting_media_lesson_id', OLD.id::text, true);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_media_lesson_cascade_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('omni.active_deleting_media_lesson_id', '', true);
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
