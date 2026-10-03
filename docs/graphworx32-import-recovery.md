# GraphWorX32 importer research and recovery baseline

## Scope and status

### HMI import integration

File → Import → GraphWorX32 / 64 Screen accepts binary `.gdf` and XML `.gdfx`.
Binary uploads use the combined Python converter server-side, with a 10 MB
source limit, a 60-second conversion timeout, one concurrent conversion, and
temporary files removed on success or failure. No VBA or ActiveX is executed.
The installer includes `python3` and `python3-olefile` for HMI when `--deps` is
used. Existing installations without them receive an actionable import error.
The imported screen remains an unsaved editor document until the user saves it.
Developer preview banners/layers are removed. The import toast summarizes skipped
controls/bindings and warns that recovery is partial/read-only and sources need
remapping. This is not full GraphWorX32 behavior compatibility.

### Arc-type recovery

The byte following the six arc geometry floats distinguishes open arc (0),
pie (1), and chord (2). The common fill flag is not an arc-closure indicator.
Verified quarter-ellipse geometry with type 0 now becomes a native unfilled arc
even when the common fill flag is enabled. This recovers all 40 arcs in
`Remote Storage/Pipe Parts.gdf`, including its four previously boxed elbows.
Pie/chord records are not silently substituted with open arcs. Their separate
geometry/closure validation remains future work. All 74 recovery tests pass.
ICONICS documents the separate Arc/Pie/Chord property in its arc preferences:
https://docs.iconics.com/V10.97/GENESIS64/Help/Apps/GWX/GWX10001030_Preferences.htm

### Combined recovery command

`python3 opcbridge-hmi/tools/graphworx32-recovery/build_screen.py SOURCE.gdf OUTPUT.screen`
now performs fresh static recovery followed by the existing numeric, color,
visibility, and flash decoders in that order. It refuses existing output files.
Developer geometry and binding audits are written separately under `/tmp`;
raw audits and unsupported external-reference settings are not embedded in the
screen. Unsupported bindings are counted in `importInfo.skippedBindings`.
Supported unresolved sources remain in editable native binding fields.
The output is still a partial read-only recovery preview, not a complete control
import. Existing individual developer commands remain available for isolated
decoder tests. All 72 recovery tests pass.

The plan is to eventually add GraphWorX32 `.gdf` import to the project, as a
reusable importer rather than a one-screen conversion. The current Python tools
are the pre-integration stage: they are getting the decoding to work correctly
before it is wired into HMI File → Import. There is no production GraphWorX32
importer or general-format guarantee yet.

This is a **separate importer** from the in-project GraphWorX 64 importer
(`opcbridge-hmi/server/graphworx-import.js`, for `.gdfx`), which is already in use
for converting screens from newer GraphWorX versions. The two do not match and are
not expected to: they target different product generations, different container
formats, and different layers of the file. Gaps in one are not gaps in the other,
and work here should not be read as a replacement for or an extension of the
GraphWorX 64 importer. The two will coexist.

What is shared is the output side. Both produce the native HMI layer metadata and
`hidden` flag described in `hmi-layers.md`, so either importer can set them.

Research preserved September 15, 2026. The user reports the recovered wall screen
looks good overall, with minor visual differences remaining. Continue static
visual recovery before implementing automations. Images are the next discussion,
not an already implemented capability.

## Test source and accepted baseline

### October 1, 2026 corpus decoding pass

The local `V9 Screens` collection contains 607 GDF files, representing 342
distinct file hashes. The batch audit runs once per distinct file and records
all duplicate paths. Source files and generated previews remain outside Git.
All 342 distinct screens complete static conversion with zero unresolved child
references. Bounding-box placeholders fell from 643 to 72: 65 OLE/ActiveX
objects and seven filled arcs before the native-control conversion pass. All
68 recovery unit tests now pass.

The probe now also writes `embedded-controls.json`. It inventories OLE storage
CLSID, serialized class names, and cautiously identifies trend, alarm, alarm
report, and screen-reference controls from their persisted contents. Trend
source references, alarm filter expressions, and embedded `.gdf` screen
references are recovered without activating controls or executing VBA. Database
connection strings and SQL are deliberately not exported. Extended-length MFC
strings are not decoded yet. Storage-to-canvas object association remains
decoded using the persisted container-item storage number, not storage order.
Ambiguous or unmatched associations are rejected.

