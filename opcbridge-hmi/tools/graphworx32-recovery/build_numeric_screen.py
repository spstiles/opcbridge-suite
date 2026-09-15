"""Add verified numeric candidates to a fresh static recovery preview.

Usage: build_numeric_screen.py SOURCE.gdf GEOMETRY.json STATIC.screen OUTPUT.screen
Never pass a manually repaired screen: this tool is for new recovery previews.
"""
import json
import sys
from pathlib import Path
import olefile
from numeric_sources import audit_numeric_sources, bind_numeric_displays

if len(sys.argv) != 5:
    raise SystemExit(__doc__)
source, geometry, preview, output = map(Path, sys.argv[1:])
if output.exists():
    raise SystemExit('Refusing to overwrite existing output: ' + str(output))
screen = json.loads(preview.read_text())
if screen.get('importInfo', {}).get('format') != 'graphworx32-experimental':
    raise SystemExit('Expected an experimental static recovery preview.')
with olefile.OleFileIO(source) as archive:
    data = archive.openstream('Contents').read()
rows = audit_numeric_sources(data, json.loads(geometry.read_text()))
count = bind_numeric_displays(screen, rows)
for obj in screen['objects']:
    if obj.get('id') == 'static_preview_warning':
        obj['text'] = 'NUMERIC RECOVERY PREVIEW — REMAP SOURCES BEFORE USE — NO CONTROL ACTIONS — OTHER DYNAMICS NOT CONVERTED'
info = screen['importInfo']
info['staticOnly'] = False
info['numericBindingsRecovered'] = count
info['limitations'] = [line for line in info.get('limitations', [])
                       if line != 'No tag bindings, live data, controls or dynamic automations.']
info['limitations'].insert(0, 'Partial read-only numeric bindings; original sources need remapping. Formatting is provisional. Other automations are not converted.')
with output.open('x') as target:
    json.dump(screen, target, ensure_ascii=False, indent=2)
print(json.dumps(dict(output=str(output), sourceLinks=len(rows), bindings=count)))
