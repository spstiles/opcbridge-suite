# opcbridge-historian

Time-series historian service for the opcbridge ecosystem.

- Subscribes to opcbridge tag updates via WebSocket (`type: "tag_update"`).
- Optionally performs periodic HTTP snapshots (`GET /tags`) for true periodic sampling.
- Writes samples to Postgres (optionally with TimescaleDB for retention + rollups).

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

## Modes

You can enable either or both:

- **V1 periodic selected tags**: configure `historian_tags` with per-tag
  intervals. The service polls opcbridge `/tags` independently from PLC polling
  and stores numeric values.
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
- TimescaleDB is recommended for production (compression + retention + continuous aggregates).

## Build deps

- `libixwebsocket` + OpenSSL + zlib (same as other opcbridge-suite services)
- Postgres client headers/libs:
  - Debian/Ubuntu: `libpq-dev`
  - RHEL/Fedora: `libpq-devel` / `postgresql-devel` (depending on distro)