The static builder now converts identified alarm viewers to native alarm panels
using source position and size and native defaults. Original filters and display
settings are discarded; an import-summary notice explains that difference.
Embedded screen controls become native viewports with their target in the
editable `target` field (source basename without `.gdf`). Unsupported trends,
alarm reports, and unidentified controls are skipped entirely, with only counts
in the import summary. Their persisted configuration is not copied into screen
objects. Developer probe inventories remain separate diagnostic files.
Across the 342 unique screens, this produces eight alarm panels and three
viewports, skipping 54 unsupported controls on recovered layers. All screens
still convert successfully. Rendered behavior still needs user verification.

The reader now resolves per-file class references and supports OVisible schema
3 (WORD IDs) and schema 5 (DWORD IDs). An outer object ID must match the ID in
its visible body. Embedded class definitions are distinguished from registered
display objects; missing class indices are recovered only when the complete
ObjectManager count and the explicitly serialized class indices agree.

Both `0xffff` and `0xffffffff` are valid display-root sentinels. Displays with
one root and no explicit layer collection receive a synthesized Default layer.
Empty groups with zero-size bounds are retained. Missing nested groups and
unrecoverable children are checked throughout the hierarchy, and synthesized
groups translate point arrays as well as X/Y.

Additional visual decoding covers:

- Horizontal/vertical paths whose stored bounds have a one-pixel extent on
  the zero-span axis. Their actual points are preserved exactly.
- Paths following gradient settings, including first class declarations,
  cached references, WORD/DWORD settings, and optional direction vectors.
  The decoded point array must agree with the stored bounds.
- Rotated rectangles serialized with an embedded closed polyline. Their
  recovered outline is used instead of an axis-aligned rectangle. All point
  arrays from the previously accepted wall-display probe are preserved.
- Valid empty text captions and empty font faces (default font), verified
  against the surrounding LOGFONT fields and caption location.

Conversion success is structural coverage, not proof of visual fidelity or
binding recovery. The static builder now uses each display's own
source canvas dimensions, recovered from the display-settings block rather than
object bounds. The earlier hardcoded 7680×3600 canvas has been removed from both
the screen builder and diagnostic SVG. Missing or ambiguous dimensions stop
conversion; there is no guessed fallback. All 342 unique corpus screens recover
their dimensions successfully, and the wall display retains 7680×3600. Verified
source settings: Console Background 1600×1200, Collection Overview 1282×1024,
Alarm Management 1280×1024. All 71 recovery tests pass.
The display-settings reader also recovers the background COLORREF preceding
the dimensions, accounting for the different style-tail widths in ODisplay
schemas 18 and 26. Direct/palette RGB encodings are supported; other encodings
stop conversion rather than silently selecting white. The generated screen and
diagnostic SVG both use this color. Source candidates are pink `#ff8d8d` for
Console Background and gray `#c0c0c0` for Collection Overview and the wall display.
These colors need source-view confirmation; structural conversion succeeds for
all 342 unique screens. Object fills and background-layer objects are unchanged.
OLE/ActiveX widgets and filled-arc appearance remain unresolved. The native arc
geometry is recovered for those arcs, but the builder deliberately reports their
filled appearance rather than inventing a chord/sector interpretation.

- Source: `SS Wall Graphic 7680x3600.gdf`, a GraphWorX32 wall display.
- SHA-256: `16cae8b9263b1c58443dc233cd9fed5e4d7cca825e2a6645f73d8dc2dcc92ec4`.
- Original size: 1,989,632 bytes; canvas: 7680 × 3600.
- Latest generated visual baseline: `SS Wall Graphic 7680x3600 - LAYER PREVIEW.screen` in the developer's Downloads directory. This is the grouped output and is what should be used; see the wrapper-removal note below before running `unwrap_screen.py` on it.
- Source and generated screens are **not** checked in: they contain installation-specific material.
- Output is static, with an explicit warning banner. It must not be mistaken for working controls or live values.
- Current output has 1,172 top-level objects and 2,599 groups, across 8 layers:
  3,217 rectangles (including remaining placeholders), 868 texts including the
  warning banner, 4,098 ellipses, 392 polylines, 257 arcs, and 5 embedded images.
  11,435 objects in total including group children.

## Preserved tools

See `opcbridge-hmi/tools/graphworx32-recovery/`. These use Python 3 and the
third-party `olefile` package. No VBA or embedded application code is executed.
Do not confuse these scripts with a supported installation feature.

Developer reproduction:

```sh
python3 opcbridge-hmi/tools/graphworx32-recovery/inspect_gdf.py SOURCE.gdf
python3 opcbridge-hmi/tools/graphworx32-recovery/layer_decode.py SOURCE.gdf
python3 opcbridge-hmi/tools/graphworx32-recovery/build_static_screen.py SOURCE.gdf grouped.screen
```

`grouped.screen` is the deliverable. `unwrap_screen.py` is deliberately not part
of this sequence: it flattens groups, and the grouped output is what should be
used and reviewed. See "Group removal and coordinate regression" for why it is
still kept in the directory.

