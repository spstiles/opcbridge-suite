# Third-Party Notices

This project includes and/or links against third-party software. The following notices apply.

## libplctag

- Project: libplctag
- Upstream: https://github.com/libplctag/libplctag
- Use: Allen-Bradley EtherNet/IP tag read/write (driver layer)
- License: Dual-licensed (MPL 2.0 OR LGPL) — see included license texts:
  - `third_party/licenses/libplctag/LICENSE-1.MPL`
  - `third_party/licenses/libplctag/LICENSE-2.LGPL`

Notes:
- This repo links against `libplctag` (typically via the system-provided `libplctag.so`).
- If you build `libplctag` from source, record the exact commit/tag used in your build notes for traceability.


## open62541

The bundled `opcbridge/open62541.c` and `opcbridge/open62541.h` are distributed
under the Mozilla Public License 2.0, as stated in their source headers.
OPCBridge adds optional monitored-item/Read observation hooks and opt-in deferred
Read verification. Deferred completion validates the live operation and its unique
token under the server lock; default read behavior is unchanged. Rebuild the C library and all
callers together; preserve or port the hooks on an upstream upgrade. See
`docs/design/active-tag-polling.md` for scope and validation.
