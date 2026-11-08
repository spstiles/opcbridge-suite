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

## Polling diagnostics

`/health` → `connections` → connection ID → `poll_diagnostics` and `/metrics`
expose the same per-connection cumulative timings. Counters are shared across
polling lanes and live for the lifetime of the connection metrics object. Compare
counter differences over the same measurement window after startup, rather than
comparing lifetime averages from connections with different startup histories.
Snapshots use relaxed atomic reads and can be slightly inconsistent while polling
continues. This is diagnostic telemetry, not an accounting ledger.

Each timing has `count`, `total_ms`, `avg_ms`, and `max_ms`:

- `lock_wait`: acquiring the lifecycle and connection gates for a tag operation.
- `handle_open`: deferred creation and readiness checking, including failed attempts.
- `batch_select`: choosing due, eligible tags for a Logix batch.
- `batch_queue`: time inside the batch's nonblocking libplctag read submissions.
- `batch_wait`: remaining batch elapsed time outside submission and capture,
  including status checks, client/PLC waiting, polling sleeps, and loop overhead.
- `batch_capture`: decoding and copying completed values into prefetched results.
- `result_processing`: processing a consumed result through cache, alarms, and
  publication queueing, excluding configured pacing sleeps. Prefetched decode is
  reported separately in `batch_capture`.

`batches`, `requests`, and `batch_size_avg` describe actual asynchronous Logix
batches in Standard and Time-Sliced mode. `errors` and `timeouts` count batch
completion outcomes. Canceled requests are aborted using the timeout status and
are included in both; `cancelled_requests` identifies those shutdown/reload aborts.
These batch counters exclude deferred creation and synchronous fallback reads.
Timings can overlap across lanes and are not pure network or PLC execution times.
No packet logging or per-tag log stream is enabled by these counters.
