# Pipe Flow automation

Select a pipe in edit mode and choose **Dynamics → Pipe Flow** (also available in the toolbar Dynamics menu). Flow is offered only for pipes. Its Flow tab is separate from object Motion.

- **Enabled** turns the automation on or off.
- **Enable Source** can be Always, a Boolean tag, an expression, or a screen tag through the shared source selector. Inactive or unavailable sources hide the dashes without changing the pipe body.
- **Speed** is a fixed setting in drawing units per second.
- **Direction** follows the numbered points: Start to end or End to start.
- **Flow Color** defaults to a lighter shade of the current pipe color, including color automations. Very bright pipe colors use a darker shade for contrast. Choose Custom color to use the standard color picker instead. **Width**, **Dash Length**, and **Spacing** control the indicator appearance. Width is limited to the available pipe interior.

The overlay follows the same path and rounded bends as the pipe. Edit mode shows a stationary preview. Runtime uses an animation clock whose phase survives surrounding screen redraws. Remove Flow deletes only the automation, leaving the pipe geometry and appearance intact.
