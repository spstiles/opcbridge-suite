# Feature Ideas

## Configuration Publish / Peer Distribution

Idea:
- Configure one `opcbridge-suite` server and publish selected configuration/artifacts to other `opcbridge-suite` servers.

Why:
- Multi-node deployments will otherwise drift.
- HMI screens, images, users, and selected config sections are likely to need promotion across servers.

Desired behavior:
- Authenticate to peer servers.
- Maintain a saved list of peer targets.
- Choose what to publish instead of forcing full-server overwrite.
- Preview diffs before apply.
- Validate version/capability compatibility on the target.
- Apply through API, not ad hoc file copy.
- Record audit events for publish actions.
- Optionally restart only affected services after apply.

Likely publish units:
- HMI screens
- HMI images/library assets
- users / roles
- alarms configuration
- selected config sections
- reports / report definitions

Non-goals:
- No indefinite support for multiple internal config formats.
- No blind full-instance overwrite by default.

## Federated Multi-Node Management

Idea:
- Support multiple autonomous `opcbridge-suite` installations that share selected administrative configuration without becoming a runtime-dependent cluster.

Example:
- A large treatment facility may have an OPCBridge computer at each end of the plant.
- Each computer controls and monitors the equipment it can reach locally.
- If the plant network is interrupted, both systems continue operating their respective areas.
- Under normal conditions, shared administration such as users and roles is performed once instead of separately on every computer.

Architecture:
- Give every installation a unique node ID.
- Designate one installation as the Management Node / Authoring Node initially.
- Perform screen development, user and role management, report creation, alarm configuration, and other shared administration on that node.
- Keep changes in a draft workspace until an authorized user explicitly publishes them.
- Never allow remote nodes to retrieve or apply unpublished drafts.
- Publish signed, versioned, target-specific configuration bundles only through an explicit user action.
- Allow an offline node to retrieve an already-approved published release when it reconnects without requiring drafts to synchronize automatically.
- Retain the last valid synchronized configuration locally so operation and authentication do not depend on continuous access to the authority node.
- Use eventual synchronization when network connectivity returns.
- Keep all process control, PLC polling, alarm evaluation, history collection, and writes local to the responsible node.
- Prefer a dedicated Management Node that is separate from production control. If it also operates a plant area, isolate drafts from its live runtime until publication.

Deployment profiles and content collections:
- Assign every target a persistent deployment profile that controls which content it may receive.
- Maintain named content collections such as `Shared Identity`, `Panel HMI Screens`, `Control Room Screens`, `Plant Reports`, `Site A Alarms`, and `Common Images`.
- Let profiles subscribe to selected collections instead of forcing every node to receive a complete server image.
- Generate a target-specific effective manifest during publication.
- Support production, test, development, site, and device-class target groups.
- Allow different HMI screen sets and default screens for panel-mounted devices, control rooms, and other clients.
- Exclude reporting definitions, templates, services, and UI access from panel HMIs that do not need reporting.
- Automatically include required dependencies, such as images and library assets referenced by selected screens.
- Show precisely which files and configuration categories each target will receive before publishing.

Example profiles:
- `Panel HMI`: shared users/roles, panel-specific screens, required screen assets, selected alarms, no reports, and local PLC configuration.
- `Plant Server`: shared users/roles, full HMI screen set, selected alarms, reports/templates, and local PLC/historian configuration.
- `Development/Test`: selected pre-production content for validation before publishing to production targets.

Suggested ownership:
- Users, roles, and permissions: shared and centrally managed.
- HMI screens and library assets: shared globally or assigned by site/node.
- Alarm definitions: shared globally or assigned by site/node.
- PLC connections and tags: normally node-specific.
- Historian configuration: node-specific.
- Report definitions: optionally shared, with data sources resolved locally.
- Runtime state and control commands: never synchronized as configuration.

Desired behavior:
- Allow existing synchronized users to authenticate locally during a network partition.
- Replicate password hashes and salts, never plaintext passwords.
- Keep users, roles, and permissions in a shared identity collection so authentication remains consistent across selected nodes.
- Keep a local emergency administrator account outside synchronized identity so a node cannot be permanently locked out by a publication error.
- Show node health, connection state, software version, and applied configuration revision in SCADA.
- Preview and validate configuration changes before publishing.
- Require manual promotion from draft to published revision.
- Let the publisher select target nodes, target groups, and content collections for each release.
- Audit configuration publication, receipt, validation, and application on both the authority and receiving nodes.
- Reject incompatible bundles based on suite version or declared capabilities.
- Apply configuration atomically and retain the previous valid revision for rollback.
- Prevent centrally managed content from being edited directly on receiving nodes.

