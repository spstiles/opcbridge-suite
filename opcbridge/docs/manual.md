opcbridge — Installation, Configuration, and API Manual
Version: 0.2.2
Project: opcbridge (SCADA Communication Core)
1. Introduction

opcbridge is a high-performance communications core designed for SCADA, telemetry, and industrial automation systems. It bridges Allen-Bradley PLCs (via libplctag/EtherNet-IP) to modern protocols:

REST over HTTP

WebSockets (live streaming of tag updates & alarms)

MQTT publish and command handling

MQTT Telemetry Inputs (remote RTUs feeding PLC tags)

OPC UA server (embedded open62541)

SQLite-backed alarm & event logging

It is purposefully modular, file-configured, deterministic, and designed for mission-critical municipal water & wastewater environments.

2. Building and Installation
2.1 System Requirements

opcbridge builds on most Linux distributions. Recommended:

Debian 12/13 or Ubuntu 20+

g++ with C++17 support

gcc for building open62541.c

Development libraries:

libplctag
libmosquitto
libsqlite3-dev
openssl
zlib1g-dev
ixwebsocket (installed into /usr/local)

2.2 Typical Directory Structure
opcbridge/
  build.sh
  main.cpp
  open62541.c
  ws.cpp
  ws.h

  config/
    connections/
      *.json
    tags/
      *.json
    alarms.json
    mqtt.json
    mqtt_inputs.json
    data/
      alarms.db

  docs/
    manual.md
    Makefile

2.3 Building from Source
Build script: build.sh
#!/bin/bash
set -e

VERSION="0.2.2"

CXX_FLAGS="-std=c++17 -Wall -Wextra -O2"
C_FLAGS="-std=c99 -O2"

INCLUDES="-I. -I/usr/local/include"
LIBS="-L/usr/local/lib \
      -lplctag -lmosquitto -lsqlite3 -pthread \
      -lixwebsocket -lssl -lcrypto -lz"

OUT="./opcbridge"

echo "Building opcbridge version ${VERSION}"

gcc ${C_FLAGS} ${INCLUDES} -c open62541.c -o open62541.o

g++ ${CXX_FLAGS} ${INCLUDES} main.cpp ws.cpp open62541.o -o ${OUT} \
    -DOPCBRIDGE_VERSION=\"${VERSION}\" \
    ${LIBS}

echo "Build complete."


Run:

chmod +x build.sh
./build.sh


The output binary is simply:

./opcbridge

3. Configuration

opcbridge uses file-based JSON configuration stored under:

config/


You may reload all configuration without restarting:

POST /reload

