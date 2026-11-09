# Validate Tags

In Workspace, open **Validate Tags…** beside the Live Tags refresh button. Select a connection and choose **Validate Connection**. The selected tree connection is preselected when available. Validation reads saved runtime tags, so save and apply configuration changes before scanning them.

The scan temporarily requests polling demand for up to 64 enabled tags at a time, using the existing polling limits. It does not write PLC values or change polling configuration. Disabled tags are listed as skipped. Normal Live Tags viewport polling continues independently.

Results distinguish:

- **Good**: a refreshed good sample was observed, or an inactive/waiting tag became active with good quality.
- **Read failed**: a refreshed bad sample or unusable tag handle. The API currently exposes quality and a reason, not detailed per-tag PLC error codes. A failed read can be caused by an address/datatype problem or a communication failure; it is not proof of an invalid configuration.
- **Unverified**: no refreshed sample arrived within the batch timeout. Cached values alone do not establish a new successful read. Unchanging OPC UA source timestamps may also prevent fresh verification.
- **Untested**: cancellation or a request failure prevented checking the tag.
- **Disabled**: the tag was disabled and was not read.

Choose a 30, 60, or 120 second batch timeout for slower connections. Results show problems and untested tags by default, can be searched, and are paged in groups of 100. Clear the filter to include good and disabled results. **Retry Failed / Unverified** checks only failed, unverified, and untested tags for the selected connection, using current runtime metadata.

Keep the dialog open while scanning. **Cancel**, **Close**, or Escape stops the scan and releases its temporary demand. Closing/reloading the browser ends the scan; if cleanup cannot reach the server, its demand lease expires after 60 seconds without renewal. Results remain available for the current SCADA page session and are replaced when rescanned. Background consumers such as alarms and HMI trends retain their own demand.
