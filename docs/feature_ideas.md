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
