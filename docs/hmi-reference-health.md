# HMI reference checks

Current-screen reference checks and system-wide checks have separate refresh
behavior. Editing a tag binding saves its values immediately. Canvas redraws and
queued reference/subscription checks wait while focus remains in the shared
connection/tag control or its picker.

System Reference Health opens its cached results without loading or scanning
screens again. Select **Scan All Screens** to run a full check. The panel shows
progress and retains the previous results until the scan completes. Reopening
it during a scan shows those results and the current progress without starting
another scan.

Saving screens, refreshing the screen list, or refreshing the tag catalog marks
system results **out of date** while retaining them. Current-screen checks update
only that screen's cached issues. They do not scan other screens. If configuration
changes during a full scan, the resulting scan remains marked out of date.

The cache lasts for this browser page session. Before the first explicit scan,
the badge says **Not scanned** rather than implying the entire system is valid.
A full scan uses the current editor contents for the open screen and saved files
for other screens. Unreadable screens appear as issues; they are not reported as
valid.