Check the inventory script's arguments before use. The builder writes a sibling
`<name>-probe` directory and refuses existing output paths. The probe itself
writes its output directory. Never use a production screen as an output target.

The SVG generated by the geometry probe is an early diagnostic view: it does not
include all subsequent styling/path improvements. The `.screen` output is the
current visual baseline.

## Binary layout findings

The source is an OLE compound file. Its `Contents` stream is an MFC-style binary
archive, not XML. Class declarations contain `ffff`, a schema word, a name-length
word, and an ASCII class name. Class-reference numbers below are **file-specific**:

| Reference | Observed class |
| --- | --- |
| `0x8006` | Ellipse |
| `0x800b` | Rectangle |
| `0x800e` | Symbol/group |
| `0x8014` | Line/polyline point list |
| `0x801c` | Arc |
| `0x801e` | Text |
| `0x8776`, `0xa68b` | Unresolved classes |

The geometry probe searches for the sample's OVisible reference (`08 80`), reads
a dynamic-reference count, skips four bytes per reference, and reads two bounding
rectangles. A DWORD object ID follows the rectangles. The two rectangles are
identical for an unrotated object and differ for a rotated one; the original
equal-only rule is described under *Rotated records* below. This recovered 11,531
unique candidate IDs; it is a heuristic, not a complete archive reader. It can
still miss records or accept misleading signatures.

Relative to the first bounding rectangle, the provisional common styles are:

| Offset | Interpretation |
| --- | --- |
| +37, three bytes | Foreground/line RGB; also text foreground |
| +41, three bytes | Fill/background RGB |
| +45, byte | Fill enabled |
| +46, WORD | Line width; zero mapped to one pixel |
| +48, DWORD | Pen style: observed 0 solid, 5 invisible |
| +57, DWORD | Edge effect: 10 inset, 5 provisionally outset |

The simple-color interpretation is provisional; palette/system colors, gradients,
and special effects require further decoding. Zero-width cosmetic strokes are
only approximated by the native width mapping. Pen visibility and edge effects
are independent: a null pen can still have a raised/inset frame.

The common tail currently recognized is three **empty** MFC strings, version 2,
parent ID, and a gradient flag. Named strings or gradients can invalidate these
fixed assumptions. Ordered group child-ID lists follow that tail. Parent/child
reciprocity was checked during research. Some records include additional trailing
data not decoded by the probe; do not treat the next candidate offset as a proven
record boundary.

## Text

- A LOGFONT face CString precedes the display CString. Unicode CString markers
  are `ff fe ff`, followed by short or extended length and UTF-16LE content.
- Font height is read 28 bytes before the face marker; weight is 12 bytes before
  it. All 859 decoded text records in this sample store weight 700. 858 are visible.
- A byte plus DWORD after display text gives the inferred horizontal mapping
  0 left, 1 center, 2 right. The user verified the Primary Clarifier 1 label is left-aligned.
- An integer text-layout rectangle follows the face CString and 12 bytes of
  metrics. All decoded layout rectangles are vertically centered within their
  object rectangles to within one pixel. This is sample evidence, **not** proof
  that every GraphWorX32 text should be centered.
- The native insertion point is adjusted for center/right and middle alignment
  while preserving the original box. Stored layout edges supply bounded left/right
  padding. Missing bold and insets explained some apparent alignment errors.
- Primary Clarifier 1: group near `(1174,2408)`, text ID 13610, Arial 24, weight
  700, left-aligned, six-pixel left inset. Native font metrics are not pixel-identical.
- The earlier foreground-from-background mapping was wrong. Open/Closed labels
  established the correct foreground field. Current text colors, bold, and
  alignment are visually acceptable to the user, with minor differences remaining.

## Borders, paths, and arcs

- Caledonia Metering: text 523, rectangle 522, group 521. The user confirmed its
  inset border. Rectangle effect 10 is mapped to native inset.
- Vertical MID/FAILED labels below Building 130 (examples 712, 849, 935, 933)
  use effect 5 despite null pens. Mapping it to raised text borders improved them.
- Arc group `(459,414)`, ID 9849, contains four layered elbows. Arcs store six
  floats after the common tail: center X/Y, radius, Y/X radius ratio, start angle,
  **end angle**. The initial sweep-angle interpretation was wrong.
- All 257 arcs pass the quarter-turn test. Points use `x=cx+r*cos(a)` and
  `y=cy-r*ratio*sin(a)`, with the shortest normalized angular difference.
  Sampled bounds match source bounds within 0.001 pixel. Seventeen points per arc
  become native editable splines; line widths/colors are retained. Width/shading
  remains slightly different. Native arcs are separately recorded in Feature Ideas.
