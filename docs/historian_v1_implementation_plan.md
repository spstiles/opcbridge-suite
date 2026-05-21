# Historian V1 Implementation Plan

## Goal

Build the first practical historian path for opcbridge-suite:

- Select tags to historize.
- Store numeric samples without slowing PLC polling.
- Query last/min/max/avg/TWA over a requested time range.
- Keep the first UI simple enough to test with real plant data.

This plan assumes PostgreSQL as the base database and TimescaleDB as the preferred
production extension. The first implementation should still work on plain
PostgreSQL where possible.

## Non-Goals For V1

- Full charting package.
- Complex retention UI.
- Continuous aggregate management UI.
- Boolean/string event history.
- Historian writes directly inside PLC polling code.

Those can come later. V1 should prove reliable storage and useful queries first.

## Architecture

The historian must be downstream of live tag snapshots.

```text
PLC / MQTT / Memory runtime
  -> live tag snapshot table
  -> OPC UA / alarms / MQTT publish
  -> historian service or worker
       -> periodic sampler
       -> bounded insert queue
       -> PostgreSQL / TimescaleDB
```

The important rule: database latency must not affect tag polling. If the database
is slow or offline, the historian should report degraded health and drop/skip
samples before it harms runtime polling.

## Recommended V1 Shape

Use the existing `opcbridge-historian` service as the first implementation
target. It already has a Postgres schema and service boundary, which keeps
database work outside the main runtime.

V1 should add:

- Historian config managed from SCADA.
- A tag selection list.
- Periodic numeric sampling from `GET /tags`.
- Query endpoints for summaries and raw/bucketed data.
- System/health reporting for service status.

## Configuration

Store historian config in a JSON file managed by SCADA, for example
`/etc/opcbridge/historian/config.json`.

Suggested shape:

```json
{
  "enabled": true,
  "opcbridge_base_url": "http://127.0.0.1:8080",
  "postgres": {
    "host": "127.0.0.1",
    "port": 5432,
    "database": "opcbridge",
    "user": "opcbridge",
    "password_env": "OPCBRIDGE_HISTORIAN_PG_PASSWORD",
    "table": "tag_samples"
  },
  "writer": {
    "batch_size": 500,
    "flush_interval_ms": 250,
    "queue_limit": 50000
  },
  "tags": [
    {
      "connection_id": "PLC1",
      "tag_name": "Flow",
      "enabled": true,
      "interval_ms": 60000,
      "mode": "periodic",
      "include_bad_quality": false
    }
  ]
}
```

For V1, `mode` can be limited to `periodic`. Add `change` and deadband later
after periodic history is proven.

## Database Schema

The current `opcbridge-historian/schema.sql` is a good V1 base:

```sql
CREATE TABLE IF NOT EXISTS tag_samples (
  ts             TIMESTAMPTZ NOT NULL,
  ts_ms          BIGINT      NOT NULL,
  connection_id  TEXT        NOT NULL,
  tag_name       TEXT        NOT NULL,
  key            TEXT GENERATED ALWAYS AS (connection_id || ':' || tag_name) STORED,
  datatype       TEXT NULL,
  quality        INTEGER NULL,
  value_double   DOUBLE PRECISION NULL,
  value_text     TEXT NULL,
  value_json     JSONB NULL,
  source         TEXT NULL,
  ingest_ts      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

For V1 numeric summaries, use `value_double`.

Recommended indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_tag_samples_key_ts
  ON tag_samples (key, ts DESC);

CREATE INDEX IF NOT EXISTS idx_tag_samples_ts_brin
  ON tag_samples USING BRIN (ts);
```

TimescaleDB optional setup:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;
SELECT create_hypertable('tag_samples', 'ts', if_not_exists => TRUE);
```

## Sampling Behavior

The historian service should poll snapshots on its own interval:

1. Load enabled historian tag list.
2. Group tags by interval.
3. On each due interval, call opcbridge `/tags`.
4. Extract only configured tags.
5. Convert numeric values into `value_double`.
6. Skip bad quality unless `include_bad_quality` is true.
7. Insert in batches.

This is intentionally independent of PLC polling. It may read current snapshots
less often than the PLC scan rate.

## Query API

Expose these endpoints from `opcbridge-historian` first. SCADA can proxy them
later if needed.

### Health

```text
GET /health
```

Returns:

```json
{
  "ok": true,
  "db_connected": true,
  "enabled_tags": 12,
  "queue_depth": 0,
  "dropped_samples": 0,
  "last_insert_ms": 1770000000000,
  "last_error": ""
}
```

### Configured Tags

```text
GET /tags
```

Returns configured historian tags and their last write status.

### Summary

```text
GET /summary?connection_id=PLC1&tag_name=Flow&from=...&to=...
GET /summary?connection_id=PLC1&tag_name=Flow&range=1h
```

Returns:

```json
{
  "connection_id": "PLC1",
  "tag_name": "Flow",
  "from": "2026-05-20T12:00:00Z",
  "to": "2026-05-20T13:00:00Z",
  "count": 60,
  "last": 123.4,
  "min": 110.2,
  "max": 140.8,
  "avg": 124.9,
  "twa": 125.3
}
```

### Raw Query

```text
GET /query?connection_id=PLC1&tag_name=Flow&from=...&to=...&limit=1000
```

Returns timestamped raw samples.

### Bucketed Query

```text
GET /query?connection_id=PLC1&tag_name=Flow&range=1d&bucket=15m
```

Returns one row per bucket with min/max/avg/count.

## TWA Definition

TWA means time-weighted average. It should account for how long each value was
active, not just average the stored samples.

For V1, calculate TWA with a step/last-value-held model:

```text
twa = sum(value[i] * duration_until_next_sample[i]) / total_duration
```

Boundary behavior:

- Include the last sample before `from` if available, so the first segment is not
  undercounted.
- Clamp segment start/end to the requested range.
- Ignore null/non-numeric values.
- Ignore bad quality unless requested.

This fits process values like flow, level, pressure, and runtime counters better
than a simple sample average.

## SCADA UI V1

Add a Historian tab after backend endpoints exist.

Initial UI:

- Status line: historian service health.
- Tag list: configured historian tags.
- Add/remove tag using the improved tag picker tree.
- Per-tag interval and enabled checkbox.
- Query panel:
  - tag selector
  - range selector: last hour, day, month, custom
  - buttons: Run Query, Export CSV
  - summary: last/min/max/avg/TWA/count
  - raw/bucket table

Charts should wait until table and summary behavior are solid.

## System Tags

Expose historian health later through system tags:

- `System/Historian/Ok`
- `System/Historian/DbConnected`
- `System/Historian/EnabledTags`
- `System/Historian/QueueDepth`
- `System/Historian/DroppedSamples`
- `System/Historian/LastInsertMs`
- `System/Historian/LastError`

These can be used for alarms.

## Implementation Order

1. Extend `opcbridge-historian` config model for selected tags.
2. Add config reload and `/health`.
3. Add periodic sampler from opcbridge `/tags`.
4. Batch insert numeric samples into Postgres.
5. Add `/summary` with min/max/avg/last/count.
6. Add TWA calculation.
7. Add `/query` raw results.
8. Add SCADA Historian tab for tag selection and queries.
9. Add install-script handling for historian config/service dependencies.

## Practical First Test

Use one known numeric flow or counter tag:

- sample every 60 seconds
- run for 10-30 minutes
- query last hour summary
- verify count, min, max, avg, last, and TWA

After that works, expand to a small group of tags before enabling hundreds or
thousands.
