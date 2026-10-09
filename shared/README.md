# Shared suite code

Libraries used by multiple OPCBridge applications live here. They run inside
the consuming applications and do not introduce separate services or ports.

- [audit](audit/README.md): event validation, durable forwarding, and collection
  support used by HMI and SCADA. SCADA owns the central collector and viewer.

Installation preserves this layout under `/opt/opcbridge-suite/shared/`.
