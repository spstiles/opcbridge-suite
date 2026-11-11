# Tag aliases in referenced HMI screens

A tag alias carries both a connection ID and a tag name. The same referenced
screen can therefore display and control different equipment for each caller.

1. Open the reusable screen in Edit mode. Under screen Properties → Screen
   Aliases, declare aliases such as `Running` and `Start`, with type **Tag**.
   Mark them required when the screen needs the caller to supply them. Save.
2. For an indicator or other read binding, open its Source tag picker and choose
   `{alias:Running}` under **Screen Aliases**. No local connection is required.
3. For any object's Click write action, open the write tag picker and choose
   **Source → Screen Alias**. Select an existing alias or enter a name such as
   `Start`; there is no need to type braces or choose a connection. Configure its
   write values normally. A momentary action still writes
   its press value and release value to the same resolved destination.
4. On the calling screen, select the action that opens the reusable screen
   (Popup, Navigate, or Load Viewport). Under **Target Screen Aliases**, map
   `Running` and `Start` to the actual connection and tag for that equipment.
   Each alias has a **Source** selector: choose **Text** for a literal value or
   **Tag** for a connection/tag mapping. Number and Boolean definitions retain
   their corresponding literal controls. Tag sources use the standard connection
   dropdown, tag field, and **...** picker, including parent screen aliases.
   Changing the source clears the previous incompatible value. Save both screens.

For example, one caller can map `Start` to `PLC::Pump1.Start`, while another maps
it to `PLC::Pump2.Start`. Each instance resolves its own read and write bindings.
A caller can forward an existing tag alias using `{alias:ParentAlias}` in the
target mapping's tag field.

## Expressions and templates

Read expressions accept tag alias operands, for example:

```text
{alias:Pressure} * 0.145038
```

Declare `Pressure` as a Tag alias. At runtime its mapped value is read using the
mapped connection and tag. The expression editor accepts the placeholder before
that mapping is supplied.

For a writable target, use a direct tag alias such as `{alias:Setpoint}`, rather
than an arithmetic expression. Numeric entry fields also accept direct tag
aliases. A value alias can build a tag name, for example
`Pump{alias:PumpNumber}.Start`; this retains the binding's selected connection.

Unmapped or unresolved aliases cannot be sent as write destinations. Write
permissions and upstream writable-tag checks still apply. Opening a keypad or
pressing a momentary button captures the resolved target for that interaction.

## Editing the caller and target in separate tabs

Tabs opened at the same HMI address share successful screen-save notifications.
Save the target screen after adding or changing aliases. The calling tab refreshes
its Target Screen Aliases fields automatically, keeping its existing mappings
and unsaved screen edits. New aliases appear unassigned. Removed aliases retain
their mappings with a review notice, and changed alias types are flagged.

Unsaved target edits do not trigger a refresh. If an alias field in the calling
tab is being edited, the refresh waits until focus leaves that field so its edit
can commit. Returning to a tab also checks for saved changes it may have missed.
The refresh updates parameter definitions without reloading the calling screen.
