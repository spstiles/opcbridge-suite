# Server endpoints

Set alarm and historian endpoints in SCADA → Configure Server. These are shared
server settings; HMI Settings contains no separate endpoint fields for them.

The historian host and API port (8096 by default) apply to SCADA historian
requests and HMI historical trends. Saved changes apply to subsequent requests
without restarting the HMI. Existing historian values in the HMI configuration
file are ignored; check Configure Server after upgrading.

Installed HMI services read the shared file through `OPCBRIDGE_SCADA_CONFIG`.
Custom launchers should point this variable at the same file SCADA uses.
