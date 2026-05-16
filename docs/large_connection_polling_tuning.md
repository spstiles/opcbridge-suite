# Large Connection Polling Tuning

This is a practical starting guide for tuning large OPC connections in opcbridge.

## Rule of Thumb

Keep polling boring and predictable.

Avoid giant bursts, avoid one-tag reads when possible, and tune the connection so each scan can make steady progress without overwhelming the device.

## Starting Settings

For a large connection, start with:

```text
Polling mode: Time Sliced
Polling pacing: Balanced
Batch size: 50 to 100
Time budget: 500 to 1000 ms
Max reads/sec: 250 to 500
Poll lanes: 1
```

For a connection around 3000 to 4000 tags, a good first test is:

```text
Polling mode: Time Sliced
Polling pacing: Balanced
Batch size: 75
Time budget: 750 ms
Max reads/sec: 350
Poll lanes: 1
```

## How To Adjust

If stale values climb and stay high:

- Increase time budget.
- Increase max reads/sec if the measured read time is fast enough to use it.
- Try poll lanes = 2 if one lane is clean but the connection cannot sweep fast enough.

If device response gets slow or errors increase:

- Reduce batch size.
- Reduce max reads/sec.
- Keep lanes at 1 unless the device is known to tolerate parallel reads.

If updates are smooth but too slow:

- Increase max reads/sec first.
- Then increase batch size gradually.
- Try lanes = 2 only after single-lane polling is stable.

If stale briefly spikes and returns to 0%:

- This is usually acceptable.
- The connection is catching up.
- Avoid over-tuning for short spikes.

## Batch Size

Batch size controls how many tags are grouped into a read request.

Good starting range:

```text
50 to 100
```

Larger batches can be efficient, but they can also make individual reads slower or more fragile. Smaller batches are gentler but may increase total overhead.

## Time Budget

Time budget controls how long the connection is allowed to spend reading during a cycle.

For large lists, the time budget should be large enough for steady progress, but not so large that one connection monopolizes the runtime.

Good starting range:

```text
500 to 1000 ms
```

## Max Reads/Sec

Max reads/sec limits how many tag reads are attempted per second.

This is often the best first setting to raise when a large connection is healthy but falling behind.

Good starting range:

```text
250 to 500
```

If measured read time is slow, max reads/sec may become theoretical. For example, one lane averaging `40 ms/read` can only complete about `25 reads/sec` even if max reads/sec is set much higher.

## Lanes

Lanes allow multiple read paths for the same connection.

Start with:

```text
1
```

Try `2` only when:

- The device handles the single-lane setup cleanly.
- Network and CPU usage look normal.
- The stale percentage remains too high.

More lanes are not automatically better. Some devices slow down or become less reliable when multiple read requests hit them at the same time.

## Health And Stale Status

The connection health display should be judged against what the connection can actually read. A large connection with slow but successful reads may show stale values even when the PLC is not returning errors.

Useful system tags:

```text
System/Connections/<id>/StalePercent
System/Connections/<id>/BadCount
System/Connections/<id>/MissingCount
System/Connections/<id>/BadHandleCount
System/Connections/<id>/ReadMsAvg
System/Connections/<id>/PollLanes
```

If `BadCount`, `MissingCount`, and `BadHandleCount` are low or zero, but `StalePercent` is high, the connection is usually reading successfully but not sweeping the full tag list fast enough.

If `BadHandleCount` is high, fix or disable those tags separately. Bad handles do not become good by increasing polling speed.

## Practical Notes

Commercial SCADA systems often hide slow refresh behavior by showing cached values confidently while updates happen in the background. opcbridge exposes more of the actual polling state, so stale percentage can look alarming even when the connection is functioning.

For large connections, tune for:

- Stable updates.
- Low sustained stale percentage.
- Low bad/missing count.
- Predictable response time.

Do not chase perfect zero-stale behavior if short spikes recover quickly.
