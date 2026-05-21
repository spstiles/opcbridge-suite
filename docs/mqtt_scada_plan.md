# MQTT SCADA Configuration Plan

## Goal

Move MQTT setup from hand-edited JSON and certificate upload into SCADA.

MQTT should support both current opcbridge use cases:

- Publish live opcbridge tag values to an MQTT broker.
- Subscribe to broker topics for command writes and telemetry inputs.

## Direction: MQTT As A Connection Driver

MQTT should become a first-class connection type in Workspace, similar to how a
future Modbus device would appear. It should not live in a separate top-level
Workspace category.

Proposed Workspace tree:

```text
Connectivity
  PLC_1
    Motor_Run
    Flow_Rate
  RemoteMQTT
    Subscriptions
      remote/plc1/status
        RawPayload
        Field_0
        Field_1
    Publications
      plant/plc1/commands
        PumpStart
        Setpoint
Memory
  Remote1_Flow
  Remote1_StatusWord
System
  ...
```

The broker is still the connection boundary because it owns host, port, TLS,
credentials, client ID, reconnect behavior, and session settings. In config,
that means a normal connection file with `driver: "mqtt"` and MQTT-specific
settings. Topics are children of that connection, not separate connection files.

Broker-level settings should be edited in the normal Workspace Add/Edit Device
modal. MQTT subscription/publication topics should also be managed from the
Workspace tree, under the selected MQTT connection. The MQTT tab is optional and
should not be required for normal setup.

### Subscription Semantics

Subscriptions represent data flowing from the broker into opcbridge.

- Subscription tags are updated when MQTT messages arrive.
- Raw payloads should be visible for troubleshooting.
- OPC UA, HMI, alarms, and logging may inspect the raw MQTT payload tag directly.
- Parsing, scaling, masking, and mapping should live in the shared
  logic/expression module, not in MQTT subscription properties.
- Normalized/scaled values should usually be written to memory tags through that
  logic/expression module.

### Publication Semantics

Publications represent data flowing from opcbridge out to the broker.

- Publication tags are writable/output-oriented.
- Values may come from memory tags, PLC tags, HMI actions, alarm actions, or
  expressions.
- Publish behavior should explicitly define payload format, QoS, retain, and
  trigger behavior.
- Publishing should be deliberate; avoid implicit wildcard writes without a
  clear validation and safety model.

Use explicit configuration names:

- `subscriptions[]` for inbound topics.
- `publications[]` for outbound topics.

Avoid ambiguous names such as only `topics[]` where direction is unclear.

## Logic/Expression Relationship

MQTT should not grow its own private scaling, masking, mapping, and conversion
language. Those transforms should belong to the shared logic/expression module.

Data flow:

```text
MQTT subscription tag/raw field
  -> expression/logic block
  -> memory tag
  -> OPC UA / HMI / alarms / data logger / future MQTT publication
```

This keeps troubleshooting clear:

```text
raw MQTT payload -> extracted MQTT tag -> expression result -> memory tag
```

The expression layer should support common industrial transforms:

- scale/map values
- clamp values
- round/cast values
- bit masks and bit extraction
- boolean logic
- conditional selection
- tag references to PLC, MQTT, memory, and system tags
- stateful helpers later: counters, on-delay/off-delay timers, and one-shots

Examples:

```text
map(tag("Broker_1:remote/plc1/status.Field_0"), 0, 1000, 0, 100)
tag("Broker_1:remote/plc1/status.StatusWord") & 16
if(tag("PLC_1:RunEnable"), tag("Broker_1:remote/plc1/status.Flow"), 0)
```

Expression outputs should write to memory tags first. Later, guarded outputs can
write to PLC tags or MQTT publications when explicitly configured.

Future stateful helpers should keep their retained state inside the logic
runtime and key that state by script ID plus helper name. That avoids accidental
sharing between scripts that happen to use the same counter or timer label.
Likely shapes:

```text
counter("PumpStarts", enable, reset)
timerOn("HighFlowDelay", enable, presetMs)
timerOff("LowFlowHold", enable, presetMs)
pulse("StartOneShot", input)
```

## Current Core Support

The opcbridge runtime already supports:

- Broker host/port/client ID.
- Plain TCP or TLS.
- CA certificate validation.
- Optional client certificate and private key.
- Optional username/password.
- Publish patterns:
  - per-field topics
  - per-tag JSON
  - per-connection JSON
- Command writes:
  - `<command_topic>/<connection>/<tag>`
  - optional write token
  - ACK topic prefix
- Telemetry inputs from `mqtt_inputs.json`:
  - exact topic mappings
  - `raw` payloads
  - `json_field` payloads
  - write to PLC or update live/virtual tag table only

## SCADA Sections

### MQTT Broker

Configure `/etc/opcbridge/mqtt.json`.

Fields:

- Enabled
- Host
- Port
- Client ID (blank/auto generates a unique client ID at startup)
- Username
- Password
- TLS enabled
- TLS version
- Insecure TLS
- CA certificate file
- Client certificate file
- Client key file
- Test connection

Certificate management should support:

- CA-only TLS
- client certificate + key
- username/password with or without TLS
- username/password plus client certificate

### Publishing

Fields:

- Base topic
- QoS
- Retain
- Keepalive
- Heartbeat seconds
- Publish only on change
- Per-field topics
- Per-tag JSON
- Per-connection JSON

### Command Writes

Fields:

- Subscribe for commands
- Command topic
- ACK topic prefix
- Require write token
- Write token

Tag-level safety remains separate:

- tag must be writable
- MQTT command/mapping policy must allow the write

### Telemetry Inputs

Configure `/etc/opcbridge/mqtt_inputs.json`.

The preferred shape is one message per subscribed topic, with one or more field
mappings inside that message. This supports payloads such as register arrays or
JSON objects with numeric keys.

Fields per message:

- ID
- MQTT topic
- Payload format: `raw`, `json_key`, `json_field`, or `json_path`
- Write to PLC default

Fields per mapping:

- Target connection
- Target tag
- Datatype
- Key or path
- Optional payload format override
- Optional write to PLC override

Example numeric-key payload:

```json
{
  "0": 123.4,
  "1": 55,
  "running": true
}
```

Example mapping:

```json
{
  "messages": [
    {
      "id": "RemoteRegisterBlock",
      "topic": "site1/plc1/registers",
      "payload_format": "json_key",
      "mappings": [
        { "key": "0", "connection_id": "PLC1", "tag_name": "Flow", "datatype": "float32" },
        { "key": "1", "connection_id": "PLC1", "tag_name": "Level", "datatype": "int16" },
        { "key": "running", "connection_id": "PLC1", "tag_name": "Running", "datatype": "bool" }
      ]
    }
  ]
}
```

The legacy `inputs` array remains supported for simple one-topic-to-one-tag
mappings. Initial implementation uses exact topics only. Wildcards can be
considered later if a real deployment needs them.

### Output Mappings

Outbound mappings should mirror the input model:

- One MQTT topic can be built from multiple opcbridge tags.
- Each source tag maps to a JSON key or JSON path.
- The existing automatic live tag publishing remains separate and stable.

Example:

```json
{
  "messages": [
    {
      "id": "RemoteWriteBlock",
      "topic": "site1/plc1/write-registers",
      "payload_format": "json_key",
      "mappings": [
        { "key": "0", "connection_id": "PLC1", "tag_name": "Setpoint" },
        { "key": "1", "connection_id": "PLC1", "tag_name": "ModeCommand" }
      ]
    }
  ]
}
```

## Implementation Stages

1. Broker settings editor for `mqtt.json`.
2. Certificate upload/download for CA, client certificate, and client key.
3. Test connection endpoint.
4. Publishing and command write fields in the same editor.
5. Telemetry input mapping table/editor.
6. Outbound mapped topic editor.
7. Optional runtime status/system tags for MQTT connection state.

## Notes

- Existing `--mqtt` service flag still controls whether opcbridge starts MQTT.
- Saving `mqtt.json` should not imply MQTT is active if the service is not
  started with `--mqtt`.
- Sensitive fields should not be shown back to the browser unless they are
  already intentionally visible, such as the write token admin panel.
- Avoid arbitrary topic wildcard writes until there is a clear validation model.