Phased implementation:
1. Add stable node identities and node-health reporting.
2. Synchronize users, roles, and permissions.
3. Add versioned distribution of HMI screens and library assets.
4. Add selectively owned alarm definitions and other configuration categories.
5. Consider delegated administration or multi-authority workflows only if operational experience demonstrates a need.

Non-goals:
- No dependency on another node for local runtime operation or control.
- No continuous synchronization of work in progress.
- No automatic publication of saved drafts.
- No automatic forwarding of PLC writes between nodes.
- No forced installation or exposure of unused features on a target node.
- No overwrite of node-local connections, tags, ports, secrets, historian settings, or other excluded categories.
- No multi-master editing in the first implementation.
- No automatic conflict merging for changes made independently during a partition.
- No requirement for traditional cluster consensus, shared process memory, or shared runtime state.

## HMI Touchscreen Runtime Endpoint

Idea:
- Provide a dedicated HMI endpoint such as `/touch` or `/tablet` for tablet/kiosk operation.

Why:
- Tablets and panel PCs need a runtime-only experience with touch-friendly data entry.
- A dedicated URL makes the intended mode explicit and easy to bookmark or kiosk.
- The same HMI screens can be reused because runtime scaling already exists.

Desired behavior:
- Serve the normal HMI runtime screens and assets.
- Force touchscreen runtime mode when loaded through the touch endpoint.
- Disable edit-mode entry and edit shortcuts from that endpoint.
- Apply touch-focused runtime behavior without changing screen definitions.
- Use large popup keypad/keyboard dialogs for data entry.
- Use the same touch-friendly entry dialogs for number inputs and prompt-write actions.

Non-goals:
- No duplicated HMI screen files for tablet mode.
- No automatic geometry changes to objects on the screen.
- No separate editor experience for touchscreen mode in the first version.

## SCADA Report Portal with XLSX Templates

Idea:
- Generate downloadable reports from predefined report definitions and optional `.xlsx` workbook templates.
- Serve the report viewing/downloading UI from `opcbridge-scada`, while `opcbridge-reporter` remains the backend report generation engine.

Why:
- `.xlsx` is the standard spreadsheet format in most office environments and opens cleanly in Excel and LibreOffice.
- CSV is useful for raw data, but formatted reports need headings, date ranges, totals, multiple sheets, charts, and controlled layouts.
- HMI should stay focused on SVG-based runtime graphics, not become a widget-heavy reporting interface.
- `opcbridge-scada` already runs as a service and already owns configuration, permissions, and admin workflows.
- `opcbridge-reporter` currently has no web server, so keeping UI hosting in SCADA avoids adding unnecessary HTTP/UI surface to reporter.

Desired behavior:
- Keep CSV export as the simple/raw data option.
- Add `.xlsx` report generation without requiring Excel or LibreOffice to be installed on the server.
- Allow an admin to upload/manage `.xlsx` templates and map report data into named cells, ranges, or tables.
- Support report parameters such as date range, site/equipment, tag group, and summary interval.
- Provide a SCADA-served report portal, such as `/reports`, for authorized users to choose available reports, set parameters, and download generated workbooks.
- Hide normal SCADA configuration tabs from report-only users and show only the report portal UI.
- Keep report/template design, report definitions, schedules, and permission management in SCADA/admin tools.
- Use `opcbridge-reporter` for the actual report rendering/generation work.
- Record audit events for report generation/downloads.

Non-goals:
- No report viewing/downloading UI inside HMI runtime.
- No full report designer inside HMI runtime.
- No new web server requirement for `opcbridge-reporter` in the first implementation.
- No dependency on desktop office applications for server-side generation.
- No replacement of CSV where raw export is sufficient.

## HMI Property / Automation Clipboard

Idea:
- Add right-click actions to copy and paste automation, tag bindings, and other dynamic object properties between HMI objects.

Why:
- Many screens reuse the same automation patterns across similar objects.
- Editing connection/tag fields repeatedly is slow and error-prone.
- Copy/paste would make bulk HMI setup faster without creating rigid widgets.

