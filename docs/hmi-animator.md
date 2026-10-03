# Native HMI Animator

Work branch: `feature/hmi-animator`. Native creation, editing, runtime playback,
and the source GraphWorX32 wall-display import have passed interactive testing.

## Agreed workflow

Select drawings or groups, then Bindings → Animator. Each selected item becomes
a frame without automatically repositioning it. One Animator tab contains
numbered frame buttons, add/duplicate/delete/reorder controls, frame editing,
optional Align Frames, and Play/Stop preview. Playback and Value Selection share
that frame list. Native drawings remain editable; images are not required.

Frames now use ordinary child groups containing one or more drawings. Add Frame
creates an empty child group and enters its editor; newly drawn objects therefore
belong to that frame. Edit Frame enters that child group rather than merely
selecting it. The Animator tab stays available while editing drawings inside
frames, including when nothing is selected. Numbered buttons switch the edited
frame. Move Selected Objects transfers selected direct children to another frame
from this same tab; Finish Frame Editing returns to the outer group. The separate
membership pane has been removed. Transferring between rotated frame groups is deliberately rejected
until rotation-preserving transfer is implemented. Show All Frames is transient
editor state; it reveals the other frames for comparison.

## Foundation implemented

`public/js/animator.js` defines frame identity and deterministic selection.
Frames have stable IDs and ordinary object
payloads. Playback uses a frame interval (default 100 ms); every frame is shown
for that interval. Cycle duration is interval × frame count. Null repeat count
means continuous playback; finite repetition
holds the final frame when complete. Inactive playback shows a selected stopped
frame, initially the first. Value Selection evenly maps one Start Value/Stop Value
range (default 0–100) across the ordered frames. Start selects the first frame,
Stop selects the last; internal boundaries select the next frame. Out-of-range
values clamp to the first/last frame. Missing or non-numeric data, explicit bad
quality, or an invalid range (Stop must exceed Start) uses the fallback frame.
The source controls timing; this mode has no separate cycle timer. Weights,
per-frame matching rules and editable cycle duration are removed.

Elapsed time is supplied by the caller, rather than accumulated timer ticks, to
avoid scheduling drift. Runtime clocks and preview state must remain transient,
outside the saved screen. Reordering does not change stopped-frame identity;
deleting that frame selects the first remaining frame. Removing all frames is
safe but should be prevented by the editor or shown as an incomplete binding.

The saved-screen model uses a normal group: frame drawings live exclusively in
`group.children`, linked by `animatorFrameId`. `group.animator.frames` contains
only frame IDs. The standalone `create` helper remains a selection
staging helper, not the screen serialization model. Group helpers support
attaching/removing the binding, duplicating/removing frames, and selecting a
display-only view without mutating the saved children or changing group bounds.
This keeps every frame available to ordinary object traversal. UI integration is implemented. Copy/paste regenerates frame IDs and their
child/fallback references so copies have independent runtime and preview state.

## Work remaining

- Creation is now wired into both Bindings menus for selected drawings (two or
  more) or an existing group. The Animator tab edits mode, source, frame interval,
  repeats, Start/Stop values, frame order, duplication/deletion and stopped/fallback
  frame. Edit Frame selects the normal child inside the group editor. Frame
  selection previews that drawing, and Value Selection uses the shared source
  evaluator at runtime. These paths still need interactive verification.
- Optional thumbnails and alignment.
- Shared tag/expression picker and reference health for the Animator source and
  every frame's bindings, including frames not currently displayed.
- Timed playback and Play/Stop preview are wired using monotonic clocks and
  mounted SVG hosts. Hosts repaint only when their frame changes. Inactive,
  single-frame and completed finite playback stop scheduling. Value Selection
  uses tag-driven rendering without a timer. Explicit bad-quality tag inputs
  use the stopped frame. False-to-true activation restarts the cycle. An empty
  playback source means always active; an empty value source is invalid.
- Interactive verification, popup/viewport instance identity, inactive-frame
  hit-testing, source reference-health integration and expression quality handling.
- Real-file and interactive verification of the GraphWorX64 Range Selector import mapping. GraphWorX32 imports the wall display’s screenshot-correlated playback settings; other option combinations require verification.

