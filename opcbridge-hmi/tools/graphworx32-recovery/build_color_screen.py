"""Build a NEW read-only numeric/color preview; never overwrite repaired screens.

Usage: build_color_screen.py SOURCE.gdf GEOMETRY.json STATIC.screen OUTPUT.screen
"""
import json
import sys
from pathlib import Path
import olefile
from numeric_sources import audit_numeric_sources, bind_numeric_displays
from color_sources import audit_color_sources, bind_color_displays

if len(sys.argv) != 5:
    raise SystemExit(__doc__)
source, geometry, preview, output = map(Path, sys.argv[1:])
if output.exists():
    raise SystemExit('Refusing to overwrite existing output: ' + str(output))
screen = json.loads(preview.read_text())
info = screen.get('importInfo', {})
if info.get('format') != 'graphworx32-experimental' or info.get('staticOnly') is False:
    raise SystemExit('Expected a fresh experimental static recovery preview.')
with olefile.OleFileIO(source) as archive:
    data = archive.openstream('Contents').read()
records = json.loads(geometry.read_text())
numeric_count = bind_numeric_displays(screen, audit_numeric_sources(data, records))
rows = audit_color_sources(data, records)
stats = bind_color_displays(screen, rows)
for obj in screen['objects']:
    if obj.get('id') == 'static_preview_warning':
        obj['text'] = 'COLOR / NUMERIC RECOVERY PREVIEW — REMAP SOURCES BEFORE USE — NO CONTROL ACTIONS'
info.update(staticOnly=False, numericBindingsRecovered=numeric_count,
            colorBindingsRecovered=stats, colorRecoveryAudit=rows)
info['limitations'] = [line for line in info.get('limitations', [])
                      if line != 'No tag bindings, live data, controls or dynamic automations.']
info['limitations'].insert(0, 'Partial read-only numeric and color bindings. Remap original references. Multiple color conditions retain serialized order with native first-match precedence; simultaneous-true behavior needs source comparison. Ambiguous records are flagged. Other dynamics are not converted.')
with output.open('x') as target:
    json.dump(screen, target, ensure_ascii=False, indent=2)
print(json.dumps(dict(output=str(output), numericBindings=numeric_count, colors=stats)))