- Line records contain a WORD point count followed by float X/Y pairs. 427 of 436
  records match their source bounds within 0.05 pixel. Nine remain placeholders;
  eight had a one-pixel bounds discrepancy and one was not decoded.
- Group near `(2014,126)`, ID 15557: four crossing lines and a filled base were
  previously rectangles. IDs 15558, 15564–15567 supplied the test case.
- Group near `(1476,3100)`, ID 3409: paths 3410, 3412, 3413 have tan/blue fills
  without repeating their first point. Fill-enabled paths with at least three
  points now close implicitly. This also adds a closing stroke; verify cases
  where source fill closure and stroke closure might differ.

## Group removal and coordinate regression

**The grouped builder output is the deliverable. Do not run `unwrap_screen.py` on
it.** Grouping must match the source file, and the builder now preserves the
source's own group structure including the groups the geometry probe cannot
index. The builder output already starts at the layer's children, so the four
document/collection wrappers it used to emit (`gdf32_1`, `gdf32_18788`,
`gdf32_221`, `gdf32_248`) are not top-level objects in it. `unwrap_screen.py` is
retained only as a historical tool for the older wrapper-shaped output and as the
coordinate-translation regression check described here.

For the record, when it did apply: only those four wrappers were removed, layer
248 started at X=320 so removal required translating point arrays as well as
object X/Y, and an earlier version failed to translate 20 point-based objects.
Path 5338 incorrectly began at `(197,2656)`; its correct source position is
`(517,2656)`.

The unwrap assertion checks world-space **points** for path objects, not their
incidental X/Y properties. It verifies 8,837 leaf geometries before/after
wrapper removal. This is an important regression case for the future importer,
and the same 8,837-leaf comparison is now also the check that the grouped output's
synthesized group wrappers did not move anything. Unwrapping carries the
wrapper's `layerId` onto promoted children, so flattening a collection cannot drop
objects onto the default layer.

## Layer metadata recovery

`layer_decode.py` reads the display's layer collection structurally. Earlier
attempts keyed on object IDs or searched only for three *empty* CStrings, so named
layers were never found and `Background` was misattributed to ID 223. The record
index is now anchored on the fixed `0e 80 0e 80 08 80` record prefix, with the
object ID in the four bytes before it; 2,631 records are found with unique IDs.

