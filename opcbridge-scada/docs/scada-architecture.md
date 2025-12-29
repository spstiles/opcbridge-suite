# Modular SCADA Architecture

Author: Steve Stiles  
Status: Draft  
Last Updated: {{DATE}}

## 1. Goals

- Keep **opcbridge** as a **stand-alone product**:
  - Independent device/PLC communication hub.
  - Usable with _any_ SCADA/HMI/historian.
  - No hard dependency on other components.

- Provide optional, modular components:
  - Web-based HMI.
  - Alarm server.
  - Historian / data logger.
  - Unified SCADA console (web UI).

- Allow users to install only what they need:
  - `opcbridge` only.
  - `opcbridge + historian`.
  - `opcbridge + alarm`.
  - Full stack.

- Present a **coherent user experience** when all modules are installed:
  - One main URL.
  - Shared navigation, styling, and concepts.
  - Operators shouldn’t care that it’s multiple backends.

---

## 2. High-Level Architecture

Layers:

1. **Devices / PLCs**
   - Allen-Bradley (DF1, Ethernet/IP), Modbus, etc.

2. **Core Communication Layer: opcbridge (stand-alone)**
   - Talks to devices/PLCs.
   - Normalizes I/O into tag space.
   - Exposes data via:
     - REST API
     - WebSockets
     - MQTT (optional)
     - OPC UA (future)
   - Has its own minimal web UI for diagnostics/config.
   - Can run headless with no other modules.

3. **Optional Back-End Modules**
   - **Alarm Server**
     - Subscribes to tag value changes (from opcbridge).
     - Evaluates alarm rules.
     - Stores alarm/events.
     - Exposes alarm APIs for any client.
   - **Historian / Data Logger**
     - Subscribes/polls from opcbridge.
     - Stores timeseries data.
     - Exposes trend/query APIs.
   - **Other processors**
     - Reporting, analytics, whatever else is needed.

4. **Optional Front-End: SCADA Console**
   - Web app that provides:
     - Overview
     - HMI runtime
     - Alarms view/ack
     - Trends
     - Events
     - System status
     - Engineering/config tools
   - Thin layer that calls the APIs of opcbridge, alarm server, historian, etc.
   - Should be able to detect which modules are present.

5. **Optional HMI Editor / Runtime**
   - Web-based screen editor and runtime graphics.
   - Uses opcbridge APIs for tag data.
   - Integrates into SCADA console, but can also be used stand-alone if needed.

---

## 3. Products and Names

Working names (for clarity while designing):

- **opcbridge**  
  Core communication product. Stand-alone.

- **opcbridge-alarms**  
  Alarm server module.

- **opcbridge-historian**  
  Data logger / historian module.

- **opcbridge-hmi**  
  Web-based HMI/graphics module.

- **opcbridge-console**  
  Unified SCADA console web UI.

> NOTE: All names are internal for now; branding can change later.

---

## 4. Deployment Model

- All components can run on the same headless Linux server.
- Components expose HTTP/WebSocket APIs.
- **Apache / reverse proxy** (or similar) provides a unified entry point:

Examples:

- `/opcbridge/api` → opcbridge REST API
- `/opcbridge/ws` → opcbridge WebSockets
- `/alarm/api` → alarm server API
- `/historian/api` → historian API
- `/console` → SCADA console front-end
- `/hmi` → HMI front-end

The console and HMI front-end are static assets (HTML/JS/CSS) plus API calls to the back-end services.

---

## 5. API Boundaries (Summary)

### 5.1 opcbridge API (public, stand-alone)

Used by:
- opcbridge-console
- opcbridge-hmi
- opcbridge-alarms
- opcbridge-historian
- External systems / third-party SCADA

Key responsibilities:
- Discover tags.
- Read current values.
- Write values (where allowed).
- Get connection status.
- Stream updates (WebSocket/MQTT).

See: `opcbridge-api.md` for details.

---

### 5.2 Alarm Server API

Used by:
- opcbridge-console (alarms page, banner).
- Potentially other external systems.

Key responsibilities:
- Expose active alarms.
- Expose alarm history/events.
- Acknowledge / shelve alarms.
- Report alarm server health/status.

See: `alarm-server-api.md` for details.

---

### 5.3 Historian API (future doc)

Used by:
- opcbridge-console (trends page).
- External tools (reporting, analytics).

Key responsibilities:
- Query historical data by tag + time range.
- Manage trend definitions (optional).
- Report historian health/status.

(TBD in future doc.)

---

## 6. SCADA Console UI (High-Level)

The console is an OPTIONAL web app that ties everything together.

Main routes (example):

- `/console/overview`
- `/console/hmi/:screenId`
- `/console/alarms`
- `/console/trends`
- `/console/events`
- `/console/system`

Engineering routes (role-gated):

- `/console/eng/tags`
- `/console/eng/connections`
- `/console/eng/alarms`
- `/console/eng/historian`
- `/console/eng/screens`

The console:
- Provides consistent layout, navigation, and styling.
- Makes HTTP/WebSocket calls into opcbridge, alarm server, historian, etc.
- Does **not** perform low-level device communication.

---

## 7. Modularity Rules

To preserve opcbridge as a stand-alone product:

1. **opcbridge must not depend on any other module.**
   - It runs by itself.
   - It does not assume the alarm server or historian exist.

2. **Other modules must talk to opcbridge only via its public APIs.**
   - No direct file or DB coupling.

3. **SCADA console must be able to detect module presence.**
   - E.g., calls `/alarm/api/status`; if it fails, hide the alarms menu.
   - Same for historian, HMI editor, etc.

4. **All external SCADA/HMI systems must be able to use opcbridge just like your own components do.**
   - No secret/private interfaces.

---

## 8. Open Questions / TODOs

- Decide on a **canonical tag identifier format**:
  - e.g. `plant1.ls03.pump1.run_fb`
- Decide how tag definitions are managed:
  - Single central config?
  - Or each module reads from opcbridge’s tag registry API?
- Decide how configuration changes are propagated:
  - Push (publish config) vs pull (modules poll for updates).
- Decide which module “owns” the tag registry (likely opcbridge).

---

## 9. Next Steps

1. Finalize `opcbridge-api.md` (surface and behavior).
2. Draft `alarm-server-api.md` (surface and behavior).
3. Draft historian API similar to alarm server.
4. Sketch SCADA console navigation + basic front-end structure.
5. Wire Apache proxy routes in a test environment.

Once these are written down and stable enough, implementation can start incrementally.
