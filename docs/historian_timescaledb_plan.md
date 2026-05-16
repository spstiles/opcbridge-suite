# Historian TimescaleDB Plan

## Goal

Add a production-oriented historian for OPCBridge that can store numeric process
values, such as flow, and query current, average, minimum, and maximum values
over practical ranges such as the last hour, day, month, and year.

The historian must not slow down PLC polling. Pollers should only publish a
lightweight in-memory event after a value is read. Database work must happen in a
separate historian worker.

## Database Direction

Use PostgreSQL with TimescaleDB support.

PostgreSQL provides the base database, SQL, users, backups, and operational
tools. TimescaleDB adds time-series features:

- Hypertables for automatic time chunking.
- Compression for older data.
- Retention policies.
- Continuous aggregates for fast rollups.
- Normal PostgreSQL compatibility.

The first implementation should be able to run on plain PostgreSQL where
possible, but the preferred deployment target is TimescaleDB.

## Runtime Architecture

Polling should remain the producer of live data, but not the owner of historian
storage.

```text
PLC pollers
  -> live tag table
  -> alarms
  -> OPC UA
  -> MQTT/WebSocket
  -> historian queue

historian queue
  -> historian worker
  -> batched PostgreSQL/TimescaleDB inserts
```

The poll loop should only enqueue a small snapshot candidate and continue.
The historian worker should apply logging rules and perform batched inserts.

## Initial Scope

Start with numeric tags only:

- `int16`
- `uint16`
- `int32`
- `uint32`
- `float32`
- `float64`

This covers common historian use cases such as flow, pressure, level,
temperature, runtime counters, and calculated rates.

Boolean and string history can be added later after numeric trends are stable.

## Tag Configuration

Add optional historian fields to tag config:

```json
{
  "historian_enabled": true,
  "historian_mode": "periodic",
  "historian_interval_sec": 60,
  "historian_deadband": 0.0,
  "historian_include_bad_quality": false
}
```

Suggested modes:

- `off`: no historian writes.
- `periodic`: write at a fixed interval.
- `change`: write when value changes enough to pass deadband.
- `both`: periodic plus change/deadband writes.

Deadband should apply only to numeric values.

## Raw Sample Table

Suggested raw table:

```sql
CREATE TABLE historian_samples (
  ts timestamptz NOT NULL,
  ts_ms bigint NOT NULL,
  connection_id text NOT NULL,
  tag_name text NOT NULL,
  datatype text NOT NULL,
  quality integer NOT NULL,
  value_float double precision,
  value_int bigint,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Suggested TimescaleDB setup:

```sql
SELECT create_hypertable('historian_samples', 'ts', if_not_exists => TRUE);
```

Suggested indexes:

```sql
CREATE INDEX IF NOT EXISTS historian_samples_tag_time_idx
  ON historian_samples (connection_id, tag_name, ts DESC);

CREATE INDEX IF NOT EXISTS historian_samples_time_idx
  ON historian_samples (ts DESC);
```

For numeric queries, `value_float` should be populated for all numeric tags.
`value_int` can also be populated for integer tags when exact integer values are
useful.

## Rollups

Use TimescaleDB continuous aggregates for trend performance.

Suggested rollups:

- 1 minute buckets for recent/detail charts.
- 1 hour buckets for month/year views.
- 1 day buckets for long-term summaries.

Each bucket should include:

- average
- minimum
- maximum
- count
- first value
- last value

Example concept:

```sql
SELECT
  time_bucket('1 minute', ts) AS bucket,
  connection_id,
  tag_name,
  avg(value_float) AS avg_value,
  min(value_float) AS min_value,
  max(value_float) AS max_value,
  count(*) AS sample_count
FROM historian_samples
WHERE quality = 1
GROUP BY bucket, connection_id, tag_name;
```

## Query API

Add OPCBridge APIs:

- `GET /historian/tags`
- `GET /historian/query`
- `GET /historian/summary`
- `GET /historian/export.csv`

Suggested query parameters:

```text
connection_id
tag_name
from
to
range=hour|day|month|year
aggregate=raw|avg|min|max|summary
bucket=auto|1m|5m|1h|1d
```

For charts, the server should choose a reasonable bucket when `bucket=auto`.

## SCADA UI

Add a Historian tab after the backend data path is proven.

Initial UI:

- Connection selector.
- Tag selector filtered to historian-enabled numeric tags.
- Range selector: hour, day, month, year, custom.
- Summary values: current, average, minimum, maximum.
- Table of returned points or buckets.
- CSV download.

Charting can come after table/query behavior is correct.

## Retention And Maintenance

Add historian settings:

- enabled/disabled
- PostgreSQL connection string or host/port/db/user configuration
- raw retention days
- rollup retention policy
- compression enabled
- queue size limit
- batch insert size
- flush interval

The historian worker should expose health/status:

- database connected
- queue depth
- dropped samples
- last insert time
- last error
- insert rate

These should eventually appear as system tags.

## Failure Behavior

The historian must fail safely:

- Polling continues if the database is down.
- Queue is bounded to protect memory.
- Dropped sample count is tracked.
- Last database error is visible in status/system tags.
- Reconnect is automatic.

## Implementation Phases

### Phase 1: Foundation

- Add historian config.
- Add PostgreSQL/TimescaleDB connection support.
- Add schema initialization.
- Add background historian queue and worker.
- Add numeric sample inserts.

### Phase 2: Tag Logging Rules

- Add historian fields to tag config.
- Add periodic/change/deadband rule evaluation in the historian worker.
- Keep poll loop work limited to enqueueing snapshot candidates.

### Phase 3: Query APIs

- Add raw query endpoint.
- Add summary endpoint for avg/min/max/current.
- Add CSV export.

### Phase 4: Rollups

- Add TimescaleDB continuous aggregate setup.
- Add bucketed query API.
- Add retention/compression policies.

### Phase 5: SCADA UI

- Add Historian tab.
- Add tag/range selection.
- Add summary display and table.
- Add CSV download.
- Add charts after query/table behavior is stable.

## Design Principles

- Polling performance is more important than historian completeness.
- Database writes must be asynchronous and batched.
- Start with numeric tags.
- Prefer simple raw storage first, then rollups.
- Make TimescaleDB the preferred target, but avoid unnecessary lock-in where
  plain PostgreSQL can still work.
