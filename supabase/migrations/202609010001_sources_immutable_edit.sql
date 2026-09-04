-- Immutable source editing is one database transaction. The client supplies only
-- the source, optimistic base version, and raw edited text; every persisted field
-- is derived inside this function before the append-only version is returned.
CREATE OR REPLACE FUNCTION public.append_source_edited_version(
  p_source_id UUID,
  p_base_version_id UUID,
  p_edited_text TEXT
)
RETURNS SETOF public.source_versions
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_current_version_id UUID;
  v_version_id UUID;
  v_next_version_number INT;
  v_cleaned TEXT;
  v_piece TEXT;
  v_block_text TEXT;
  v_blocks JSONB := '[]'::jsonb;
  v_block_count INT := 0;
BEGIN
  -- Lock the parent row first. This makes the optimistic current-version check
  -- and append/update pair conflict-safe for concurrent editors.
  SELECT r.current_version_id
    INTO v_current_version_id
   FROM public.source_records AS r
   WHERE r.id = p_source_id
     AND r.user_id = auth.uid()
     AND r.processing_state = 'ready'
   FOR UPDATE;

  IF NOT FOUND OR v_current_version_id IS DISTINCT FROM p_base_version_id THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.source_versions AS v
     WHERE v.id = p_base_version_id
       AND v.source_id = p_source_id
       AND v.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  v_cleaned := replace(coalesce(p_edited_text, ''), E'\r\n', E'\n');
  v_cleaned := replace(v_cleaned, E'\r', E'\n');
  v_cleaned := btrim(v_cleaned);

  IF char_length(v_cleaned) > 200000 THEN
    RAISE EXCEPTION 'RESOURCE_LIMIT_EXCEEDED' USING ERRCODE = 'P0001';
  END IF;

  FOR v_piece IN
    SELECT part FROM regexp_split_to_table(v_cleaned, E'\n[[:space:]]*\n') AS parts(part)
  LOOP
    v_block_text := btrim(regexp_replace(v_piece, '[ \t]+', ' ', 'g'));
    IF v_block_text <> '' THEN
      v_block_count := v_block_count + 1;
      IF v_block_count > 2000 THEN
        RAISE EXCEPTION 'RESOURCE_LIMIT_EXCEEDED' USING ERRCODE = 'P0001';
      END IF;
      v_blocks := v_blocks || jsonb_build_array(jsonb_build_object(
        'id', format('b_%s', lpad(v_block_count::TEXT, 3, '0')),
        'order', v_block_count,
        'type', 'paragraph',
        'text', v_block_text
      ));
    END IF;
  END LOOP;

  IF v_block_count = 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0001';
  END IF;

  SELECT string_agg(value ->> 'text', E'\n\n' ORDER BY (value ->> 'order')::INT)
    INTO v_cleaned
    FROM jsonb_array_elements(v_blocks);

  IF char_length(v_cleaned) < 15 THEN
    RAISE EXCEPTION 'INVALID_INPUT' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(max(v.version_number), 0) + 1
    INTO v_next_version_number
    FROM public.source_versions AS v
   WHERE v.source_id = p_source_id;

  BEGIN
    INSERT INTO public.source_versions (
      source_id,
      user_id,
      version_number,
      stage,
      content_hash,
      plain_text,
      blocks,
      word_count,
      extraction_report
    ) VALUES (
      p_source_id,
      auth.uid(),
      v_next_version_number,
      'edited',
      encode(digest(convert_to(v_cleaned, 'UTF8'), 'sha256'), 'hex'),
      v_cleaned,
      v_blocks,
      CASE
        WHEN btrim(v_cleaned) = '' THEN 0
        ELSE array_length(regexp_split_to_array(btrim(v_cleaned), '[[:space:]]+'), 1)
      END,
      jsonb_build_object(
        'extractor', 'source-editor',
        'extractedAt', to_jsonb(now()),
        'sanitizationApplied', jsonb_build_array('line_endings', 'whitespace'),
        'warnings', '[]'::jsonb
      )
    )
    RETURNING id INTO v_version_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END;

  UPDATE public.source_records
     SET current_version_id = v_version_id,
         summary = left(v_cleaned, 280),
         updated_at = now()
   WHERE id = p_source_id
     AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY SELECT * FROM public.source_versions WHERE id = v_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.append_source_edited_version(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_source_edited_version(UUID, UUID, TEXT) TO authenticated;
