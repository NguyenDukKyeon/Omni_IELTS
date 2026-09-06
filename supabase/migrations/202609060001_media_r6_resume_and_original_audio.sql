-- OMNI Media Learning Room: R6 Resume State and Original Audio Schema Evolution (P04.A)
-- Date: 2026-09-06
-- Scope: Additive migration for R6 decision closure.
-- Invariants:
--   1. media_lessons: relaxes media_url NOT NULL to support local-only audio sources.
--      Adds original_filename and 64-hex source_hash. Replaces media_url check to forbid
--      blob:, data:, and raw audio binaries while requiring valid HTTP(S) for YouTube.
--   2. media_resume_states: relaxes active_segment_id NOT NULL.
--      Adds transcript_version_id, studio_mode, and assistance_mode.
--      Preserves legacy last_mode for backward compatibility with bidirectional synchronization.
--      Backfills legacy rows: synchronizes modes and clears orphaned segments where version is NULL.
--      Enforces strict version binding: active_segment_id and completed_segment_ids require an owned transcript version.
--      Validates that referenced active and completed segments exist in the exact version.

-- 1. Evolve media_lessons for local original audio representation
ALTER TABLE public.media_lessons ALTER COLUMN media_url DROP NOT NULL;

ALTER TABLE public.media_lessons
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

ALTER TABLE public.media_lessons
  DROP CONSTRAINT IF EXISTS media_lessons_media_url_no_raw_audio;

ALTER TABLE public.media_lessons
  ADD CONSTRAINT media_lessons_original_filename_check CHECK (
    original_filename IS NULL OR (
      length(original_filename) BETWEEN 1 AND 255 AND
      original_filename !~ '[/\\]' AND
      public.is_clean_media_text(original_filename)
    )
  ),
  ADD CONSTRAINT media_lessons_source_hash_check CHECK (
    source_hash IS NULL OR source_hash ~ '^[a-f0-9]{64}$'
  ),
  ADD CONSTRAINT media_lessons_media_url_source_check CHECK (
    CASE
      WHEN media_type = 'youtube' THEN
        media_url IS NOT NULL AND
        media_url ~ '^https?://[^\s]+$' AND
        length(media_url) BETWEEN 10 AND 2048 AND
        media_url !~* 'data:' AND
        media_url !~* 'base64' AND
        media_url !~ '(UklGR|GkXf|SUQz|T2dn)' AND
        media_url !~* '^blob:'
      WHEN media_type = 'audio' THEN
        (media_url IS NULL OR (
          media_url ~ '^https?://[^\s]+$' AND
          length(media_url) BETWEEN 10 AND 2048 AND
          media_url !~* 'data:' AND
          media_url !~* 'base64' AND
          media_url !~ '(UklGR|GkXf|SUQz|T2dn)' AND
          media_url !~* '^blob:'
        ))
      ELSE false
    END
  );

-- 2. Evolve media_resume_states for version binding and mode decoupling
ALTER TABLE public.media_resume_states
  ALTER COLUMN active_segment_id DROP NOT NULL,
  ALTER COLUMN last_mode DROP NOT NULL;

ALTER TABLE public.media_resume_states
  ADD COLUMN IF NOT EXISTS transcript_version_id UUID REFERENCES public.media_transcript_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS studio_mode TEXT CHECK (studio_mode IN ('shadowing', 'dictation')),
  ADD COLUMN IF NOT EXISTS assistance_mode TEXT NOT NULL DEFAULT 'guided' CHECK (assistance_mode IN ('guided', 'independent'));

-- 3. Backfill existing legacy rows safely without fabricating provenance
UPDATE public.media_resume_states
SET studio_mode = last_mode
WHERE studio_mode IS NULL AND last_mode IS NOT NULL;

UPDATE public.media_resume_states
SET last_mode = studio_mode
WHERE last_mode IS NULL AND studio_mode IS NOT NULL;

UPDATE public.media_resume_states
SET active_segment_id = NULL,
    completed_segment_ids = '{}'
WHERE transcript_version_id IS NULL;

-- 4. Add check constraints on media_resume_states
ALTER TABLE public.media_resume_states
  ADD CONSTRAINT media_resume_states_mode_required CHECK (
    studio_mode IS NOT NULL OR last_mode IS NOT NULL
  ),
  ADD CONSTRAINT media_resume_states_active_segment_requires_version CHECK (
    transcript_version_id IS NOT NULL OR active_segment_id IS NULL
  ),
  ADD CONSTRAINT media_resume_states_completed_segments_requires_version CHECK (
    transcript_version_id IS NOT NULL OR completed_segment_ids = '{}'
  ),
  ADD CONSTRAINT media_resume_states_playback_speed_bounds CHECK (
    playback_speed >= 0.50 AND playback_speed <= 2.00
  ),
  ADD CONSTRAINT media_resume_states_loop_count_bounds CHECK (
    loop_count >= 1 AND loop_count <= 10
  ),
  ADD CONSTRAINT media_resume_states_wait_interval_bounds CHECK (
    wait_interval_ms >= 0
  ),
  ADD CONSTRAINT media_resume_states_playback_position_bounds CHECK (
    playback_position_ms >= 0
  );

