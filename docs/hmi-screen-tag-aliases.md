# Tag aliases in referenced HMI screens

A tag alias carries both a connection ID and a tag name. The same referenced
screen can therefore display and control different equipment for each caller.

1. Open the reusable screen in Edit mode. Under screen Properties → Screen
   Aliases, declare aliases such as `Running` and `Start`, with type **Tag**.
   Mark them required when the screen needs the caller to supply them. Save.
2. For an indicator or other read binding, open its Source tag picker and choose
   `{alias:Running}` under **Screen Aliases**. No local connection is required.
3. For a button's Click write action, choose `{alias:Start}` in the write tag
   picker. Configure its write values normally. A momentary action still writes
   its press value and release value to the same resolved destination.
4. On the calling screen, select the action that opens the reusable screen
   (Popup, Navigate, or Load Viewport). Under **Target Screen Aliases**, map
   `Running` and `Start` to the actual connection and tag for that equipment.
   Save both screens.

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
