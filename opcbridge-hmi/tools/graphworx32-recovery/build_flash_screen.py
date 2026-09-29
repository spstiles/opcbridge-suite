"""Usage: build_flash_screen.py SOURCE.gdf GEOMETRY.json VISIBILITY.screen OUTPUT.screen"""
import json
import sys
from pathlib import Path
import olefile
from flash_sources import audit_flash_sources, bind_flash_displays

if len(sys.argv) != 5:
    raise SystemExit(__doc__)
source, geometry, preview, output = map(Path, sys.argv[1:])
if output.exists():
    raise SystemExit('Refusing to overwrite existing output: ' + str(output))
screen = json.loads(preview.read_text())
info = screen.get('importInfo', {})
if info.get('format') != 'graphworx32-experimental':
    raise SystemExit('Expected an experimental recovery preview.')
with olefile.OleFileIO(source) as archive:
    data = archive.openstream('Contents').read()
rows = audit_flash_sources(data, json.loads(geometry.read_text()))
stats = bind_flash_displays(screen, rows)
info.update(flashBindingsRecovered=stats, flashRecoveryAudit=rows)
info.setdefault('limitations', []).insert(0, 'Partial Flash recovery: Hide/True/Alternate-when-idle at 1000ms, plus Change Color/True/Original-when-idle at 500 or 1000ms. Other options and conflicting bindings need review. Remap sources; exact source timing still needs visual comparison.')
for obj in screen['objects']:
    if obj.get('id') == 'static_preview_warning':
        obj['text'] = 'FLASH / VISIBILITY / COLOR / NUMERIC PREVIEW — REMAP SOURCES BEFORE USE — NO CONTROL ACTIONS'
with output.open('x') as target:
    json.dump(screen, target, ensure_ascii=False, indent=2)
print(json.dumps(dict(output=str(output), sourceRecords=len(rows), flash=stats)))