3.1 PLC Connections — config/connections/*.json

Each file defines a single PLC:

{
  "id": "test01",
  "driver": "ab_eip",
  "gateway": "192.0.2.10",
  "path": "1,0",
  "slot": 0,
  "plc_type": "lgx",
  "default_timeout_ms": 1000,
  "default_read_ms": 1000,
  "default_write_ms": 1000,
  "debug": 0
}

3.2 Tags — config/tags/*.json

Each file defines a set of tags belonging to one connection:

{
  "connection_id": "test01",
  "tags": [
    {
      "name": "Test1.Dint",
      "plc_tag_name": "MyDINT",
      "datatype": "int32",
      "scan_ms": 1000,
      "writable": true,
      "mqtt_command_allowed": true,
      "log_event_on_change": true,
      "log_periodic": true,
      "log_periodic_mode": "interval",
      "log_periodic_interval_sec": 900
    }
  ]
}

Tag fields:

- name: Logical name (used by the dashboard, REST, MQTT, and OPC UA).
- plc_tag_name: PLC tag/address to read/write via libplctag.
- datatype: One of the supported datatypes below.
- scan_ms: Target poll interval in milliseconds (best-effort; actual timing depends on load/timeouts).
- writable: If true, the tag can be written via REST (/write), MQTT commands (if enabled), and OPC UA (if enabled).

MQTT controls:

- mqtt_command_allowed: If true, this tag accepts MQTT command writes (still also requires writable=true and MQTT enabled).

SQLite tag event logging:

- log_event_on_change: If true, opcbridge logs value changes for this tag into SQLite (config/data/alarms.db, table tag_events).
  - Notes: the change detector compares the most recent stored snapshot vs the new snapshot.
  - Writes are also logged as events (source="write") when they change the value.

SQLite periodic logging (interval mode):

- log_periodic: Master enable for periodic logging.
- log_periodic_mode: Currently only "interval" is implemented.
- log_periodic_interval_sec: Interval in seconds (also accepts legacy key "log_periodic_interval").

Reserved (not implemented yet):

- log_hourly_minute
- log_daily_hour
- log_daily_minute


Supported datatypes:

bool

int16 / uint16

int32 / uint32

float32 / float64

3.3 Alarms — config/alarms.json
{
  "alarms": [
    {
      "id": "HighLevel_LS01",
      "name": "Lift Station 01 Level High",
      "connection_id": "LS01",
      "tag_name": "LS01.Level",
      "type": "high",
      "threshold": 8.5,
      "hysteresis": 0.5,
      "severity": 700,
      "message_on_active": "LS01 level is HIGH. Investigate pumps/inlet.",
      "message_on_return": "LS01 level returned to normal.",
      "enabled": true
    }
  ]
}

Optional fields:

- name: Human readable label (defaults to id).
- description: Alias for name.
- severity: Integer (defaults to 500).
- message_on_active: Operator message when alarm goes active (defaults to name).
- message_on_return: Operator message when alarm returns/clears (defaults to empty).


Alarm types:

"high"

"low"

"change" (fire whenever value changes)

"equals" (active when the tag equals the configured value; supports bool + numbers)

For "equals":
- value: required (e.g. true, 5, 12.34)
- tolerance: optional for numeric compares (e.g. 0.1)

3.4 MQTT — config/mqtt.json
{
  "enabled": true,
  "host": "mqtt.example.com",
  "port": 8883,

  "client_id": "opcbridge-core",
  "base_topic": "wastewater",
  "command_topic": "wastewater/cmd",
  "ack_topic_prefix": "wastewater/ack",
  "subscribe_enabled": true,

  "patterns": {
    "per_field": true,
    "tag_json": true,
    "connection_json": false
  },

  "require_write_token": false,
  "write_token": "supersecret123",

  "username": "user",
  "password": "pass",

  "use_tls": true,
  "cafile": "/path/to/ca.crt",
  "tls_version": "tlsv1.2",
  "tls_insecure": false
}


MQTT supports:

TLS

username/password

per-tag JSON

per-field telemetry topics

command topics

acknowledgments

3.5 MQTT Telemetry Inputs — config/mqtt_inputs.json

Remote RTUs send values to MQTT and opcbridge writes them into PLC tags.

{
  "inputs": [
    {
      "id": "Test2_Dint_from_mqtt",
      "topic": "wastewater/test02/Test2.Int2",

      "connection_id": "test02",
      "tag_name": "Test2.Int2",
      "datatype": "int16",

      "write_to_plc": true,
      "payload_format": "raw"
    }
  ]
}

4. Runtime Modes & CLI
./opcbridge [options]


Key options:

Option	Description
--http	REST API + dashboard
--mqtt	MQTT publish + commands + telemetry inputs
--ws	WebSocket server
--ws-port <port>	WebSocket port (default 8090)
--opcua	Embedded OPC UA server
--dump	One-time tag dump
--dump-json	JSON tag dump
--write conn tag value	Write PLC value
(Use HTTP `POST /reload` to hot-reload config)

Example write:

./opcbridge --write test01 Test1.Dint 1234

5. HTTP REST API

All responses are JSON.

5.0 Admin Authentication (for config/admin endpoints)

Some endpoints (notably config management) require an admin token header:

X-Admin-Token: <token>

The dashboard obtains and stores this token after login.

Role-based permissions:

- User and role management endpoints require the `auth.manage_users` permission.
- If your user does not have that permission, `POST/PUT/DELETE /auth/roles/*` and `POST/PUT/DELETE /auth/users/*` will return `403`.

Service-to-service auth (optional):

If you run headless modules (e.g. opcbridge-alarms) that need to fetch config without an interactive login, set an environment variable on the opcbridge service:

OPCBRIDGE_ADMIN_SERVICE_TOKEN=<long random token>

Then have the module send the same value in the X-Admin-Token header.

Related endpoints:

GET /config/alarms
GET /config/bundle
POST /config/bundle

Example systemd snippet (opcbridge + opcbridge-alarms):

Environment="OPCBRIDGE_ADMIN_SERVICE_TOKEN=change-me-to-a-long-random-token"

5.1 GET /info
{
  "name": "opcbridge",
  "version": "0.2.2",
  "uptime_seconds": 12,
  "num_connections": 2,
  "total_tags": 32
}

5.2 GET /tags
{
  "tags": [
    {
      "connection_id": "test01",
      "name": "Test1.Dint",
      "datatype": "int32",
      "quality": 1,
      "timestamp_ms": 1764806941639,
      "value": 1234
    }
  ]
}

5.3 GET /tags/<connection>/<tag>
{
  "connection_id": "test01",
  "name": "Test1.Dint",
  "datatype": "int32",
  "quality": 1,
  "value": 2345
}

5.4 Write Tag — POST /write
{
  "connection_id": "test01",
  "name": "Test1.Dint",
  "value": "1234",
  "token": "<WRITE_TOKEN>"
}

5.5 Reload Config — POST /reload
{
  "token": "<WRITE_TOKEN>"
}


Reloads:

connections

tags

alarms

mqtt.json

mqtt_inputs.json

5.6 GET /alarms
{
  "alarms": [
    {
      "id": "HighLevel_LS01",
      "connection_id": "LS01",
      "tag_name": "LS01.Level",
      "type": "high",
      "enabled": true,
      "active": false,
      "state": "inactive"
    }
  ]
}

5.7 GET /alarms/events?limit=N
{
  "ok": true,
  "events": [
    {
      "timestamp_ms": 1764806941639,
      "connection_id": "test01",
      "tag_name": "Test1.Bit",
      "old_value": "0",
      "new_value": "1"
    }
  ]
}

6. WebSocket Streaming API

Start with:

--ws


Connect at:

ws://<server>:8090/

6.1 Example JavaScript Client
const ws = new WebSocket("ws://192.0.2.50:8090/");

ws.onmessage = ev => {
    console.log("WS message:", JSON.parse(ev.data));
};

6.2 Message Types
Tag Update
{
  "type": "tag_update",
  "connection_id": "test01",
  "name": "Test1.Bit",
  "datatype": "bool",
  "value": true,
  "timestamp_ms": 1764807000123
}

Alarm Event
{
  "type": "alarm_event",
  "alarm_id": "HighLevel_LS01",
  "tag_name": "LS01.Level",
  "value": 9.1,
  "state": "active"
}

Event Log Row
{
  "type": "event_log",
  "connection_id": "test01",
  "tag_name": "Test1.Bit",
  "old_value": 0,
  "new_value": 1,
  "timestamp_ms": 1764806941639
}

7. MQTT API

Requires:

--mqtt

7.1 Telemetry Topics
Per-field telemetry:
wastewater/test01/Test1.Dint/value
wastewater/test01/Test1.Dint/quality
wastewater/test01/Test1.Dint/timestamp

Tag JSON:
wastewater/test01/Test1.Dint

{
  "connection_id": "test01",
  "name": "Test1.Dint",
  "value": 1234,
  "datatype": "int32",
  "timestamp_ms": 1764806941639
}

7.2 Command Topics (Write to PLC)

Topic format:

wastewater/cmd/<connection>/<tag>


Payload:

{
  "value": "1234",
  "token": "supersecret123"
}

7.3 Acknowledgments
wastewater/ack/<connection>/<tag>

{
  "connection_id": "test01",
  "tag": "Test1.Dint",
  "requested_value": "1234",
  "ok": true
}

7.4 MQTT Telemetry Inputs (Reverse Direction)

Remote units publish telemetry that opcbridge injects into PLC registers:

{
  "id": "Test2_Dint_from_mqtt",
  "topic": "wastewater/test02/Test2.Int2",
  "connection_id": "test02",
  "tag_name": "Test2.Int2",
  "datatype": "int16",
  "write_to_plc": true
}

8. Alarm & Event Logging (SQLite)

Stored in:

config/data/alarms.db


Tables include:

events

alarm history

periodic logs

Event types:

change-based

periodic interval snapshots

alarm transitions

REST interfaces:

/alarms/events

/events

9. OPC UA Server

Enabled with:

--opcua


Default port:

4840


Each tag becomes a UA variable:

readable values match latest PLC snapshot

writable values write through libplctag

Example endpoint:

opc.tcp://hostname:4840/

10. Automatic Manual Generation (GitHub Actions)

Place this manual in:

docs/manual.md


Place Makefile in:

docs/Makefile

GitHub Actions Workflow

.github/workflows/manual.yml

name: Build Manual

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  build-manual:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install Pandoc + LaTeX
        run: |
          sudo apt-get update
          sudo apt-get install -y pandoc texlive-latex-base

      - name: Build PDF manual
        working-directory: ./docs
        run: make

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: opcbridge-manual
          path: docs/manual.pdf

11. Conclusion

opcbridge provides a modular, robust industrial communication component that integrates PLC systems with modern data protocols. With REST, MQTT, WebSockets, OPC UA, periodic logging, and alarms, it offers a complete bridge between field devices and supervisory systems.

You now have:

A complete installation + configuration manual

REST, MQTT, WebSocket, and OPC UA documentation

Alarm/event logging details

Auto-generation pipeline for future manuals
