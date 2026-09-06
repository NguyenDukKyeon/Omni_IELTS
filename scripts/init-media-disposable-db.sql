-- Dedicated disposable database initialization marker for P04 Media Learning Room
CREATE SCHEMA IF NOT EXISTS omni_test;

CREATE TABLE IF NOT EXISTS omni_test.disposable_marker (
  id SERIAL PRIMARY KEY,
  marker_name TEXT NOT NULL UNIQUE,
  disposable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO omni_test.disposable_marker (marker_name, disposable)
VALUES ('OMNI_MEDIA_RLS_TEST_ENVIRONMENT', TRUE)
ON CONFLICT (marker_name) DO NOTHING;
