# Object Explorer

In Edit mode, Object Explorer is shown by default. **View → Object Explorer**
shows or hides this separate window and remembers the choice on this browser.
The Properties panel retains its original layout and controls. Both can remain
visible while working.

- Objects are labeled only by type, such as **Group**, **Ellipse** or **Text**.
  Imported names, displayed text and internal IDs are not used as labels.
- Each level follows painting order, bottommost first; top-level ordering also
  respects layer order.
- Expand groups to see their child objects. Objects with automations, bindings or
  links use bold names in the same text color. Unlinked objects use regular muted text.
  Automations are not listed as tree entries.
- Single-click an object to select it on the canvas and display its properties
  in the existing Properties panel. Object Explorer stays open.
- Search by object name, tag, alias or linked screen. Matching children retain
  their parent hierarchy. Canvas selections are highlighted, expand their parents,
  and scroll into view. Multiple selected objects are highlighted together;
  a search does not hide the selected objects.
- Layer locks and hidden-layer protections remain in effect.

Explorer uses compact 11 px rows and starts docked to the left of the canvas.
It reserves its own column; a docked Properties panel also reserves space so
objects remain reachable in the scrollable workspace. The Properties panel's
contents remain unchanged. Resize Explorer from its corner, or use its float
button to move it into a separate window. Its title bar moves it only while
floating. Use the dock button to return it to the workspace, or close with **×**. Reopen it using **View → Object Explorer**.
Closing the explorer also remembers the hidden preference. It is
hidden in Run mode.

The initial explorer does not reorder, regroup or reparent objects. Browsing
and selection do not edit the saved screen. Manual zoom remains unchanged; larger screens can be scrolled within the
remaining canvas area.
