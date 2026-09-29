"""Recover the screenshot-verified OHide/Hide Object when False layout."""
import re
import struct
from numeric_sources import class_payload, unicode_string


def audit_visibility_sources(data, records):
    tail = bytes.fromhex('e803000000fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00000000')
    return audit_dynamic_sources(data, records, b'OHide',
        lambda data, pos: {} if data[pos+16:pos+16+len(tail)] == tail else None)


def audit_dynamic_sources(data, records, class_name, decode):
    start = class_payload(data, class_name)
    end = class_payload(data, b'OPointManager')
    point = class_payload(data, b'OPoint')
    if None in (start, end, point) or not start < end < point:
        return []
    sources = {}
    for match in re.finditer(re.escape(data[point:point+2]), data[end:]):
        pos = end + match.start()
        if pos+4 > len(data):
            continue
        count = struct.unpack_from('<H', data, pos+2)[0]
        stop = pos+4+count*4
        if not 1 <= count <= 1000 or stop > len(data):
            continue
        source = unicode_string(data, stop)
        if source:
            for ident in struct.unpack_from('<'+'I'*count, data, pos+4):
                sources.setdefault(ident, set()).add(source)
    objects = {r['object_id']: r for r in records}
    rows = []
    # Match the complete observed fixed base/settings layout, not merely
    # three zero bytes somewhere before the next record. Other variants need
    # a source example before deciding between Hide/Disable and True/False.
    for match in re.finditer(re.escape(data[start:start+4]), data[start:end]):
        pos = start + match.start()
        if pos+16 > end:
            continue
        ident, point_id, object_id = struct.unpack_from('<III', data, pos+4)
        obj = objects.get(object_id)
        if not obj:
            continue
        offset = obj['offset']
        if offset < 0 or offset+4 > len(data):
            continue
        count = struct.unpack_from('<H', data, offset+2)[0]
        if count > 1000 or offset+4+4*count > len(data):
            continue
        if ident not in struct.unpack_from('<'+'I'*count, data, offset+4):
            continue
        refs = sorted(sources.get(ident, []))
        settings = decode(data, pos)
        rows.append(dict(objectId=object_id, dynamicId=ident, pointId=point_id,
                         automationOffset=pos, sources=refs,
                         supported=len(refs) == 1 and settings is not None,
                         **(settings or {})))
    return rows


def bind_visibility_displays(screen, rows):
    objects = {}
    def collect(items):
        for obj in items:
            objects[obj.get('source', {}).get('objectId')] = obj
            collect(obj.get('children', []))
    collect(screen.get('objects', []))
    grouped = {}
    for row in rows:
        grouped.setdefault(row['objectId'], []).append(row)
    stats = dict(bindings=0, reviewRequired=0, absentObjects=0)
    for object_id, variants in grouped.items():
        obj = objects.get(object_id)
        if obj is None:
            stats['absentObjects'] += 1
            continue
        if len(variants) != 1 or not variants[0]['supported'] or obj.get('visibility'):
            for row in variants:
                obj.setdefault('externalReferences', []).append(dict(
                    kind='visibility', automation='visibility', status='unsupported', supported=False,
                    source=dict(format='graphworx32', value=' | '.join(row['sources']) or f"Visibility {row['dynamicId']}"),
                    message='Unverified visibility settings, multiple rules, or existing binding.'))
            stats['reviewRequired'] += 1
            continue
        row = variants[0]
        raw = row['sources'][0]
        binding = dict(enabled=True, invert=False, status='unresolved', sourceReference=raw)
        if re.match(r'^\s*x\s*=', raw, re.I) or '{{' in raw:
            binding.update(sourceType='expression', expression=re.sub(r'^\s*x\s*=\s*', '', raw, flags=re.I))
        else:
            binding.update(sourceType='tag', connection_id='', tag=raw, mode='equals', match='1')
        obj['visibility'] = binding
        obj['source']['visibilityRecovery'] = dict(dynamicId=row['dynamicId'], hideWhen=False)
        stats['bindings'] += 1
    return stats
