# Screen tags and click confirmation

In edit mode, deselect objects to open Screen Properties. **Screen Tags** lets you add named Boolean, Number, or Text values and set each initial value. Names must be unique within the screen. Imported local Boolean variables appear here too; edit a definition to save its type and initial value.

Use **Screen Tag**, the last source option after Tag and Expression, in an automation's Source list. Choose the declared name in the dropdown. The shared `...` tag picker also has Screen Tag as its last source, including for click-write targets, numeric entry, and bindings without a source selector.

A screen tag is local to one screen instance. Main screens, popups, and separate viewports have independent values, even when displaying the same file. Values survive redraws and live data updates. Opening a new instance initializes its values again; they are not retained across closing/reopening or browser reloads. Editing an initial value changes the saved definition, not a PLC value.

Bindings are saved with `connection_id: "_screen"` and the declared tag name. Expressions can read a screen tag with `tag("_screen", "TagName")`. The runtime handles local reads and writes without sending them to OPCBridge. Existing imported `_local` Boolean bindings remain supported and are scoped to the owning screen instance.

## Confirming click actions

Each action in the shared Click tab has **Require Confirmation**, off by default. When checked, an optional **Confirmation Message** can replace the default “Are you sure?” text.

At runtime, **Confirm** executes the action; **Cancel** or Escape executes nothing. In an ordered sequence, canceling a confirmation stops the remaining actions; actions already completed are not rolled back. Confirmation applies to objects on the main screen, in viewports, and in popups.

For a momentary write requiring confirmation, Confirm sends an on/off pulse rather than requiring the original object to remain held while a dialog is open. Existing momentary writes without confirmation retain their press/release behavior.

For a “Reset Flow Data” command that only needs operator confirmation, enable Require Confirmation on the PLC write action. No screen tag is necessary.
