# Feature Ideas

## Configuration Publish / Peer Distribution

Idea:
- Configure one `opcbridge-suite` server and publish selected configuration/artifacts to other `opcbridge-suite` servers.

Why:
- Multi-node deployments will otherwise drift.
- HMI screens, images, users, and selected config sections are likely to need promotion across servers.

Desired behavior:
- Authenticate to peer servers.
- Maintain a saved list of peer targets.
- Choose what to publish instead of forcing full-server overwrite.
- Preview diffs before apply.
- Validate version/capability compatibility on the target.
- Apply through API, not ad hoc file copy.
- Record audit events for publish actions.
- Optionally restart only affected services after apply.

Likely publish units:
- HMI screens
- HMI images/library assets
- users / roles
- alarms configuration
- selected config sections
- reports / report definitions

Non-goals:
- No indefinite support for multiple internal config formats.
- No blind full-instance overwrite by default.

## HMI Touchscreen Runtime Endpoint

Idea:
- Provide a dedicated HMI endpoint such as `/touch` or `/tablet` for tablet/kiosk operation.

Why:
- Tablets and panel PCs need a runtime-only experience with touch-friendly data entry.
- A dedicated URL makes the intended mode explicit and easy to bookmark or kiosk.
- The same HMI screens can be reused because runtime scaling already exists.

Desired behavior:
- Serve the normal HMI runtime screens and assets.
- Force touchscreen runtime mode when loaded through the touch endpoint.
- Disable edit-mode entry and edit shortcuts from that endpoint.
- Apply touch-focused runtime behavior without changing screen definitions.
- Use large popup keypad/keyboard dialogs for data entry.
- Use the same touch-friendly entry dialogs for number inputs and prompt-write actions.

Non-goals:
- No duplicated HMI screen files for tablet mode.
- No automatic geometry changes to objects on the screen.
- No separate editor experience for touchscreen mode in the first version.

## HMI Property / Automation Clipboard

Idea:
- Add right-click actions to copy and paste automation, tag bindings, and other dynamic object properties between HMI objects.

Why:
- Many screens reuse the same automation patterns across similar objects.
- Editing connection/tag fields repeatedly is slow and error-prone.
- Copy/paste would make bulk HMI setup faster without creating rigid widgets.

Desired behavior:
- Right-click object actions such as `Copy Automation`, `Paste Automation`, `Copy Tag Bindings`, and `Copy Dynamic Properties`.
- Paste only compatible properties supported by the target object type.
- Support targeted copy groups such as visibility, color automation, rotation, motion, multi-state, and text/button bindings.
- Keep paste behavior forward-only and object-type aware instead of trying to preserve legacy formats.
- Show a small result message such as `Pasted 3 automation settings`.

Non-goals:
- No forced object cloning when only automation or bindings are wanted.
- No pasting unsupported properties silently into object definitions.

## HMI Runtime Data Quality Indication

Idea:
- Make bad, stale, missing, or disconnected runtime tag data obvious to operators.

Why:
- Operators need to distinguish real process values from untrustworthy HMI data.
- Commercial HMI packages commonly gray out affected objects and show placeholder values when data is unavailable.
- This makes PLC/connection failures visible from the screen without opening diagnostics.

Desired behavior:
- Text/value bindings show placeholders such as `???` or `???.??` based on configured digits/decimals when data is invalid.
- Objects driven by invalid automation tags render in a faulted/desaturated gray state.
- Treat missing tag, missing connection, no value received, stale value, and bad quality as invalid data.
- Preserve the normal/default object appearance when automation is valid but false/off.
- Consider a global runtime option for enabling/disabling data-quality indication.
- Show enough detail in edit/properties panels to identify the bad connection or tag.

Non-goals:
- No silent substitution of zero or false for bad data.
- No masking a PLC/connection problem as a normal process state.

## HMI Color Picker Favorite Swatches

Idea:
- Allow users to save frequently used custom colors as reusable favorite swatches in the HMI color picker.

Why:
- Screen development often reuses project-specific colors that are not part of the standard palette.
- Re-entering RGB/hex values repeatedly is slow and error-prone.
- Favorites would preserve the current palette workflow while making repeated custom colors faster to apply.

Desired behavior:
- Add a `Favorites` swatch row in the color picker.
- Provide a simple `+` action to save the current solid color as a favorite.
- Click a favorite swatch to apply it to the active color field.
- Allow removing a favorite swatch by right-click or a small delete action.
- Show RGB/hex tooltip details for each favorite.
- Store favorites in browser `localStorage` initially, with possible server/user settings later.

Non-goals:
- No gradient favorites in the first pass.
- No requirement to synchronize favorites across machines initially.
