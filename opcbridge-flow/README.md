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
