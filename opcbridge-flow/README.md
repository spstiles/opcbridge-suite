# OPCBridge Flow

OPCBridge Flow is the suite's visual data-flow service. It is intentionally
separate from the existing Automation page and service so current automations
continue to work while the new workflow is developed and proven.

The first node set supports OPC tag input and output, MQTT subscribe and
publish, manual test input, linear scaling, Boolean inversion, datatype
conversion, and debug/monitor output.

## Safety model

- Saving changes creates a draft; it does not change the running flow.
- Deploying validates and stores the complete flow before replacing its
  currently deployed version.
- Deployment and configuration changes never create data events.
- Missing, null, bad-quality, and stale data are rejected before an output
  write.
- Monitor mode evaluates a flow without writing to OPC tags or publishing to
  MQTT.
- Updating one flow does not redeploy unrelated flows or reconnect the shared
  MQTT client.

## Build

```bash
make -B -C opcbridge-flow
```

The suite installer includes Flow in a full installation. It can also be
installed independently:

```bash
sudo ./install.sh --flow-only --deps -y
```

The default service listens on `127.0.0.1:8098`. Flow definitions are stored
in `/etc/opcbridge/flow/flows.json`; the last successfully deployed versions
are stored separately under `/var/lib/opcbridge/flow/`.

Use **SCADA > Flows** to create, connect, test, monitor, and deploy flows.

### Experimental verified tag inputs

For a controlled active-polling test, an `opc_tag_input` node can opt in to
verified physical samples in its JSON configuration:

```json
{
  "connection_id": "PLC",
  "tag_name": "Input",
  "require_fresh_read": true,
  "fresh_max_age_ms": 0,
  "fresh_timeout_ms": 1000,
  "poll_interval_ms": 1000
}
```

Existing nodes keep their cached-read behavior by default. With verification
required, Flow uses OPCBridge's `/polling/fresh-read` endpoint and emits only a
matching, verified, non-null GOOD sample. A timeout, unsupported source, older
core without the endpoint, or malformed response produces a node error and no
input event. There is no cached-read fallback. The core currently verifies only
physical Allen-Bradley scalar inputs, generated array elements, and poll-derived aliases/bits; memory-backed values and whole-array roots are not supported
by this experimental path yet.

`fresh_max_age_ms` accepts integers 0..60000; zero requires a read started after
the request. `fresh_timeout_ms` accepts integers 0..5000. Waiting uses normal core
polling, so a scan interval longer than the wait can cause verification to time
out. This setting does not enable active-only polling or change PLC scan rates.

Cached inputs recognize the core's explicit `inactive` and `waiting` lifecycle
states. When a deployed input wakes a source, Flow retries those matching-tag,
non-GOOD responses every 250 ms for at most five seconds, then resumes the configured
interval. This lets long-interval inputs initialize after a wake without emitting a
null or bad value. Ordinary errors, older cores without lifecycle metadata, and
mismatched tags keep their existing polling behavior. Verified inputs continue to
use their configured freshness deadline instead of this cached-read retry.
