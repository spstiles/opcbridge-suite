"""Conservative, read-only GDF32 color recovery. No VBA or writes are run.

Known color records are mapped using point IDs for multi-condition rules.
Other variants are retained as unsupported references for review.
"""
import copy
import re
import struct
from numeric_sources import class_payload, unicode_string


def audit_color_sources(data, records):
    start = class_payload(data, b'OColorDynInfo')
    end = class_payload(data, b'OPointManager')
    point = class_payload(data, b'OPoint')
    if None in (start, end, point) or not start < end < point:
        return []
    sources = {}
    point_sources = {}
    for match in re.finditer(re.escape(data[point:point+2]), data[end:]):
        pos = end + match.start()
        if pos + 4 > len(data):
            continue
        count = struct.unpack_from('<H', data, pos+2)[0]
        stop = pos+4+count*4
        if not 1 <= count <= 1000 or stop > len(data):
            continue
        value = unicode_string(data, stop)
        if value:
            string_end = stop + (6 if data[stop+3] == 255 else 4) + len(value.encode('utf-16le'))
            # OPoint stores a type WORD followed by its ID after the CString.
            # Require the surrounding collection key to agree as well.
            if string_end+6 <= len(data) and pos >= 6:
                point_id = struct.unpack_from('<I', data, string_end+2)[0]
                if data[pos-2:pos] == data[point:point+2] and struct.unpack_from('<I', data, pos-6)[0] == point_id:
                    for ident in struct.unpack_from('<'+'I'*count, data, pos+4):
                        point_sources.setdefault((ident, point_id), set()).add(value)
            for ident in struct.unpack_from('<'+'I'*count, data, pos+4):
                sources.setdefault(ident, set()).add(value)
    by_id = {r['object_id']: r for r in records}
    rows = {}
    signature = data[start:start+4]
    common_tail = bytes.fromhex('fffeff000200000000000000fffeff00')
    for match in re.finditer(re.escape(signature), data[start:end]):
        pos = start + match.start()
        if pos+16 > end:
            continue
        ident, point_id, object_id = struct.unpack_from('<III', data, pos+4)
        obj = by_id.get(object_id)
        if not obj:
            continue
        offset = obj['offset']
        if offset < 0 or offset+4 > len(data):
            continue
        count = struct.unpack_from('<H', data, offset+2)[0]
        if count > 1000 or offset+4+count*4 > len(data):
            continue
        if ident not in struct.unpack_from('<'+'I'*count, data, offset+4):
            continue
        row = dict(objectId=object_id, dynamicId=ident, pointId=point_id,
                   automationOffset=pos, sources=sorted(sources.get(ident, [])),
                   pointSources=sorted(point_sources.get((ident, point_id), [])))
        # Only accept the known base tail within this record, not a later
        # dynamic's tail. A derived/base dynamic marker starts the next record.
        next_base = data.find(signature[2:], pos+16, min(end, pos+240))
        limit = next_base-2 if next_base >= 0 else min(end, pos+240)
        tail = data.find(common_tail, pos+16, limit)
        if tail >= 0 and tail+16+19 <= limit:
            row['settings'] = data[tail+16:tail+16+19].hex()
        rows.setdefault((object_id, ident), []).append(row)
    result = []
    for variants in rows.values():
        row = dict(variants[0])
        row['recordCount'] = len(variants)
        row['supported'] = False
        decoded = []
        for variant in variants:
            candidate = dict(variant)
            candidate['sources'] = variant['pointSources'] or (variant['sources'] if len(variants) == 1 else [])
            b = bytes.fromhex(variant.get('settings', ''))
            if (len(b) == 19 and b[:3] == bytes(3)
                    and len(candidate['sources']) == 1
                    and all(b[i] in (0, 2) for i in (6, 10, 14))
                    and all(b[i] in (0, 1) for i in (15, 16, 18))
                    and b[17] == 0):
                candidate.update(supported=True, fillColor='#'+b[3:6].hex(),
                           lineColor='#'+b[7:10].hex(), fillEnabled=bool(b[15]),
                           lineEnabled=bool(b[16]), invert=not bool(b[18]))
                decoded.append(candidate)
        if len(decoded) == len(variants):
            row.update(decoded[0])
            if len(decoded) > 1:
                row['rules'] = decoded
            row['recordCount'] = len(variants)
        else:
            row['variants'] = variants
        result.append(row)
    return result


