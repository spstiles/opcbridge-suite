# Remote writes and momentary controls

An HMI write to an OPC UA client connection is forwarded to the remote server,
which calls its configured source driver. Writable OPC UA nodes use a
status-returning value source: the write response is Good only when
`write_tag_by_name` reports success. A source-driver failure returns
BadNoCommunication and the originating OPCBridge reports a failed write.
Read-only, unsupported-type and index-range requests are rejected as well.
Normal OPC UA access controls still apply.

This confirms the driver's write operation, not that equipment physically acted
on the command. Physical tag values retain the normal readback/quality gate;
the UA node does not store an unconfirmed requested value as measured data.
Both the originating tag and the source tag must be configured writable.

HMI momentary actions serialize press and release requests, including repeated
clicks. Release is attempted even if the press response failed, since the press
may already have reached the server. Pointer cancellation, focus loss, hiding
the page and leaving the page also schedule release. Fetch keepalive supports
requests already dispatched during page departure, but a queued release cannot
be guaranteed after a browser crash, power loss or network failure. A PLC-side
command timeout is required when a guaranteed maximum hold time is needed.

The status-returning server change must be installed on the server owning the
source driver (and each forwarding server in a chain). Older servers can still
acknowledge a UA write without propagating a source-driver failure.

Local regression coverage: `test_ua_write_result.cpp` creates an isolated UA
server on port 48489 and uses the normal remote-client write path. It does not
connect to a live PLC. HMI sequencing and interruption cases are covered by
`opcbridge-hmi/test/momentary-write.test.js`.

Validation for this release: the core build, isolated forwarding test, existing
UA quality/namespace tests and 219 HMI tests passed. Live PLC validation of the
full cross-installation momentary-write path is pending.