The module is now loaded into the HMI. Existing objects without an Animator
retain their normal rendering behavior. GraphWorX64 mapping has synthetic fixture coverage; real-file verification remains.

## GraphWorX64 Range Selector import

The XML importer recognizes `gwx:GwxRangeSelector` on a Canvas group.
Discrete/DiscreteAnimator becomes Playback; Analog/AnalogSelector becomes Value
Selection. Direct visual children are the ordered frames, including nested
groups. Frame IDs link ordinary children to the native Animator metadata.
Duration is milliseconds per cycle, so Playback frameIntervalMs is Duration
divided by the number of frames. Negative RepeatCount or Infinite/Forever means
continuous playback; positive integer counts hold the final frame on completion.
Enabled, numeric LowLimitSource/HighLimitSource, and tag/expression/constant
DataSource are mapped. Imported tags remain unresolved until remapped. A constant
source becomes a native expression and needs no tag remapping. Playback with an
explicit Always comparison uses constant activation. The first frame is the
stopped/fallback frame.

Unequal or unrecognized FrameDistribution is replaced by equal frame spacing
with an import notice; total cycle duration is retained. State Selectors with
per-frame conditions are not converted to Animator. Multiple Range Selectors,
unknown modes, dynamic durations or limits, unsupported activation comparisons,
delays, reverse/easing behavior, partial cycles, flashing, and unsupported
repeat/stop behavior are left inactive with an import notice.

Mapping tests use synthetic XML fixtures and exercise native playback and value
selection after conversion. A real exported Range Selector file still needs
verification of its serialized properties and frame structure.

Property semantics reference:
https://documentation.iconics.com/v10.97.3/Content/Apps/GWX/GWX10001076_Selectors_and_Animation.htm

## Playback inactivity controls

Playback now offers Animate When True/False, When Inactive Visible/Invisible,
and Inactive Frame Fallback/Hold Current. Defaults preserve existing behavior:
true activation, visible when inactive, and the chosen fallback frame. An empty
Playback source stays always active regardless of activation direction. Preview
plays regardless of the selected activation direction. These options are hidden
and ignored in Value Selection.

Every activation restarts at frame one. Holding the current frame retains only
its ID in the mounted controller; elapsed time is discarded on inactivation.
Runtime state is never saved in the screen. Before any frame has played, or after
a held frame is deleted, Hold Current uses the fallback. Disabled playback or
missing, invalid, or bad-quality data clears held state and uses the fallback
(or stays invisible), never triggering false-polarity playback.

GraphWorX64 EqualZero and NotEqualZero comparisons compose with AnimateWhenTrue
to set activation direction. FreezeWhenNotAnimating maps to Hold Current.
The native restart policy remains in effect. GraphWorX32 now maps the wall display’s exact settings combination and validates
frame membership/order against the serialized group child list.

Importer review: conversion notices now appear in the import toast, saved import
metadata, and reference review. Explicitly empty sources, skipped or expanded
source frames, SkipInitialDuration, and non-None partition modes prevent Animator
activation with a notice. Missing frame drawings must not silently reduce the
frame count used to infer timing. Converter version is 4.

## GraphWorX32 wall display Animator import

The combined binary importer now runs Animator recovery after flash recovery.
The original wall display recovers 107 Animator groups with 2,358 frames and no
Animator skips. Every stored child ID agrees with the recovered group children
in order. Frame geometry and ordinary grouping are preserved.

The unique 55 ms record (object 2110, dynamic 225, constant source 1) correlates
with qbU8hbR5m6.png: Animate When True, Invisible When Off, First Frame When Off.
All 107 records have the same complete settings layout and flags 010000, so the
importer accepts that exact combination, with each record's own frame interval.
It does not generalize the individual flag bytes to unobserved combinations.
Unknown settings, ambiguous associations, and missing/reordered frames are
skipped with an import notice. Constants become expressions; tag sources remain
editable unresolved bindings. Runtime restart remains the native policy.

Verified through convertGraphWorx32 on the actual source GDF, followed by native
controller checks for the first two frames and invisible inactive behavior on
every imported Animator. Browser verification of the imported result remains.
