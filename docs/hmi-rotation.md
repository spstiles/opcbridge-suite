# Rotation automation

In Edit mode, add a Rotation automation to a supported object and open its
Rotation tab. The shared Source row selects a tag or screen tag alias; Source
Type also supports an expression.

**Position** maps Input Min/Max to Angle Start/End. This is appropriate for valve
position, meter needles, and other analog indicators.

**Continuous** uses the source as a run condition. When true/nonzero, the object
spins clockwise or counterclockwise at the configured **Seconds / Turn**. The
minimum period is 0.1 seconds. When false/zero, the object returns to its starting
angle. The starting angle and pivot settings remain available. Input mapping and
Angle End are hidden in this mode.

Continuous rotation runs in Run mode, including referenced screens and popups.
Edit mode leaves the object stationary. Animation follows the browser timeline
so data redraws do not restart its phase. Existing imported GraphWorX rotation
ramps open in Continuous mode with their saved period; existing analog mappings
open in Position mode. Changing modes preserves the input and angle ranges.
