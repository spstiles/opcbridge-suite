# HMI layers — first editor pass

Branch: feature/hmi-layers.

Screens keep their existing flat objects array. Each top-level object has a
layerId; groups and all their children belong to the group's layer. The screen's
layers array defines back-to-front order. Displayed numbers are array positions,
starting at zero, never permanent identities. Renaming and reordering Default
are supported like any other layer.

Opening a screen without layers gives it one Default layer and assigns its
objects without moving their coordinates. Metadata is saved with the screen;
undo snapshots include it. Save a copy when testing with older installations,
which do not understand this stacking order.

In edit mode the bottom selector and numbered quick-select buttons choose the
active layer. Hidden layers have dimmed numbers;
selecting one does not change its visibility or lock state. Cursor X/Y appears
at the right of the bar, relative to the screen origin. View → Status Bar toggles
the entire bar and remembers the browser preference; View → Layers remains
available when it is hidden. Layers opens a list
for renaming, reordering, showing/hiding, locking, adding and deleting. To move
objects, select them before opening the list, choose a destination layer, and
click Move selected objects here. Exit group editing first to move a whole group.
Deleting offers either moving contents to another layer or confirmed deletion.
At least one layer must remain.

Only the active, shown, unlocked layer is editable. New objects and pasted objects
belong to that layer. Existing object arrange commands work within the layer's
stacking range. Runtime, popups and viewports use the same numbered paint order.

Two visibility flags exist and they are independent:

- `editorVisible` is the editor Show checkbox. It controls editing and editor
  painting only. It never changes runtime visibility.
- `hidden` is the runtime flag. A layer with `hidden` set is skipped at runtime
  by the main display, popups and viewports, and its objects are not hit tested.

Layers read from an import carry `hidden` when the source had them hidden, and
`editorVisible` true, so imported hidden content stays editable without appearing
on the running display. The editor Show checkbox does not read or write `hidden`.

Imported GraphWorX32 layer metadata is recovered by
`opcbridge-hmi/tools/graphworx32-recovery/layer_decode.py`, which reads layer
names, declared draw order and per-layer visibility from the display's layer
collection. Nothing is keyed to a specific object ID: records are indexed from
the stream and the layer collection is found by structure, so an archive whose
layout does not match is reported as having no layers rather than guessed at. The
builder emits those layers natively and still emits the objects on hidden layers,
marking them with their layer so nothing is discarded. A GraphWorX background
collection is not a layer and becomes a synthesized backmost layer.

The recovered list is used as-is in the HMI back-to-front order. That direction
matches the one verified sample but has not been confirmed against the GraphWorX
editor's Draw stack, so the generated screen records `zOrderVerified: false`
alongside `zOrderPreserved: true`. The GraphWorX 64 importer sets
`zOrderPreserved` for the `.gdfx` path and does not carry a verification flag,
since that path reads the draw list directly.

## GraphWorX 64 (`.gdfx`)

GraphWorX 64 displays carry no layer markup. Stacking is source document order,
and a nested `Canvas` element is a group, not a layer. The importer therefore
emits one synthesized backmost `Default` layer and tags every top-level object
with it, so the saved file states its layering explicitly instead of depending on
the editor's single-layer fallback. `importInfo` reports `layersRecovered: 0` and
`layersSynthesized: 1` so nothing implies layers were recovered from the source.
`converterVersion` is 3.

Only top-level objects get a `layerId`; a group and its children all belong to
the group's layer. Verified across all 357 displays in the local GraphWorX 64
sample collection (8,775 top-level objects): each produced exactly one layer,
every top-level object tagged, no `layerId` inside any group, and paint order
identical to document order.

Attaching real layers to `.gdfx` needs a sample display that actually uses the
feature. None was available.

## Runtime visibility

In edit mode open View → Layers (or Layers… in the status bar), expand a layer's
Runtime visibility, and choose Always shown, Always hidden, or From source.
From source uses the same visibility model as objects: select a connection/tag
and Equals or At or above, or choose Expression and enter a Boolean expression.
The connection/tag selectors can insert a `tag("connection", "tag name")` call
into an expression. Click Apply expression after editing; invalid expressions
are reported without changing the saved rule. Invert result reverses the rule.
Save the screen normally. Layer settings participate in undo/redo.

An enabled visibility rule determines runtime visibility for the whole layer,
including groups. It takes precedence over the stored `hidden` fallback. Always
shown/hidden disables the rule but keeps its settings for later reuse. Editor
Show and Lock remain independent. Hidden runtime layers are neither painted nor
hit tested in the main screen, popups, or viewports. Their sources stay subscribed
so they can become visible again. Layer tag changes rebuild the display's layer
slots; unrelated tag updates retain incremental object repainting. Missing values
retain the last known state; an expression/tag without an initial value starts
false, consistent with object visibility.

GraphWorX32 import recovers verified OHide rules attached to layer containers as
well as ordinary objects. The wall display's six layer rules are recovered:
PlantOpsSwitch and FieldOpsSwitch show above three failures, GRAPHICS,
LargeBackground and CallBobNow have constant 1, and Background has constant 0.
Constants become native expressions. GraphWorX `~~global alias~~` references are
preserved as `{{global alias}}` mapping placeholders; use the existing reference
mapping workflow to select live tags before runtime. Imported saved visibility
remains available as the fallback if automation is disabled. Unverified/conflicting
rules are skipped as for object bindings.

Nested layers and layer-level pick actions are not yet implemented.