A group's tail is `<optional name CString><7 zero bytes><4-byte field><3 empty
CStrings><version 2><parent DWORD><flag><WORD count><count child IDs>`. The four
bytes after the spacer vary (`ff ff 00 00`, `ff ff ff ff`, and small integers), so
the spacer alone is used to locate the name, and the name is accepted only when
its length byte makes it end exactly at the spacer. A layer's child list is
followed by `<visible byte>` and one of two discriminators: `03 91`, or `03 ff ff`
when an `OLayerInfo` class record is appended. That variant is why one layer
previously failed to parse.

The layer collection is the parent owning the most named groups that carry a
visibility byte, so no object ID is hardcoded. Draw order comes from the
collection's own child list, not file order. Recovered for the wall display:

| ID | Name | Visible | Children |
| --- | --- | --- | --- |
| 223 | Background | no | 0 |
| 18892 | LargeBackground | no | 1 |
| 248 | GRAPHICS | yes | 1,170 |
| 18865 | PlantOpsSwitch | no | 1 |
| 18866 | FieldOpsSwitch | no | 1 |
| 18925 | CallBobNow | no | 1 |

Document object 1 owns collection 221 and background collection 18788. GraphWorX
does not treat the background collection as a layer, so it becomes a synthesized
backmost HMI layer rather than being folded into the stack.

`build_static_screen.py` emits these as native HMI layers with `hidden` set from
the recovered visibility and `editorVisible` true, so imported hidden content stays
editable without appearing on the running display. Objects on hidden layers are
emitted rather than dropped, which is the change from the earlier previews that
silently discarded them.

**Grouping is preserved exactly.** Every group the geometry probe cannot index is
still reached through `group_children`, but it is now wrapped in a real group
object instead of having its children inlined onto the layer, which restores 17
groups in this sample. Those wrappers have no decoded bounds of their own, so they
are sized from the union of their children and the children are shifted to be
relative to that box. This is position-preserving: all 8,837 leaf geometries
compare identical to the pre-fix output. A wrapper carries a `conversionNote`
saying its bounds were synthesized, so a later pass can replace them with real
values.

### Rotated records

The geometry probe originally required a record's two stored bounds quads to be
byte-identical, and rejected anything else as a false positive. That is not a
format rule: the quads differ for a *rotated* object, and the six layer children
previously reported as having "no decodable record" were mostly rotated records
being discarded by that check. The probe now keeps the unrotated match for an
object ID and only falls back to a rotated match when no unrotated match exists.
Without that preference the relaxed check admits 118 duplicate object IDs, since a
record can also match the scan from inside a neighbouring record; with it, 49
records are recovered and every object ID stays unique.

The change is purely additive. All 11,482 previously indexed records keep identical
offsets, bounds, and type codes, and the six former exceptions now resolve:

| ID | Type | Bounds | Layer |
| --- | --- | --- | --- |
| 6 | text `MGD` | 40,18 - 215,45 | PlantOpsSwitch |
| 31 | text `Check Field Ops` | 25,36 - 200,63 | FieldOpsSwitch |
| 32 | text | 323,1321 - 446,1345 | group 18877 |
| 202 | text | 323,1297 - 448,1321 | group 18877 |
| 9690 | text `Download Value ~~rotate~~` | 4467,2889 - 4667,2911 | GRAPHICS |
| 1075 | group, 11 children | 1123.7,2027.6 - 1191.2,2094.8 | GRAPHICS |

A rotated record's name spacer is `<2 zero bytes><4-byte float radians><1 zero
byte>` rather than seven zero bytes, so `read_group_tail` accepts that shape and
the tail header must still validate as before. ID 1075 is a group whose 11 children
were always indexed; only the parent was being dropped, so its children are now
nested under a real group rather than inlined onto the layer.

Because the shorter chunk boundaries the new records imply are more accurate, two
already-indexed objects (2615 `MGD`, 19039 `Yearly Limit Exceeded`) now have their
text decoded where the old boundary ran into a neighbour and hid the string. Both
keep the same bounds; only the rendered text and its layout offset change. Leaf
count goes from 8,837 to 8,901, `importInfo.unrecoveredLayerChildren` is now empty,
and no previously indexed leaf is removed.

All five leaf exceptions are class `0x801e` and share the anchor bytes
`38 87 1e 80 08 80` at the OVisible reference. Earlier, searching for the eight
bytes `38 87 38 87 1e 80 08 80` matched only four of them: ID 31 is preceded by the
tail of an ASCII class name (`...tton`, from "Button") instead of `00 00 38 87`, so
it never matched a fixed-width signature. Searching for the anchor rather than a
fixed window covers both, which is why the bounds-based path reaches all five and
ID 31 is an ordinary control on `FieldOpsSwitch`, not a dangling reference.

Draw order is taken from the collection's declared list, used as-is in HMI
back-to-front order. That mapping has **not** been confirmed against the GraphWorX
editor's Draw stack, so a reversed stack order remains possible. The generated
screen therefore carries `zOrderPreserved: true` (the list was carried through
without reordering) alongside `zOrderVerified: false`, so a consumer can tell
preservation apart from confirmation. Confirm against the editor before treating
recovered order as authoritative.

`build_records` is memoized per stream and length, because the builder asks for
the same index once per layer and per unindexed group. The cache holds a single
entry and is keyed on the stream object itself, so a second archive in the same
process cannot be served the first one's records.

## Images: discussion pending

### Subsequent recovery: group near (3011,2418)

The image pass identified reference `0x8776` as OBitmap in this sample. Objects
120, 121, 113, 125, and 116 contain complete PNGs inside their records: one
130×148 image and four 94×94 images. The preserved extractor walks PNG chunks,
checks CRCs, requires IHDR/IDAT/IEND, and bounds dimensions and encoded size.
This is structural validation, not a complete image-decoder security review.
The preview embeds the PNGs as native image data URLs to remain portable.
Final File → Import integration should use the normal image asset store with
deduplication. No image assets or source files are committed.

The same group revealed missing text in the `Arial Unicode MS` face. Adding this
face to the provisional detector recovers seven additional texts across the
screen. The name detector is still a whitelist and must eventually be replaced
by proper LOGFONT/CString parsing.

Latest preview: `SS Wall Graphic 7680x3600 - IMAGE PREVIEW.screen`. Image objects
set `preserveAspectRatio: "none"` to honor their source display rectangles; HMI
images without that setting retain their existing aspect-preserving behavior.
This sizing option requires the accompanying HMI code update. Static overlapping
image variants are preserved in source order; no automation selection is attempted.
The following paragraph records the earlier inventory status, superseded by this pass.

No bitmap/embedded-image extraction is implemented. Initial inventory found
`Embedding2/Contents` (7,162 bytes) and `Embedding2/OlePres000` (28 bytes), plus VBA
streams. These are leads, not evidence that an image has been decoded. Some
image-like symbols are actually grouped geometry, as demonstrated by the elbows
and numbered symbol. Determine embedded versus externally linked content before
choosing how to import it. Do not execute VBA or embedded OLE objects.

## Work needed for a reusable GraphWorX32 importer

Ordered by what most affects the quality before integrating into File → Import.

- Finish decoding the shapes still emitted as bounding-box placeholders, so the
  result is not a rectangle grid standing in for real geometry.
- Complete automation and tag binding recovery. This is currently static visual
  recovery only, and the output says so on the screen.
- Report remaining placeholders and unsupported resources against their objects;
  do not silently discard them or claim they were converted. The six layer
  children listed in `importInfo.unrecoveredLayerChildren` are the current
  example of this being done rather than hidden.
- Validate rendering, grouping, closure, hit testing, saved/reloaded coordinates,
  and style semantics independently of the original heuristic bounds.
- Confirm recovered layer draw order against the GraphWorX editor's Draw stack.
  The collection's declared list is used as-is and has not been verified, so a
  reversed stack order remains possible.
- Keep source IDs/offsets for diagnostics, but do not expose them as user-facing
  substitutes for useful object names.
- Preserve synthetic/minimized regression fixtures alongside the decoder tests so
  the confirmed cases survive without the source file.
- Integrate through File → Import with progress feedback and normal image/resource
  storage once the decoder is stable. The Python tools can remain as developer
  research utilities during that integration.
- Support a broader set of authorized GraphWorX32 files; the current tests are
  based on one sample and are not a general regression suite yet.

Not a goal: parity with the GraphWorX 64 importer. The formats differ and should
remain separate.

Related HMI work remains separate: alias discovery was moved outside the redraw
loop; polyline X/Y and vertex controls were added; the legacy floating Automation
window was removed in favor of standard supported automation tabs. These changes
are not part of the binary format decoder.
# Numeric automation source audit

Follow-up: `build_numeric_screen.py SOURCE.gdf GEOMETRY.json STATIC.screen
OUTPUT.screen` now adds read-only native `textBindings` to a new preview,
refusing overwrite. The wall sample produces 165 bindings from 167 linked
candidates; unmatched formatting/objects remain unchanged. Units and visual
properties are preserved. Original sources remain unresolved, and expressions
use the expression field. No controls are enabled.

The guarded OAlnum formatting candidate uses integer/decimal bytes at relative
62/63 and display-width WORD at 65, requiring a following CString and matching
question-mark width. This is provisional sample evidence, not a general MFC
schema. Leading-zero and write flags are not recovered. Five synthetic tests
pass; a full preview comparison verifies no other visual properties changed.
Earlier read-only audit notes below describe the preceding stage.

The read-only `tools/graphworx32-recovery/numeric_sources.py` audit recovers
167 OAlnum-to-text source links in the wall-display sample. Each accepted
candidate has a reciprocal automation ID in the visible object's reference
list and one unambiguous source in OPointManager. Class reference bytes are
derived from declarations rather than assuming the unrelated sample's
`f0` marker. Conflicting sources and unmatched objects are not guessed.

This is a preliminary binary scan, not a complete MFC decoder or finished
automation import. It preserves the display text and original source string;
number formatting, input/write flags, and remaining numeric records still
need decoding. No generated screen or runtime binding was changed by this
audit. Three synthetic tests cover linking, ambiguity, and truncated data.

Run with the same `olefile` Python dependency as the geometry probe:

```
python3 tools/graphworx32-recovery/numeric_sources.py SOURCE.gdf geometry-candidates.json
```
# Centered gradient recovery

## Color binding recovery (experimental preview)

The wall archive contains 132 OColorDynInfo records associated with 116 distinct
object/dynamic-ID pairs. Every pair was checked against the object's own dynamic
reference list. Sixteen pairs contain two records; do not collapse these or
assume a single Boolean on/off rule. Source links include direct run/fault tags
and expressions. Screenshot `PqzIiQhoDb.png` verifies that the three color slots
are fill, line, and shadow, with separate target enable flags and an on-true
selection. They are not on/off/default colors.

Useful reference objects for confirming that layout:

- Object 7, “OpenCel Pulsing”, near (6791,1457), source
  `<#PLANT_OPS#>\\PLC8.B180.OpenCel.Pulsing_Active`.
