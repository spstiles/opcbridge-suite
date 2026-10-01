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

Not yet implemented: runtime layer visibility bindings driven by process values,
nested layers, and layer-level runtime actions. Do not yet use editor Show as a
runtime alarm-overlay control.
