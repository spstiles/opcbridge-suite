# opcbridge Public API

Status: Draft  
Scope: External interface for opcbridge as a stand-alone product.

## 1. Goals

- Provide a **clean, documented API** that:
  - SCADA/HMI systems can use.
  - opcbridge add-on modules (alarms, historian, console, HMI) can also use.
- Do **not** expose internal implementation details (paths, files, etc).
- Keep opcbridge independent from higher-level modules.

Base URL (behind proxy, example):

- `/opcbridge/api/...`
- WebSocket: `/opcbridge/ws`

---

## 2. Authentication

(TBD – options:)

- Simple API key in header, e.g. `X-API-Key: xxx`
- Or HTTP basic auth
- Or trust internal network only

For now, assume:
- Either no auth (lab/dev).
- Or simple token-based auth for production.

---

## 3. Tag Browsing

### 3.1 GET `/opcbridge/api/tags`

List tags with optional filters.

**Query parameters:**

- `q` (optional): search string.
- `prefix` (optional): restrict to tags under a given prefix (e.g. `plant1.ls03`).
- `limit` (optional): max results (default 100).

**Response (JSON):**

```json
[
  {
    "id": "plant1.ls03.pump1.run_fb",
    "description": "LS3 Pump 1 Run Feedback",
    "datatype": "bool",
    "eng_units": "",
    "source": {
      "connection": "ls03-plc",
      "address": "N7:0/1"
    },
    "writable": false
  },
  {
    "id": "plant1.ls03.wetwell.level",
    "description": "LS3 Wetwell Level",
    "datatype": "float",
    "eng_units": "ft",
    "source": {
      "connection": "ls03-plc",
      "address": "F8:0"
    },
    "writable": false
  }
]