- Object 8, “OpenCel Faulted”, near (6791,1515), source
  `<#PLANT_OPS#>\\PLC8.B180.OpenCel.System_Fault_Active`.
- Object 11, “TWAS Flow > 10 GPM”, near (6791,1321), an expression comparing
  `TWAS_Flow_From_SCADA` to 10.

`color_sources.py` accepts the observed record layout with explicit RGB colors
(COLORREF high byte 0 or 2) and no shadow-color target. The first preview mapped
100 source bindings to 447 native child objects. The multi-color preview also
recovers the 16 Forward/Reverse mixer bindings, for 116 source bindings (132
conditions) on 543 native child objects. Groups distribute rules
to existing painted child targets rather than receiving a uniform group fill.
Conflicting existing child rules are never overwritten. Text maps source Line
to glyph color and source Fill to background; this target interpretation remains
provisional pending runtime comparison. Base colors remain unchanged when the
condition is false (or true for an inverted rule).

`build_color_screen.py SOURCE.gdf GEOMETRY.json STATIC.screen OUTPUT.screen`
creates a separate color/numeric preview and refuses to overwrite an output.
It also recovers the 165 numeric bindings from the latest static geometry.
Original references remain unresolved for manual remapping; expressions remain
expressions. No write actions or VBA are executed or converted. Tests cover
record truncation, conservative rejection, text targets, expression preservation,
and atomic group conflict handling. No manually edited screens are changed.

