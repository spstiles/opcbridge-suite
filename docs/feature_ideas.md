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
