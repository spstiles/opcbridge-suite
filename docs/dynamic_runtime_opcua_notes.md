Dynamic Runtime / OPC UA Namespace Notes

Problem
- Full runtime rebuilds are too disruptive as tag counts grow.
- With large systems, adding one tag or connection should not make the UI feel offline.
- Rebuild currently combines too much work: config load, driver handles, pollers, tag table, OPC UA namespace, and runtime bindings.
- Startup and rebuild behavior can make a working system look broken while large configs are being processed.

Goal
- Keep SCADA and runtime visible/usable while changes are applied incrementally.
- Make normal configuration work local to the affected connection where possible.
- Reserve full OPC UA namespace rebuilds for explicit user action or startup.

Target Workflow
- Save: write config only.
- Apply Polling Changes: reload only affected connection(s), keeping the rest of runtime alive.
- Rebuild OPC UA Namespace: explicit full runtime/OPC UA rebuild when namespace structure must be synchronized.

Runtime Apply Direction
- Apply changed connection/tag deltas asynchronously.
- Return a job/status quickly instead of blocking SCADA.
- Update affected pollers without stopping all pollers.
- Preserve existing tag values where possible.
- Continue serving HTTP/SCADA status while runtime work is in progress.

OPC UA Direction
- Default behavior can remain stable namespace mode:
  - OPC UA namespace is built at startup or explicit rebuild.
  - Existing nodes continue to update.
  - New/deleted/renamed tags may require explicit namespace rebuild.
- Future dynamic mode should be conservative:
  - Add new connection object nodes at runtime.
  - Add new tag variable nodes at runtime.
  - For deletes/renames, retire old nodes first rather than deleting immediately.
  - Full rebuild cleans up retired nodes.
- Avoid surprising OPC UA clients that cache NodeIds, browse results, and datatypes.

Suggested OPC UA Object Model
- Connections
  - <ConnectionId>
    - Tags
    - Diagnostics
    - Config
- Diagnostics should include:
  - Poll progress
  - Read rate
  - Expected sweep time
  - Stale/bad ratio
  - Last read age
  - Poll lanes

NodeId Strategy
- Prefer stable string NodeIds based on canonical identities.
- Examples:
  - ns=2;s=conn:Field_Ops
  - ns=2;s=tag:Field_Ops:Lift_Station_01.History.Flow_Day_01
  - ns=2;s=diag:Field_Ops:PollProgress
- Display names may change; NodeIds should only change when logical identity changes.

Implementation Slices
1. Finish UI clarity first.
2. Make targeted connection apply asynchronous and non-blocking.
3. Add runtime job/progress status APIs.
4. Add dynamic OPC UA add-only nodes.
5. Add retired-node behavior for deletes/renames.
6. Keep full rebuild as explicit cleanup/synchronization.