Multi-condition sources are joined by `(dynamicId, pointId)`, not the dynamic ID
alone. The OPoint ID after the source CString must agree with its preceding
collection key. Both mixer conditions otherwise share the same dynamic ID.
Every observed pair stores green Forward followed by orange Reverse, with black
line color and on-true flags. Native rule arrays preserve that serialization
order, with first-match precedence. GraphWorX's simultaneous-true precedence
has not been independently verified; test this before treating recovery as exact.
Neither condition matching retains the object's base paint. A regression fixture
deliberately reverses point collection order and source alphabetical order to
ensure colors remain attached to the correct condition.

## Native arc update

## Visibility recovery preview

Screenshot `03E3W4obDG.png` confirms object 682 (OPEN near 1717,1494):
Hide Object, Hide/Disable when False, source
`<#PLANT_OPS#>\\Building_30.PLC.Gates.30_GT_11.Gate_30_GT_11_Full_Open`.
The matching OHide layout maps to native visibility with Invert unchecked.
Direct Boolean tag bindings explicitly store `mode: equals, match: "1"` so
opening/remapping them does not fall back to Threshold in the properties pane.
Expressions retain their own Boolean evaluation without a tag comparison mode.
`visibility_sources.py` requires reciprocal object/dynamic links, an unambiguous
source, and the complete verified base/settings byte layout. Other variants are
flagged rather than assuming Hide/Disable or True/False semantics.

`build_visibility_screen.py SOURCE.gdf GEOMETRY.json COLOR.screen OUTPUT.screen`
preserves the numeric/color/text preview and refuses output replacement. The
wall file has 469 linked records: 462 bindings applied, two records on object
8195 retained as a review issue, and five absent objects/wrappers retained in
the import audit. These absent records are 18788, 248, 18925, 18892, and 18786;
this pass does not reconstruct removed wrappers or excluded source objects.
Source expressions remain expressions, original references require remapping,
and Flash/Disable variants are not converted. Tests cover truncation, unknown
settings, group expressions, duplicate rules, and preservation of existing edits.

## Native geometry and text notes

False-trigger Flash: `SMDwlV9aPt.png` verifies object 886, vertical FAILED
near (885,1803): Hide Object, Flash When False, Show Alternate State When
Not Flashing, 1000ms. Serialized options `01 01 00` now map to an inverted
visibility trigger with hidden fallback and slow flashing. The original
expression is preserved; inversion applies to the condition, not blink phase.
This recovers six additional FAILED labels (886,1120,1132,1138,1161,1167).
The separate `FLASH WHEN FALSE PREVIEW.screen` in Downloads preserves the
previous generated preview. Previously edited files are not rewritten.

Color Flash: `qMbbVcauso.png` verifies object 687, GATE 30-GT-12 near (1607,1458):
Change Color, white Fill/black Line, Flash When True, original state when not
flashing, 500ms. The observed `00 00 01` option combination now maps to native
flashing Color bindings, with 500/1000ms mapped to fast/slow. Original static
paints and separate visibility remain intact. Existing color rules are not
overwritten: their precedence requires review. The new preview adds 53 source
color-flash bindings to 121 objects; 75 Flash objects still require review,
including conflicts and unverified variants. The 125 hide-flash bindings remain.

