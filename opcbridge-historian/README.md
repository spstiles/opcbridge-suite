# opcbridge-historian

Time-series historian service for the opcbridge ecosystem.

- Subscribes to opcbridge tag updates via WebSocket (`type: "tag_update"`).
- Optionally performs periodic HTTP snapshots (`GET /tags`) for true periodic sampling.
- Writes samples to a TimescaleDB hypertable and uses continuous aggregates for retention tiers.

## Quick start

1) Create schema:

```bash
psql "$PGCONN" -f ./schema.sql
```

2) Build:

```bash
./build.sh
```

3) Configure:

- Copy `config.json.example` to `config.json` and edit.

4) Run:

```bash
./opcbridge-historian --config ./config.json
```

Note: the opcbridge-suite installer runs this as a systemd service and passes Postgres settings via `--pg-conninfo` (with `PGPASSWORD` from the suite env file), so `postgres.conninfo` in the JSON can be left empty for non-secret configs.

### Existing archive conversion

If an existing PostgreSQL `tag_samples` table contains legacy archive data,
the installer asks whether to archive it and start fresh, migrate it in the
background, or cancel. Background conversion is owned by
`opcbridge-historian-migrate.service`; the remaining suite starts normally and
SCADA reports the Historian as **migrating** until conversion completes. Follow
its detailed log with:

```bash
journalctl -u opcbridge-historian-migrate -f
```

The historian writer starts automatically after a successful conversion. Its
normal startup path never implicitly migrates a populated PostgreSQL table.

## Modes

You can enable either or both:

- **Periodic selected tags**: configure the global `historian_policy`, then add
  deliberate selections to `historian_tags`. The service polls opcbridge
  `/tags` independently from PLC polling and stores numeric values.
- Tags inherit the global interval, deadband, and quality policy. Individual
  tags may set `deadband_override` and `deadband` when a signal needs different
  noise filtering.
- **Cascading resolution policy**: `historian_policy.resolution_tiers` records
  the ordered resolution and retention duration for each storage tier. A
  `retention_ms` value of `0` means retain that tier indefinitely.
- **Change-only**: store on change (with optional deadband/throttle), plus optional `max_interval_ms` to force a point occasionally.
- **Periodic sampling**: store snapshots on a timer by calling opcbridge HTTP `/tags` (works even when values don’t change).

## Health API

The service exposes a local health API, default port `8096`:

```bash
curl http://127.0.0.1:8096/health
curl http://127.0.0.1:8096/tags
curl 'http://127.0.0.1:8096/summary?connection_id=field_ops&tag_name=Flow&range=1h'
curl 'http://127.0.0.1:8096/query?connection_id=field_ops&tag_name=Flow&range=1h&limit=1000'
curl 'http://127.0.0.1:8096/query?connection_id=field_ops&tag_name=Flow&range=1d&bucket=15m'
```

The `/summary` endpoint returns `last`, `min`, `max`, `avg`, `twa`, and `count`
for numeric samples in the requested range. `twa` is a step/last-value-held
time-weighted average.

The `/query` endpoint returns raw numeric points for the requested range. Add
`bucket=15m` or `bucket=auto` to return bucketed min/max/avg/count rows instead.

## Notes

- For ~10,000 tags, you will want batching and either deadbanding, throttling, periodic sampling at a reasonable interval, or some combination.
- TimescaleDB is required. Run the suite installer with `--deps` to install and configure it.

## Build deps

- `libixwebsocket` + OpenSSL + zlib (same as other opcbridge-suite services)
- Postgres client headers/libs:
  - Debian/Ubuntu: `libpq-dev`
  - RHEL/Fedora: `libpq-devel` / `postgresql-devel` (depending on distro)
