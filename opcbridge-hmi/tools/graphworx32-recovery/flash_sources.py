"""Recover screenshot-verified Hide and Change Color flash combinations."""
import re
import struct
from visibility_sources import audit_dynamic_sources
from color_sources import bind_color_displays


def decode_flash(data, pos):
    base = bytes.fromhex('00fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00')
    if data[pos+20:pos+20+len(base)] != base:
        return None
    start = pos+20+len(base)
    settings = data[start:start+21]
    rate = struct.unpack_from('<I', data, pos+16)[0]
    # Screenshot verifies these three flags together; do not infer which bit
    # controls which option in other combinations yet. Color slots are inactive.
    if len(settings) != 21 or settings[:3] != bytes(3):
        return None
    if settings[18:] in (b'\x01\x01\x01', b'\x01\x01\x00') and rate == 1000:
        # SMDwlV9aPt.png confirms 01 01 00 is Hide / Alternate idle /
        # Flash When False. Invert the trigger, not the flash phase.
        return dict(flashRate='slow', sourceRateMs=rate, invert=settings[20] == 0)
    if (settings[18:] == b'\x00\x00\x01' and rate in (500, 1000)
            and all(settings[i] in (0, 2) for i in (6, 10, 14))
            and all(settings[i] in (0, 1) for i in (15, 16)) and settings[17] == 0):
        return dict(flashKind='color', flashEnabled=True, flashWhen=True,
                    flashRate='fast' if rate == 500 else 'slow', sourceRateMs=rate,
                    fillColor='#'+settings[3:6].hex(), lineColor='#'+settings[7:10].hex(),
                    fillEnabled=bool(settings[15]), lineEnabled=bool(settings[16]), invert=False)
    return None


def audit_flash_sources(data, records):
    return audit_dynamic_sources(data, records, b'OFlash', decode_flash)


def bind_flash_displays(screen, rows):
    objects = {}
    def collect(items):
        for obj in items:
            objects[obj.get('source', {}).get('objectId')] = obj
            collect(obj.get('children', []))
    collect(screen.get('objects', []))
    groups = {}
    for row in rows:
        groups.setdefault(row['objectId'], []).append(row)
    stats = dict(bindings=0, colorBindings=0, colorObjects=0, reviewRequired=0, absentObjects=0)
    for oid, variants in groups.items():
        obj = objects.get(oid)
        if obj is None:
            stats['absentObjects'] += 1
            continue
        if len(variants) == 1 and variants[0]['supported'] and variants[0].get('flashKind') == 'color':
            result = bind_color_displays(screen, variants)
            stats['colorBindings'] += result['sourceBindings']
            stats['colorObjects'] += result['objectBindings']
            stats['reviewRequired'] += result['reviewRequired']
            continue
        if len(variants) != 1 or not variants[0]['supported'] or obj.get('visibility'):
            for row in variants:
                obj.setdefault('externalReferences', []).append(dict(
                    kind='flash', automation='visibility', status='unsupported', supported=False,
                    source=dict(format='graphworx32', value=' | '.join(row['sources']) or f"Flash {row['dynamicId']}"),
                    message='Unverified flash options or overlapping visibility; retained for review.'))
            stats['reviewRequired'] += 1
            continue
        row = variants[0]
        raw = row['sources'][0]
        rule = dict(enabled=True, invert=row.get('invert', False), status='unresolved', sourceReference=raw,
                    flashEnabled=True, flashRate=row['flashRate'], flashWhen=True)
        if re.match(r'^\s*x\s*=', raw, re.I) or '{{' in raw:
            rule.update(sourceType='expression', expression=re.sub(r'^\s*x\s*=\s*', '', raw, flags=re.I))
        else:
            rule.update(sourceType='tag', connection_id='', tag=raw, mode='equals', match='1')
        # Collection fallback is hidden even when the source is false. A single
        # visibility rule would blink its inverse while inactive in this HMI.
        obj['visibility'] = dict(enabled=True, defaultVisible=False, rules=[rule])
        obj['source']['flashRecovery'] = dict(dynamicId=row['dynamicId'], sourceRateMs=row['sourceRateMs'])
        stats['bindings'] += 1
    return stats