Flash preview: `MDkQJqazI3.png` verifies object 864, vertical FAILED near
(1201,2256): Hide Object, Flash When True, Show Alternate State When Not Flashing,
1000ms. Only that complete flag combination is accepted by `flash_sources.py`.
It emits a visibility rule collection with hidden fallback and SlowBlink; the
object blinks when active and stays hidden when inactive. Exact timing still
needs source comparison. Color slots are inactive for this hide-mode variant.
`build_flash_screen.py SOURCE.gdf GEOMETRY.json VISIBILITY.screen OUTPUT.screen`
preserves prior recovered bindings and refuses overwrite. Of 254 linked records,
125 are mapped, 128 objects retain review issues (other options or overlapping
visibility), and one absent object stays in the audit. No edited files are changed.

Text recovery now identifies font faces from the serialized LOGFONT metrics and
following layout/text CString positions, rather than a font-name whitelist.
This recovers object 762, `HIGH INFLUENT\r\nFLOW` (Arial Black), previously emitted
as a rectangle placeholder. A full-file comparison retains all previously decoded
text and adds this label. Font availability/appearance still depends on the native
HMI renderer; an unfamiliar font no longer discards the label itself. Tests cover
arbitrary font names and rejection of invalid metrics/layout positions.

Verified quarter-turn OArc records now emit native `arc` objects instead of
sampled splines. `x,y,w,h` describe the full ellipse; `startAngle,sweepAngle`
are degrees, clockwise-positive in screen coordinates. Recovery negates the
source angles (source uses upward-positive sine). Stroke colors, widths and
group-relative placement are preserved. The 257 recovered records still pass
the source visible-bounds verification. Existing screen files are not rewritten;
the new native-arc preview requires the updated HMI JavaScript.

The source screenshot of the two Influent Valve panels confirms a horizontal
dark-edge/light-center gradient. Rectangle 776 at approximately (1450,1930)
stores colors `#009f5f` and `#8dff8d`. The recovery tool now emits a smooth native
`linear-gradient(90deg, #009f5f 0%, #8dff8d 50%, #009f5f 100%)`.
Two rectangles in the wall screen match this verified serialized style.
`gradients.py` deliberately accepts only that observed OGradientInfo layout and
settings combination; other gradient styles remain undecoded. This is a
provisional schema mapping, not an object-ID-specific replacement. Screenshot
banding is not reproduced. Existing edited screens are not modified.

The Heat Exchanger screenshot (`CY5VTVpbk9.jpg`) additionally verifies rectangle
15547 at (1986,525): dark red `#800000` at the top to light red `#ff5555` at the
bottom, with a separate inset border. The observed settings pair `00 01`
maps to a native 180-degree, two-stop linear gradient; the green centered
variant has `01 01`. Both mappings retain the other observed field constraints
and apply by serialized style rather than object ID or color. The updated wall
preview recovers ten gradient rectangles. Other settings remain undecoded.

The subsequent basin screenshot (`xq5NF3pYuX.png`) verifies the `00 00` / 100
settings combination as another top-to-bottom two-color fill. Rectangle 8223
near (4285,3088) transitions from tan `#ddcfb2` to yellow `#e2e200`;
neighboring panels use dark olive `#717100` to the same yellow. Recovery uses
each record's colors, without coordinate or color-specific substitutions.
# Animator investigation (2026-10-02)

The original `animator_sources.py` investigation was audit-only. It is now enabled
for the screenshot-correlated wall-display settings described below. In the
wall display it validates 107 OAnimator/group associations using both the dynamic
object ID and the object's dynamic-ID back-reference. All 107 resolve to the
constant source `1`. It handles the initial ODynamic base declaration separately
from subsequent class references, retaining original byte offsets.

The first association is dynamic 610, object 7854, group near (5574, 3436), with
21 recovered children and timing candidate 180. GraphWorX32's manual defines
Frame Rate as milliseconds between frames, matching our native frame interval.
If each child is one frame, the corresponding cycle would be 21 × 180 = 3780 ms.
That frame-order/membership interpretation and the three settings bytes `010000`
still require verification against the source Animator inspector before enabling
normal import. No candidate binding or diagnostic-only metadata is attached to
saved screens by this audit.

### October 3: wall-display Animator import enabled

The binary import pipeline now maps the wall display's exact Animator settings
to native grouped Animators. qbU8hbR5m6.png's unique 55 ms setting correlates
with object 2110/dynamic 225: source 1, Animate When True, Invisible When Off,
First Frame When Off. The complete common settings block and flags 010000 are
identical across all 107 records. Accept only this observed combination, not
unverified individual flag permutations. Each object's serialized child list
must exactly match the recovered group children before assigning frame IDs.

Actual server import recovers 107 Animators and 2,358 frames, zero Animator
review/absent groups. Native runtime checks confirm the recovered intervals and
invisible inactive state for every group. Existing source/previews are unchanged.
All 121 HMI tests and 80 binary recovery tests pass.
