"""Usage: build_visibility_screen.py SOURCE.gdf GEOMETRY.json COLOR.screen OUTPUT.screen"""
import json
import sys
from pathlib import Path
import olefile
from layer_decode import build_records
from visibility_sources import audit_visibility_sources, bind_visibility_displays

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
records = json.loads(geometry.read_text())
layer_ids = {layer.get('source', {}).get('objectId') for layer in screen.get('layers', [])}
records += [rec for rec in build_records(data, data.find(b'ODynamicManager'))
            if rec['object_id'] in layer_ids and rec['object_id'] not in {r['object_id'] for r in records}]
rows = audit_visibility_sources(data, records)
stats = bind_visibility_displays(screen, rows)
info.update(staticOnly=False, visibilityBindingsRecovered=stats, visibilityRecoveryAudit=rows)
info.setdefault('limitations', []).insert(0, 'Visibility: only verified Hide Object when False records recovered. Remap sources before runtime testing. Flash/Disable and other layouts are not converted.')
for obj in screen['objects']:
    if obj.get('id') == 'static_preview_warning':
        obj['text'] = 'VISIBILITY / COLOR / NUMERIC PREVIEW — REMAP SOURCES BEFORE USE — NO CONTROL ACTIONS'
with output.open('x') as target:
    json.dump(screen, target, ensure_ascii=False, indent=2)
print(json.dumps(dict(output=str(output), sourceRecords=len(rows), visibility=stats)))
