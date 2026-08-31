-- Dedicated disposable database initialization marker
-- Created strictly by docker-compose.sources-rls-test.yml
CREATE SCHEMA IF NOT EXISTS omni_test;

CREATE TABLE IF NOT EXISTS omni_test.disposable_marker (
  id SERIAL PRIMARY KEY,
  marker_name TEXT NOT NULL UNIQUE,
  disposable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO omni_test.disposable_marker (marker_name, disposable)
VALUES ('OMNI_SOURCES_RLS_TEST_ENVIRONMENT', TRUE)
ON CONFLICT (marker_name) DO NOTHING;
