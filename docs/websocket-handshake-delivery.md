# Live update delivery during WebSocket connection

The core registers a viewer for broadcasts when its WebSocket `Open` event
arrives, after the handshake finishes. The earlier connection callback only
installs message handlers.

Previously, the connection callback registered the socket before it was open.
A concurrent tag broadcast could remove it as closed or not yet open. The
handshake could then succeed without restoring the broadcast registration.
The browser appeared connected but received no live tag updates. Returning to
the tab could temporarily refresh values through the HMI's catch-up HTTP read.

`opcbridge/test_ws_handshake.cpp` exercises real local WebSocket connections
while publishing tags every 2 ms. It covers immediate and delayed handshakes,
subsequent connections, continuous delivery, and cleanup after disconnect.
Its header contains the build and run commands. The test fails against the
previous implementation and passes with registration moved to `Open`.

This is a core fix and requires installing/restarting the updated OPCBridge
core service. An HMI-only update does not include it. Confirmation on the wall
display is still needed; its longer-term CPU and memory behavior remains a
separate investigation.
