# Runtime redraw batching

Incoming WebSocket tag values and quality continue to enter the cache immediately. Runtime rendering groups changed tag keys for 100 ms, then paints their affected regions on the next animation frame. This lets the browser process bursts of tag messages instead of repeatedly painting between individual messages. A full-screen request still overrides a partial repaint, and interactions retain their existing deferral behavior.

Rotation, flashing, pipe flow, and animator clocks keep their existing timing. Property edits still repaint directly. This changes display work scheduling, not OPC acquisition rates or tag-write execution.

A dirty-region batch takes one animation snapshot and filters it for each region. Animator frame painting similarly takes at most one snapshot per tick. Replaced animations are canceled; continuous rotations retained by the existing reuse mechanism stay running. Cleanup after a failed paint still checks the newly created staging tree directly.

## Local validation

A saved copy of the 7680×3600 wall Overview screen was served locally with mocked APIs. A local WebSocket source changed 537 unique connection/tag pairs once per second. The browser was Firefox 160 in headless mode at 1920×1080; these are controlled stress tests, not a recording of plant traffic or the wall computer's exact graphics environment.

The original run ended after approximately 197 seconds with the last received update about 14.4 seconds behind its source timestamp. The combined batching/snapshot experiment remained near 0.1 seconds in the final sample after approximately 181 seconds. This is evidence of improved receive freshness under that test, not proof of a complete fix for the production installation.

Memory still rose during the experiment, and idle animation CPU remains substantial. Those are unresolved follow-up investigations. Static frame-cache and nested-region experiments were evaluated separately and are not included in this change. No files or services on the wall display were changed during these tests.
