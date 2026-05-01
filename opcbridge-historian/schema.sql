-- Postgres schema for opcbridge-historian.
-- Works on plain Postgres. If TimescaleDB is installed, you can enable the optional section below.

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

-- Optional: TimescaleDB setup (uncomment if you have the extension installed).
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
-- SELECT create_hypertable('tag_samples', 'ts', if_not_exists => TRUE);
--
-- -- Raw retention (default example: 30 days)
-- SELECT add_retention_policy('tag_samples', INTERVAL '30 days', if_not_exists => TRUE);
--
-- -- 1-minute rollup example (numeric-focused). Adjust retention to taste.
-- CREATE MATERIALIZED VIEW IF NOT EXISTS tag_rollup_1m
-- WITH (timescaledb.continuous) AS
-- SELECT
--   time_bucket(INTERVAL '1 minute', ts) AS bucket,
--   key,
--   avg(value_double) AS avg_value,
--   min(value_double) AS min_value,
--   max(value_double) AS max_value,
--   last(value_double, ts) AS last_value,
--   count(*) AS n
-- FROM tag_samples
-- GROUP BY bucket, key;
--
-- SELECT add_retention_policy('tag_rollup_1m', INTERVAL '2 years', if_not_exists => TRUE);
