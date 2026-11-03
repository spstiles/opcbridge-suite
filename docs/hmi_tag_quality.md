# Displaying tag quality in the HMI

For a Text or Button Label placeholder binding, select the tag and set **Property** to **Quality**. Existing bindings default to **Value**.

For an Indicator, open its **Source** tag picker, select **Quality**, and configure Equals states using `GOOD`, `BAD`, `WAITING`, `INACTIVE`, or `UNKNOWN`. `UNKNOWN` means no quality has arrived yet. Waiting and inactive reflect the polling state, rather than a PLC fault.

Color and visibility expressions can use `quality("connection", "tag") == "GOOD"`. The function returns the same uppercase quality labels. A quality reference subscribes to the underlying tag and creates polling demand just like a value reference.

Quality changes update the display even when the value does not change. The last good value remains available to ordinary value bindings when quality turns bad.
