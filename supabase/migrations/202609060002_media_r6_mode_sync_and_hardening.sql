-- OMNI Media Learning Room: R6 Mode Synchronization and Trigger Hardening Correction (P04.A)
-- Date: 2026-09-06
-- Scope: Additive corrective migration following 202609060001_media_r6_resume_and_original_audio.sql.
-- Invariants enforced:
--   1. Pre-migration check: Aborts with error 22000 if existing database has conflicting
--      (desynchronized) studio_mode and last_mode rows; refuses to guess learner intent.
--   2. Enforces table constraint media_resume_states_modes_consistent (studio_mode IS NOT DISTINCT FROM last_mode).
--   3. Trigger omni_internal.enforce_media_resume_invariants():
--      - Adds TG_OP guard checking for ('INSERT', 'UPDATE').
--      - Correctly synchronizes single-field updates:
--        * UPDATE SET studio_mode = X updates last_mode to X.
--        * UPDATE SET last_mode = X updates studio_mode to X.
--      - Rejects conflicting mode writes on INSERT and UPDATE with 42501 error.
--      - Rejects empty or null segment IDs in completed_segment_ids.
--   4. Explicit security hardening: REVOKE ALL ON FUNCTION from PUBLIC, anon, authenticated.

-- 1. Pre-migration desynchronization detection
DO $$
DECLARE
  v_desync_count INT;
BEGIN
  SELECT COUNT(*) INTO v_desync_count
  FROM public.media_resume_states
  WHERE studio_mode IS NOT NULL
    AND last_mode IS NOT NULL
    AND studio_mode IS DISTINCT FROM last_mode;

  IF v_desync_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION_HALTED: Found % media_resume_states rows with conflicting studio_mode and last_mode. Manual reconciliation required before applying mode consistency invariant.', v_desync_count
      USING ERRCODE = '22000';
  END IF;
END $$;

-- 2. Safe bidirectional backfill if either column was left null
UPDATE public.media_resume_states
SET studio_mode = last_mode
WHERE studio_mode IS NULL AND last_mode IS NOT NULL;

UPDATE public.media_resume_states
SET last_mode = studio_mode
WHERE last_mode IS NULL AND studio_mode IS NOT NULL;

-- 3. Add table constraint ensuring studio_mode and last_mode are always identical
ALTER TABLE public.media_resume_states
  DROP CONSTRAINT IF EXISTS media_resume_states_modes_consistent;

ALTER TABLE public.media_resume_states
  ADD CONSTRAINT media_resume_states_modes_consistent CHECK (
    studio_mode IS NOT DISTINCT FROM last_mode
  );

-- 4. Update trigger function with complete mode synchronization, TG_OP guard, and segment validation
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
  -- Execution context and operation guards
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'media_resume_states' THEN
    RAISE EXCEPTION 'Invalid trigger execution context' USING ERRCODE = '42501';
  END IF;

  IF TG_OP NOT IN ('INSERT', 'UPDATE') THEN
    RAISE EXCEPTION 'Invalid trigger operation' USING ERRCODE = '42501';
  END IF;

  -- User ownership check against authenticated identity
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

  -- 2. Mode synchronization and conflict resolution
  IF TG_OP = 'INSERT' THEN
    IF NEW.studio_mode IS NOT NULL AND NEW.last_mode IS NOT NULL THEN
      IF NEW.studio_mode IS DISTINCT FROM NEW.last_mode THEN
        RAISE EXCEPTION 'Conflicting studio_mode and last_mode values' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.studio_mode IS NULL AND NEW.last_mode IS NOT NULL THEN
      NEW.studio_mode := NEW.last_mode;
    ELSIF NEW.last_mode IS NULL AND NEW.studio_mode IS NOT NULL THEN
      NEW.last_mode := NEW.studio_mode;
    ELSIF NEW.studio_mode IS NULL AND NEW.last_mode IS NULL THEN
      NEW.studio_mode := 'shadowing';
      NEW.last_mode := 'shadowing';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.studio_mode IS DISTINCT FROM NEW.last_mode THEN
      IF (NEW.studio_mode IS DISTINCT FROM OLD.studio_mode) AND (NEW.last_mode IS NOT DISTINCT FROM OLD.last_mode) THEN
        -- Client updated studio_mode only; synchronize last_mode
        NEW.last_mode := NEW.studio_mode;
      ELSIF (NEW.last_mode IS DISTINCT FROM OLD.last_mode) AND (NEW.studio_mode IS NOT DISTINCT FROM OLD.studio_mode) THEN
        -- Client updated last_mode only; synchronize studio_mode
        NEW.studio_mode := NEW.last_mode;
      ELSE
        -- Both fields changed or were supplied with contradictory values
        RAISE EXCEPTION 'Conflicting studio_mode and last_mode update' USING ERRCODE = '42501';
      END IF;
    END IF;
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

    -- If completed_segment_ids is non-empty, all segments must exist in the transcript_version_id and be non-empty
    IF NEW.completed_segment_ids IS NOT NULL AND array_length(NEW.completed_segment_ids, 1) > 0 THEN
      IF EXISTS (
        SELECT 1
        FROM unnest(NEW.completed_segment_ids) AS seg_id
        WHERE seg_id IS NULL OR seg_id = '' OR NOT EXISTS (
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

-- 5. Revoke EXECUTE privilege from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION omni_internal.enforce_media_resume_invariants() FROM PUBLIC, anon, authenticated;