Desired behavior:
- Right-click object actions such as `Copy Automation`, `Paste Automation`, `Copy Tag Bindings`, and `Copy Dynamic Properties`.
- Paste only compatible properties supported by the target object type.
- Support targeted copy groups such as visibility, color automation, rotation, motion, multi-state, and text/button bindings.
- Keep paste behavior forward-only and object-type aware instead of trying to preserve legacy formats.
- Show a small result message such as `Pasted 3 automation settings`.

Non-goals:
- No forced object cloning when only automation or bindings are wanted.
- No pasting unsupported properties silently into object definitions.

## HMI Runtime Data Quality Indication

Idea:
- Make bad, stale, missing, or disconnected runtime tag data obvious to operators.

Why:
- Operators need to distinguish real process values from untrustworthy HMI data.
- Commercial HMI packages commonly gray out affected objects and show placeholder values when data is unavailable.
- This makes PLC/connection failures visible from the screen without opening diagnostics.

Desired behavior:
- Text/value bindings show placeholders such as `???` or `???.??` based on configured digits/decimals when data is invalid.
- Objects driven by invalid automation tags render in a faulted/desaturated gray state.
- Treat missing tag, missing connection, no value received, stale value, and bad quality as invalid data.
- Preserve the normal/default object appearance when automation is valid but false/off.
- Consider a global runtime option for enabling/disabling data-quality indication.
- Show enough detail in edit/properties panels to identify the bad connection or tag.

Non-goals:
- No silent substitution of zero or false for bad data.
- No masking a PLC/connection problem as a normal process state.

## OPCBridge Tag Quality Reason Codes

Idea:
- Add explicit reason/status details alongside the current binary tag quality value.

Why:
- `quality` currently only indicates `good` or `bad`, which is not enough to explain what failed.
- Operators and maintainers need to distinguish read failures, bad handles, missing snapshots, unsupported datatypes, stale data, source tag issues, and conversion failures.
- Better reason details would improve SCADA live tags, HMI diagnostics, health panes, audit logs, and troubleshooting without requiring journal inspection.

Desired behavior:
- Keep the existing binary `quality` field for simple consumers.
- Add a companion field such as `quality_reason` or `status_text`.
- Use stable reason values such as `ok`, `read_failed`, `bad_handle`, `no_snapshot_yet`, `decode_failed`, `unsupported_datatype`, `source_missing`, `source_bad_quality`, `conversion_failed`, and `stale`.
- Include the reason in `/tags`, websocket tag updates, connection health summaries, and relevant audit/history rows.
- Show human-readable reason text in SCADA/HMI where useful, while preserving compact display by default.

Non-goals:
- No replacement of the existing `0/1` quality field in the first version.
- No dependency on a full OPC UA status-code model before adding useful diagnostics.

## HMI Color Picker Favorite Swatches

Idea:
- Allow users to save frequently used custom colors as reusable favorite swatches in the HMI color picker.

Why:
- Screen development often reuses project-specific colors that are not part of the standard palette.
- Re-entering RGB/hex values repeatedly is slow and error-prone.
- Favorites would preserve the current palette workflow while making repeated custom colors faster to apply.

Desired behavior:
- Add a `Favorites` swatch row in the color picker.
- Provide a simple `+` action to save the current solid color as a favorite.
- Click a favorite swatch to apply it to the active color field.
- Allow removing a favorite swatch by right-click or a small delete action.
- Show RGB/hex tooltip details for each favorite.
- Store favorites in browser `localStorage` initially, with possible server/user settings later.

Non-goals:
- No gradient favorites in the first pass.
- No requirement to synchronize favorites across machines initially.

## Read-Only Inbound SIP Status Line

Idea:
- Allow an authorized caller to dial into `opcbridge-alarms` and hear a read-only status report.

Why:
- Once SIP callout is configured, the same SIP account could eventually provide a low-friction way to check site health remotely.
- Operators or support staff may want a quick spoken summary without opening SCADA or VPN tools.

Desired behavior:
- Add an explicit `Enable inbound SIP status` setting, disabled by default.
- Register a persistent SIP listener using the configured SIP account.
- Answer incoming calls automatically only when inbound status is enabled.
- Play a TTS summary of active alarms, unacknowledged alarms, connection health, and selected system/diagnostic status.
- Optionally support a small DTMF read-only menu such as alarm summary, connection status, repeat, and hang up.
- Log inbound calls and status-menu usage for diagnostics.

Non-goals:
- No alarm acknowledgement from inbound calls.
- No tag writes or process control from inbound calls.
- No inbound behavior enabled implicitly by normal outbound SIP callout settings.
