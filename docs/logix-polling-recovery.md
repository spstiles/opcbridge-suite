# Logix polling recovery

Logix tag creation and reads use per-tag retry backoff after failures: 1, 2, 4,
8, 16, then at most 30 seconds. Successful reads reset the backoff. Healthy tags
retain their configured scan interval. A failed tag stays visible with bad
quality while waiting for its retry; it is not disabled or silently removed.

A previous libplctag read error does not prevent the next read from starting.
Pending operations are still excluded from a new batch. Retry backoff applies
both with asynchronous batching and with a configured reads-per-second limit.

This reduces repeated failed-tag work. It does not eliminate a failing request's
initial timeout, change the configured batch size, or parallelize startup handle
creation. Verify steady-state performance after startup completes.

On Field_Ops_PLC0 at 192.168.100.45, the pre-change two-lane sample intervals for
PLC_Second were 16.541, 15.901, and 17.180 seconds. These are baseline observations,
not measurements of the recovery change; deployment and a comparable observation
are needed to establish its effect.
