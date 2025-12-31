# opcbridge Suite Architecture (Starter)

This repo is a monorepo containing multiple cooperating components. The goal is:

- `opcbridge` remains a standalone industrial data bridge (drop-in comm layer).
- Other apps build on `opcbridge` without making it “the whole SCADA”.
- Configuration happens in one place without duplicating logic across UIs.

## Components and Responsibilities

### `opcbridge` (core engine + minimal local UI)
- Drivers, polling, tag snapshots, health.
- OPC UA endpoint for tags (and core server functionality).
- WebSocket endpoint for tag streaming/subscriptions.
- Canonical configuration files and HTTP API for reading/writing them.
- Minimal built-in “Workspace” UI for local maintenance and verification.
  - Server setup: ports (HTTP/WS/OPC UA), enable/disable endpoints, and bind addresses.
  - Paths: config directory, connections/tags directories, data paths.
  - Tokens: configure/admin/write tokens and their status (without exposing secrets by default).

Owns:
- The config schema and default storage layout.
- The HTTP APIs other components depend on.

Avoids:
- Full “SCADA suite” administration features.
- Alarm operator workflow (ack/shelve/notes/audible/dial-out).

### `opcbridge-alarms` (alarm workflow + alarm endpoint)
- Pulls alarm rules from `opcbridge` (or local file fallback).
- Evaluates alarm state from subscribed tag values.
- Persists alarm events/history in its own SQLite DB.
- Provides alarm workflow APIs (ack/shelve/notes) and an OPC UA endpoint for alarms.
- Provides WebSocket output for alarm state/events.

Owns:
- Alarm workflow and persistence.
- Alarm OPC UA endpoint.

Avoids:
- Tag polling / PLC communication (delegated to `opcbridge`).

### `opcbridge-hmi` (operator UI + screen builder)
- Screen editor and runtime HMI screens.
- Widgets bound to tags (read/write actions via `opcbridge`).
- Alarm panel visualization (reads alarm state/history via alarm server).

Owns:
- Screen JSONC format and editor UX.

Avoids:
- System-wide configuration administration.
- Alarm workflow business rules (delegated to `opcbridge-alarms`).

### `opcbridge-scada` (suite admin/config console)
Primary “single place configuration” app. It should be usable from a remote workstation against a headless server.

- Presents a cohesive workspace view (tree/table/panels).
- Manages connections/tags/alarms via existing HTTP APIs (no new config formats).
- Provides system-level setup UI (service status, ports, install/update helpers).
- Integrates other suite components (alarms, reporter) through their APIs.

Owns:
- Admin UX, bulk operations, validation, import/export tooling, and workflows.

Avoids:
- Becoming a second implementation of config parsing/writing.
- Creating new sources of truth separate from `opcbridge` config files.

## Standalone Guarantee

`opcbridge` must remain functional and configurable without any other component installed. Other apps may provide a better workflow, but they must not be required to:

- configure ports and endpoint enable/disable settings
- configure core paths (config/data)
- configure tokens/credentials (and verify token status)
- manage connections/tags/alarms at a basic level

## “Single Place Configuration” Scope

Target feature buckets:
- Connectivity (devices/connections, tag management, diagnostics)
- Alarms & Events (rule editing, workflow, history)
- HMI configuration (screen deployment, defaults, operator settings)
- Services & system configuration (systemd, ports, updates, backups)
- Reporter configuration and scheduling (future)

## Design Rules (to prevent overlap)

- **APIs over files:** `opcbridge-scada` and `opcbridge-hmi` should call HTTP APIs; they should not directly edit `opcbridge` config files on disk.
- **One owner per responsibility:** editing UIs may exist in multiple places, but logic should be centralized to one service.
- **opcbridge stays standalone:** it can expose more endpoints, but it should not absorb suite-level workflows.

## Roadmap (Next Steps)

This is intentionally pragmatic: focus on cohesion, stability, and the “single place configuration” goal before adding new domains.

### Phase 1: Make the suite usable daily

**opcbridge-scada**
- Workspace UX: stable tree/table layout, selection model, and bulk editing.
- Full configuration coverage via APIs:
  - Connections/devices CRUD
  - Tags CRUD + bulk add/edit + import/export
  - Alarm rules CRUD (including equals/boolean) + grouping metadata (Group/Site)
- Integrated diagnostics panels:
  - Tag freshness/quality/latency views
  - Connection health summary (mirrors opcbridge dashboard health)
- Safe apply workflow:
  - “Draft changes” -> Save -> Reload (server) with clear success/error feedback.

**opcbridge**
- Keep Workspace UI minimal, but ensure core endpoints are complete and stable for SCADA/HMI:
  - Config endpoints for connections/tags/alarms
  - Reload behavior consistent and recoverable
  - WebSocket subscriptions reliable (and documented)

**opcbridge-alarms**
- Persistence and restart behavior:
  - Restore last-known alarm state from DB on startup
  - Consistent rule loading from opcbridge and local fallback
- Minimal operator workflow APIs:
  - ack / shelve / unshelve (notes later)
- Alarm data output:
  - HTTP: state + history
  - WS: events + state updates
  - OPC UA: alarm nodes/methods (simple nodes first)

**opcbridge-hmi**
- Alarm panel behavior:
  - Always populate from last N days + current snapshot
  - Works without WS (poll/HTTP fallback)
- Editor/runtime guardrails:
  - Change warnings when switching modes / reloading with unsaved edits

### Phase 2: Deployment quality and onboarding

**Installer**
- `install.sh`:
  - `--deps` installs required packages on Debian 13 derivatives
  - Interactive/flag-based selection: `opcbridge` only vs full suite
- Systemd unit templates and a “status” helper command for quick diagnostics.

**Security model (later, not blocking dev)**
- Clear tokens story:
  - Service tokens stored server-side, never exposed to browser
  - Dev conveniences documented (`dev_env.sh`, local secrets files)

### Phase 3: Expand product features

**opcbridge-alarms**
- Operator workflow: notes, audible, escalation/dial-out, rate limiting.
- Alarm filtering/grouping for large deployments.

**opcbridge-scada**
- Reporter scheduling UI (cron integration or internal scheduler service).
- Project export/import (bundle) with anonymization support.