-- 5. Indexes for resume state lookups
CREATE INDEX IF NOT EXISTS idx_media_resume_user_lesson ON public.media_resume_states(user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_media_resume_version ON public.media_resume_states(transcript_version_id);

-- 6. Trigger to enforce tenant ownership, version binding, and segment membership on media_resume_states
CREATE OR REPLACE FUNCTION omni_internal.enforce_media_resume_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, omni_internal, pg_temp
AS $$
DECLARE
  v_auth_uid UUID := auth.uid();
  v_owner_id UUID;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'media_resume_states' THEN
    RAISE EXCEPTION 'Invalid trigger execution context' USING ERRCODE = '42501';
  END IF;

  IF v_auth_uid IS NOT NULL AND NEW.user_id <> v_auth_uid THEN
    RAISE EXCEPTION 'Invalid user ownership' USING ERRCODE = '42501';
  END IF;

  v_owner_id := COALESCE(v_auth_uid, NEW.user_id);

  -- 1. Lesson ownership check
  IF NOT EXISTS (
    SELECT 1 FROM public.media_lessons l
    WHERE l.id = NEW.lesson_id AND l.user_id = v_owner_id
  ) THEN
    RAISE EXCEPTION 'Invalid lesson reference' USING ERRCODE = '42501';
  END IF;

  -- 2. Synchronize studio_mode and last_mode for backward compatibility
  IF NEW.studio_mode IS NULL AND NEW.last_mode IS NOT NULL THEN
    NEW.studio_mode := NEW.last_mode;
  ELSIF NEW.last_mode IS NULL AND NEW.studio_mode IS NOT NULL THEN
    NEW.last_mode := NEW.studio_mode;
  ELSIF NEW.studio_mode IS NULL AND NEW.last_mode IS NULL THEN
    NEW.studio_mode := 'shadowing';
    NEW.last_mode := 'shadowing';
  END IF;

  IF NEW.assistance_mode IS NULL THEN
    NEW.assistance_mode := 'guided';
  END IF;

  -- 3. Version binding validation
  IF NEW.transcript_version_id IS NULL THEN
    IF NEW.active_segment_id IS NOT NULL THEN
      RAISE EXCEPTION 'activeSegmentId requires a non-null transcriptVersionId' USING ERRCODE = '42501';
    END IF;

    IF NEW.completed_segment_ids IS NOT NULL AND array_length(NEW.completed_segment_ids, 1) > 0 THEN
      RAISE EXCEPTION 'completedSegmentIds must be empty when transcriptVersionId is null' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Version must exist, belong to the referenced lesson, and belong to the owner
    IF NOT EXISTS (
      SELECT 1 FROM public.media_transcript_versions v
      WHERE v.id = NEW.transcript_version_id
        AND v.lesson_id = NEW.lesson_id
        AND v.user_id = v_owner_id
    ) THEN
      RAISE EXCEPTION 'Invalid transcript version reference' USING ERRCODE = '42501';
    END IF;

    -- If active_segment_id is set, it must exist in the segments array of transcript_version_id
    IF NEW.active_segment_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.media_transcript_versions v
        WHERE v.id = NEW.transcript_version_id
          AND v.lesson_id = NEW.lesson_id
          AND v.user_id = v_owner_id
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(v.segments) AS s
            WHERE s->>'id' = NEW.active_segment_id
          )
      ) THEN
        RAISE EXCEPTION 'Invalid segment reference' USING ERRCODE = '42501';
      END IF;
    END IF;

    -- If completed_segment_ids is non-empty, all segments must exist in the transcript_version_id
    IF NEW.completed_segment_ids IS NOT NULL AND array_length(NEW.completed_segment_ids, 1) > 0 THEN
      IF EXISTS (
        SELECT 1
        FROM unnest(NEW.completed_segment_ids) AS seg_id
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.media_transcript_versions v,
               jsonb_array_elements(v.segments) AS s
          WHERE v.id = NEW.transcript_version_id
            AND v.lesson_id = NEW.lesson_id
            AND v.user_id = v_owner_id
            AND s->>'id' = seg_id
        )
      ) THEN
        RAISE EXCEPTION 'Invalid completed segment reference' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS media_resume_states_enforce_invariants ON public.media_resume_states;
CREATE TRIGGER media_resume_states_enforce_invariants
  BEFORE INSERT OR UPDATE ON public.media_resume_states
  FOR EACH ROW
  EXECUTE FUNCTION omni_internal.enforce_media_resume_invariants();
