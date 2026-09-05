-- TimescaleDB schema for opcbridge-historian.
-- TimescaleDB is a required Historian dependency.

CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS tag_samples (
  ts          TIMESTAMPTZ NOT NULL,
  ts_ms       BIGINT      NOT NULL,
  connection_id TEXT      NOT NULL,
  tag_name      TEXT      NOT NULL,
  key         TEXT GENERATED ALWAYS AS (connection_id || ':' || tag_name) STORED,
  datatype    TEXT NULL,
  quality     INTEGER NULL,
  value_double DOUBLE PRECISION NULL,
  value_text  TEXT NULL,
  value_json  JSONB NULL,
  source      TEXT NULL, -- e.g. 'ws' or 'snapshot'
  ingest_ts   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tag_samples_key_ts ON tag_samples (key, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tag_samples_ts_brin ON tag_samples USING BRIN (ts);

-- Never initiate a potentially hours-long legacy-table conversion implicitly.
-- The installer handles existing data explicitly (archive or migrate).
SELECT create_hypertable('tag_samples', 'ts', if_not_exists => TRUE, migrate_data => FALSE);
