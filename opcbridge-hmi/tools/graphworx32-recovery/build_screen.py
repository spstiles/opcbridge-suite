"""One GraphWorX32 recovery command: geometry plus verified read-only bindings.

Usage: build_screen.py SOURCE.gdf OUTPUT.screen
Refuses existing output, including manually repaired screens. Unsupported
binding settings stay in developer diagnostics, not in the saved screen.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import olefile
from numeric_sources import audit_numeric_sources, bind_numeric_displays
from color_sources import audit_color_sources, bind_color_displays
from visibility_sources import audit_visibility_sources, bind_visibility_displays
from animator_sources import audit_animator_sources, bind_animator_displays
from flash_sources import audit_flash_sources, bind_flash_displays


def recover_bindings(screen, data, records):
    audits = dict(numeric=audit_numeric_sources(data, records),
                  color=audit_color_sources(data, records),
                  visibility=audit_visibility_sources(data, records),
                  flash=audit_flash_sources(data, records),
                  animator=audit_animator_sources(data, records))
    stats = dict(numeric=bind_numeric_displays(screen, audits['numeric']),
                 color=bind_color_displays(screen, audits['color']),
                 visibility=bind_visibility_displays(screen, audits['visibility']),
                 flash=bind_flash_displays(screen, audits['flash']),
                 animator=bind_animator_displays(screen, audits['animator'], records))
    skipped = {}

    def clean(objects):
        for obj in objects:
            clean(obj.get('children', []))
            retained = []
            for reference in obj.pop('externalReferences', []):
                if reference.get('supported') is False or reference.get('status') == 'unsupported':
                    kind = reference.get('kind', 'unknown')
                    skipped[kind] = skipped.get(kind, 0) + 1
                else:
                    retained.append(reference)
            if retained:
                obj['externalReferences'] = retained
            if obj.get('id') == 'static_preview_warning':
                obj['text'] = 'RECOVERY PREVIEW — REMAP SOURCES BEFORE USE — PARTIAL READ-ONLY BINDINGS — NO CONTROL ACTIONS'

    clean(screen.get('objects', []))
    info = screen['importInfo']
    info.update(staticOnly=False, bindingsRecovered=stats, skippedBindings=skipped)
    info['limitations'] = [line for line in info.get('limitations', [])
                           if line != 'No tag bindings, live data, controls or dynamic automations.']
    info['limitations'].insert(0, 'Partial numeric, color, visibility, flash and Animator bindings; remap sources before use. Unverified settings and conflicting bindings are skipped. Control actions are not recovered.')
    return audits


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    source, output = map(Path, sys.argv[1:])
    if output.exists():
        raise SystemExit('Refusing to overwrite existing output: ' + str(output))
    diagnostics = Path(tempfile.mkdtemp(prefix='gdf32-recovery-'))
    static = diagnostics / 'static.screen'
    subprocess.run([sys.executable, str(Path(__file__).with_name('build_static_screen.py')),
                    str(source), str(static)], check=True)
    screen = json.loads(static.read_text())
    records = json.loads((diagnostics / 'static-probe/geometry-candidates.json').read_text())
    with olefile.OleFileIO(source) as archive:
        data = archive.openstream('Contents').read()
    audits = recover_bindings(screen, data, records)
    (diagnostics / 'bindings-audit.json').write_text(json.dumps(audits, indent=2))
    with output.open('x') as target:
        json.dump(screen, target, ensure_ascii=False, indent=2)
    print(json.dumps(dict(output=str(output), diagnostics=str(diagnostics),
                         bindings=screen['importInfo']['bindingsRecovered'],
                         skipped=screen['importInfo']['skippedBindings'])))


if __name__ == '__main__':
    main()
