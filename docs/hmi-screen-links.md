# Open a specific HMI screen by URL

Use `/?screen=SCREEN_NAME` on the HMI server to open a saved screen with the normal
interface. For example:

`http://192.168.100.45:3000/?screen=130-Preliminary%20Treatment`

Use the exact saved screen name. Encode spaces as `%20` (or use `+` in the query
string). The `.screen` or `.jsonc` extension is optional. This selects the initial
screen for that browser tab; it does not change the configured default screen.
Normal runtime and authorized editing remain available.

Existing touchscreen URLs still work: `/touch?screen=SCREEN_NAME` and
`/touch/SCREEN_NAME`. Only `/touch` activates the touchscreen interface. Without
a URL override, the HMI uses its configured default. An unknown screen name shows
the existing missing-startup-screen message rather than opening a different screen.
