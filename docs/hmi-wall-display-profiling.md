# Wall display profiling — November 17, 2026

The wall display remained live overnight after the WebSocket handshake fix,
but its Firefox content process reached about 6 GiB RSS after 20 hours. The
operator observed occasional one-to-two-second pauses. System samples showed
one busy Firefox CPU core, no active swapping, and no I/O wait. The measurements
did not capture a pause directly.

## Local reproduction

Tests used the saved Overview screen (1,158 top-level objects, 107 frame
animators), current HMI JavaScript, Linux Firefox 160 in headless mode, and a
1920×1080 viewport. APIs and WebSockets were simulated locally; nothing was
written to plant tags or changed on the wall display.

The stress source changed 538 unique tag bindings once per second, including
the memory rotation tag. Each run loaded a new Firefox process; prototype runs
used separate profiles. The table describes a 90-second observation window after roughly
one minute of warm-up. These are short stress tests, not an overnight test or
a reproduction of the wall display's exact traffic and graphics environment.

| Experiment | Content RSS at start/end (MiB) | Approximate content CPU |
| --- | ---: | ---: |
| Pre-change baseline | 1,163 / 1,445 | 106% of one core |
| Frame animators disabled in the test fixture | 742 / 1,034 | 95% |
| Native stepped ellipse geometry prototype | 689 / 1,067 | 107% |
| Reused trend date-formatters prototype | 721 / 1,222 | 107% |

The native geometry experiment kept the imported frame positions, dimensions,
colors, and intervals while avoiding repeated construction of simple ellipse
frames. It reduced the observed footprint, but did not eliminate memory growth
or CPU saturation. Updating the existing ellipse attributes in JavaScript also
failed to materially reduce Chromium CPU usage. Neither experiment is included
in application code. Caching the trend formatters likewise did not resolve the
growth and is not included.

The visible document stayed near 21,000 elements during the baseline run;
gradient and clip counters did not continually grow. Removing frame animators
did not stop memory growth. Therefore frame reconstruction alone is not an
adequate explanation or a validated fix.

## Firefox memory reports

A separate baseline run captured Firefox memory reports before and after its
built-in memory minimization. The content process reported approximately
772 MiB resident before minimization and 685 MiB afterward; allocated heap fell
from 520 MiB to 489 MiB. Firefox reported no ghost windows. Much of the allocated
heap was unclassified by its normal reporters. This does not identify the
allocation owner, and RSS measurements alone do not establish a JavaScript leak.

Mozilla's [memory dumper implementation](https://github.com/mozilla-firefox/firefox/blob/main/xpcom/base/nsMemoryInfoDumper.cpp)
documents Linux signals SIGRTMIN for a memory report and SIGRTMIN+1 for a report
after minimization. These signals were sent only to disposable local Firefox
processes during this investigation.

## Wall session reports

The operator supplied the wall session's unminimized report at 13:41 on
November 17 (`unified-memory-report-1794944491-155559.json.gz`). Its HMI content
process (155695) reported 6,283.7 MiB resident and 5,666.6 MiB allocated heap;
5,538.6 MiB of that heap was unclassified. It reported zero ghost windows.
The largest individually reported content allocations were orphan DOM nodes
(25.3 MiB), text nodes (17.6 MiB), elements (11.6 MiB), and ICU (11.4 MiB).
The parent process also had substantial unclassified heap (902.2 MiB).

This confirms that the large footprint is principally in allocations not
attributed by Firefox's ordinary reporters, rather than a comparably large
reported JavaScript or live DOM collection. It does not identify the owner of
those native allocations or prove a browser defect. The raw report remains a
local diagnostic artifact and should not be committed with application code.

The post-minimization report at 13:45
(`unified-memory-report-1794944673-155559.json.gz`) retained the same HMI process.
Its resident memory fell from 6,283.7 to 5,936.3 MiB, allocated heap from
5,666.6 to 5,608.6 MiB, and unclassified heap from 5,538.6 to 5,516.4 MiB.
Orphan DOM nodes were reclaimed, but most unclassified heap remained. The
parent's resident memory fell from 1,009.6 to 883.7 MiB; its unclassified heap
remained 886.4 MiB. Memory minimization therefore does not resolve the large
footprint. This is insufficient to distinguish a native leak from retained
native caches or other native allocations.

## Allocation profiling and flashing isolation

An isolated Mozilla Nightly 162 build recorded native allocation stacks using
the built-in profiler. Mozilla limits this recording feature to
[Nightly builds](https://firefox-source-docs.mozilla.org/tools/profiler/memory.html).
The installed release browser and the wall display were not replaced. Native
addresses were resolved using Mozilla's symbol service; only library build
identifiers and code offsets were submitted, not screen data or profile files.

The sampled stacks showed substantial temporary JSON serialization in alias
resolution and nested drawing, plus native style and display-list allocation.
Replacing JSON copies with structured clones, and caching resolved regions in
a separate prototype, did not materially reduce resident memory in the local
test. Neither change is included in application code.

Disabling flashing alone, while retaining frame animators and simulated live
updates, reduced the minimized content heap's unclassified component to about
25 MiB, compared with 406 MiB in the baseline. Lifecycle instrumentation
confirmed that created per-object animations were being canceled. Detaching
canceled effects explicitly and replacing per-object Web Animations with
per-object CSS animations did not resolve retention.

## Implemented change: shared browser flash clocks

Flashing objects now inherit phases from two CSS animations on the document
root: fast (1-second period) and slow (2-second period). Objects select the
normal or inverse phase through inherited custom properties. Color layers
still use opacity, preserving composition with a child's visibility binding.
Visibility bindings still use visibility. Both clocks start at document time
zero, matching runtime hit testing and keeping redraws and popups in phase.

This preserves flashing while avoiding construction of hundreds of individual
animation effects whenever tag updates repaint their objects. The clocks live
outside the SVG trees that ordinary redraws replace or cancel. Rotation, pipe
flow, frame playback, tag acquisition, and tag-write paths are unchanged.

In the matched 90-second Firefox stress test, the document had two flash
animations instead of hundreds. After Firefox's diagnostic minimization,
unclassified content heap was approximately 36 MiB rather than 406 MiB, and
resident memory was approximately 295 MiB rather than 685 MiB. These figures
describe separate controlled test runs after cleanup, not steady-state memory
or an overnight guarantee. CPU remained busy; the 107 frame animators still
perform substantial rendering work.

Firefox and Chromium passed browser checks for both rates, normal/reverse
timing, exact half-period boundaries, visibility/opacity, redraw phase, popup
phase, and bounded animation count. All 373 HMI tests passed.

A five-minute soak of the implemented change kept two flash animations and
continued receiving simulated live values. Sampled update lag ranged from
19 to 111 ms. After the initial allocation ramp, content RSS fluctuated around
0.9–1.1 GiB; diagnostic minimization at the end reduced reported resident memory
to 335 MiB and unclassified heap to 27 MiB. There was no forced minimization
during the five-minute observation period. The run demonstrates bounded clock
count, continued updates, and reclaimability over this short interval, not a
proven long-term memory ceiling.

The exact native
allocation owner behind the wall's retained heap and the cause of its brief
pauses remain unproven; the shared-clock change requires an overnight wall
display check before calling those symptoms resolved.