def bind_color_displays(screen, rows):
    objects = {}
    def collect(items):
        for obj in items:
            objects[obj.get('source', {}).get('objectId')] = obj
            collect(obj.get('children', []))
    collect(screen.get('objects', []))
    stats = dict(sourceBindings=0, objectBindings=0, reviewRequired=0)

    def flag(obj, row, reason):
        obj.setdefault('externalReferences', []).append(dict(
            kind='color', automation='color', status='unsupported', supported=False,
            source=dict(format='graphworx32', value=' | '.join(row['sources']) or f"Color rule {row['dynamicId']}"),
            message=reason))
        stats['reviewRequired'] += 1

    def leaf_rules(obj, row):
        if obj.get('type') == 'group':
            result = []
            for child in obj.get('children', []):
                result.extend(leaf_rules(child, row))
            return result
        kind = obj.get('type')
        if kind not in ('text', 'rect', 'ellipse', 'polyline', 'spline', 'line'):
            raise ValueError('Color targets on this object type are not verified.')
        if obj.get('colorAutomationRules'):
            raise ValueError('Existing color rules require explicit priority review.')
        if any(obj.get(key) for key in ('fillAutomation', 'strokeAutomation', 'backgroundAutomation')):
            raise ValueError('Existing color bindings require explicit priority review.')
        raw = row['sources'][0]
        rule = dict(enabled=True, status='unresolved', sourceReference=raw,
                    invert=row['invert'], sourceType='tag', connection_id='', tag=raw)
        if re.match(r'^\s*x\s*=', raw, re.I) or '{{' in raw:
            rule = dict(enabled=True, status='unresolved', sourceReference=raw,
                        invert=row['invert'], sourceType='expression',
                        expression=re.sub(r'^\s*x\s*=\s*', '', raw, flags=re.I))
        if row.get('flashEnabled'):
            rule.update(flashEnabled=True, flashRate=row['flashRate'], flashWhen=row.get('flashWhen', True))
            if rule['sourceType'] == 'tag':
                rule.update(mode='equals', match='1')
        fill = row['fillEnabled'] and obj.get('fill', 'none') not in ('none', 'transparent')
        line = row['lineEnabled'] and obj.get('stroke', 'none') not in ('none', 'transparent')
        targets = {}
        if kind == 'text':
            # GraphWorX text: Fill = background, Line = glyph foreground.
            rule.update(fillEnabled=row['lineEnabled'], fillColor=row['lineColor'],
                        strokeEnabled=row['fillEnabled'], strokeColor=row['fillColor'])
            if row['lineEnabled']:
                targets['fillAutomation'] = row['lineColor']
            if row['fillEnabled']:
                targets['backgroundAutomation'] = row['fillColor']
        else:
            if kind in ('line', 'spline', 'polyline') and not obj.get('closed'):
                fill = False
            rule.update(fillEnabled=fill, fillColor=row['fillColor'],
                        strokeEnabled=line, strokeColor=row['lineColor'])
            if fill:
                targets['fillAutomation'] = row['fillColor']
            if line:
                targets['strokeAutomation'] = row['lineColor']
        return [(obj, rule, targets)] if targets else []

    # Descendants first. A conflicting parent rule is flagged, never allowed
    # to replace a child's own binding silently.
    ordered = sorted(rows, key=lambda r: objects.get(r['objectId'], {}).get('type') == 'group')
    for row in ordered:
        obj = objects.get(row['objectId'])
        if not obj:
            continue
        if not row['supported']:
            flag(obj, row, 'Multiple rules, ambiguous sources, or unverified color/shadow settings.')
            continue
        try:
            changes = []
            for source_rule in row.get('rules', [row]):
                changes.extend(leaf_rules(obj, source_rule))
        except ValueError as error:
            flag(obj, row, str(error))
            continue
        if not changes:
            flag(obj, row, 'No verified painted target for this color rule.')
            continue
        changed_objects = set()
        for target, rule, targets in changes:
            target.setdefault('colorAutomationRules', []).append(copy.deepcopy(rule))
            for key, color in targets.items():
                binding = dict(copy.deepcopy(rule), onColor=color)
                if key not in target:
                    target[key] = binding
                elif 'rules' in target[key]:
                    target[key]['rules'].append(binding)
                else:
                    target[key] = dict(rules=[target[key], binding])
            target['source']['colorRecovery'] = dict(dynamicId=row['dynamicId'],
                ownerObjectId=row['objectId'], mappingProvisional=True)
            changed_objects.add(id(target))
        stats['objectBindings'] += len(changed_objects)
        stats['sourceBindings'] += 1
    return stats
