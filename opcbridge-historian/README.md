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

- **Change-only**: store on change (with optional deadband/throttle), plus optional `max_interval_ms` to force a point occasionally.
- **Periodic sampling**: store snapshots on a timer by calling opcbridge HTTP `/tags` (works even when values don’t change).

## Notes

- For ~10,000 tags, you will want batching and either deadbanding, throttling, periodic sampling at a reasonable interval, or some combination.
- TimescaleDB is recommended for production (compression + retention + continuous aggregates).

## Build deps

- `libixwebsocket` + OpenSSL + zlib (same as other opcbridge-suite services)
- Postgres client headers/libs:
  - Debian/Ubuntu: `libpq-dev`
  - RHEL/Fedora: `libpq-devel` / `postgresql-devel` (depending on distro)
