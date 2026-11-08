# OPC UA demand-driven subscriptions

OPC UA client connections now honor the existing **Tag polling** setting:

- **Poll active tags** (the default): upstream monitored items follow downstream
  demand, including HMI/WebSocket bindings, local OPC UA clients, recent reads,
  and registered alarms, logger, historian, automation, and trend consumers.
- **Poll all enabled tags**: retain monitored items for every enabled imported tag.

Importing/enabling a tag makes it available without permanently requiring a
subscription in active mode. The existing planner retains its 30-second startup
and 10-second idle grace periods. Startup can therefore briefly monitor all tags.
A stale/missing plan or a replacement driver epoch fails open to active polling.
MQTT publication mode retains the existing poll-all behavior.

A bridge reconciles monitored items at most once per second, deleting idle items
and creating newly demanded items in batches. Items for unaffected active tags
retain their IDs. Reconnect discards old IDs and recreates current demand. Failed
item creation retries after 30 seconds; fallback reads honor the same active set.
Suspension discards queued values and marks cached data inactive. Resume waits
for a fresh read/notification before restoring good quality. Inactive tags remain
in configuration and can wake when an HMI screen or background consumer needs them.

## Verification and rollout

The local integration test compiles the production reconciliation lambda and
runs it against an isolated OPC UA server. It checks active-only creation,
initial-value notification, idle deletion, stable unaffected item IDs, wake,
empty demand, and reconnect. Planner tests cover grace, background demand,
stale snapshots, and replacement epochs. This does not establish live performance.

For the wall-display setup, install on the OPC UA **client .39** first. Changing
only .45 does not alter .39's subscriptions. Keep the restored PLC polling engine
on .45 and retain all tag definitions. Validate Overview values and other screens,
background logging/alarms, and screen transitions. Observe `.45 /polling/demand`
after grace expires: Field Ops should no longer have one active monitored item
for every imported tag unless another client actually requests them all.

Do not disable production consumers solely to obtain a faster benchmark. Compare
actual HMI updates, active monitored-item counts, and packet traffic before making
further PLC polling changes. No live machine configuration is changed by this patch.

An OPC UA client with all imported tags inactive is an intentionally idle
connection, not a failed connection. Activity accounting includes native UA work
even though it has no libplctag handles. Known upstream communication errors still
report an error while idle. A connection's availability and the demand for its
individual tag values are separate observations.
