# HMI trend widget

In HMI edit mode, open **Widgets** on the side toolbar and choose **Trend**. Resize and position it like other panel objects. In Properties:

- Choose **Rolling cache** (the default) or **Historian** as the data source.
- Set a title and time window (15 minutes through 7 days in the selector).
- Add up to twelve traces, each with a description, source tag, color, independent minimum/maximum scale, and decimal precision.
- Select tags using the ordinary Source picker. Friendly connection names and exact tag names work as elsewhere in the HMI.
- Choose **Expression** as a trace source and click **Edit Expression…** to use the standard expression editor and tag picker. For example, `tag("Plant PLC", "Flow") * 2` or `tag("Plant PLC", "Inlet") + tag("Plant PLC", "Outlet")`. Arithmetic, comparisons, logical operators, `min`, `max`, `abs`, `round`, `floor`, `ceil`, and `quality(tag(...))` are supported. Expressions must produce a finite number (booleans plot as 0/1).
- Expression history currently requires **Rolling cache**. The server samples the result approximately once per second, retains it across restarts, and keeps the referenced tags active with no browser open. Invalid or unavailable inputs and division by zero leave gaps. Changing the expression starts a separate series; earlier results are not recalculated. Historian mode reports that expression history is unavailable rather than deriving results from already aggregated tag buckets.
- A **Constant line** draws a reference level without creating polling demand.
- Chart refresh defaults to 60 seconds; current samples update between queries.

Each enabled trace has a colored scale. The legend shows its latest plotted value/time. Cached and historical buckets plot averages with min/max spans to preserve observed peaks. Bucket timestamps identify the beginning of the interval. Bad samples and missing data create gaps. Editor preview displays the axes and legend without invented data.

## Rolling cache

**Save the screen to begin collection.** The HMI service discovers saved trends within ten seconds, registers polling demand with its configured OPCBridge server, and samples its tag cache approximately once per second. It continues with no browser open. All saved cache-mode screens contribute, not just the startup screen. Shared tags are collected once and retained for the longest configured window.

A newly configured three-day trend starts empty and builds three days of data; it cannot reconstruct earlier values. Unsaved widgets can display current browser samples but do not start background collection. Constant lines, historian-mode widgets, and disabled traces do not create background cache demand. Remove a trace or saved screen to release its demand on the next configuration scan.

Retention is rolling, not permanent historian recording. Storage uses bounded min/max/average buckets, with resolution chosen from the retention window and configured tag count. Limits are 256 distinct input tags and 256 series (tags or expressions), 6,000 buckets per series and approximately 250,000 buckets total. Longer windows have coarser buckets. This is a display cache, not a guaranteed capture of every PLC change; source polling and the one-second collector interval limit what it can observe.

The cache checkpoints atomically every 30 seconds and on normal HMI service shutdown. It restores after a restart and marks collection interruptions as gaps. A sudden power loss may lose samples since the last checkpoint. Defaults:

- Saved screen root: the normal HMI `screens` directory (including subdirectories).
- Cache file: `/etc/opcbridge/hmi/.trend-cache/cache.json`, or the corresponding path under `OPCBRIDGE_HMI_FILES_ROOT`.
- Override the cache file with `OPCBRIDGE_HMI_TREND_CACHE_PATH`.
- Status: `/api/trends/status`.

Cache storage must be writable by the HMI service user. A storage error is displayed without discarding the in-memory data. Changing the configured OPCBridge server clears the old source's cached data. Cache-mode pens need concrete connection/tag bindings; unresolved alias templates cannot be collected without a viewer and are skipped.

## Runtime controls

**Pause** freezes the displayed window; it does not stop the server cache collector. **Live** returns to the recent window. Arrows move backward/forward by one window and Refresh reloads data. Display navigation does not alter the saved screen. Browser-side queries stop for hidden tabs and detached widgets; the independent server cache keeps collecting.

## Historian mode

Historian mode enables **Start**, **End**, and **Load** controls in the runtime widget. Operators can load a past interval of up to 31 days, navigate it, or return to Live. These selections are runtime state, not saved screen edits.

The selected tags must be recorded by OPCBridge Historian, with matching connection IDs and tag names. This widget does not automatically enable recording. HMI Settings has a **Historian** host and API port, default `127.0.0.1:8096`. The HMI backend queries this API; the browser does not contact it directly. The historian listens on loopback by default, so the default setup uses the historian on the HMI server. Entering another machine's IP alone does not make its loopback API reachable; remote access and translating imported UA tag identities require separate deployment configuration.

Failures are displayed rather than converted to zeroes. Live browser samples can continue when historical data is unavailable. Historian requests use approximately 1,200 min/max/average buckets per trace.

To reproduce Trend Overview, insert four widgets with the same six traces. Choose two-hour and three-day windows. Low-flow maxima are 30 for Lift Station 1, 6 for the four metering traces, and 60 for effluent. High-flow maxima are 90, 30, and 120 respectively. Titles, colors and scales are configurable.
