"""Read-only numeric-source audit for the experimental GDF32 recovery.

This is a candidate decoder, not a complete MFC archive parser. A match is
accepted only when the recovered display also references the automation ID.
It deliberately does not execute expressions or enable writes.
"""
import re
import struct


def class_payload(data, name):
    match = re.search(b'\xff\xff..' + struct.pack('<H', len(name)) + name, data, re.DOTALL)
    return match.end() if match else None


def unicode_string(data, pos):
    if data[pos:pos+3] != b'\xff\xfe\xff' or pos+4 > len(data):
        return None
    size = data[pos+3]
    pos += 4
    if size == 255:
        if pos+2 > len(data):
            return None
        size = struct.unpack_from('<H', data, pos)[0]
        pos += 2
    if size > 32768 or pos+size*2 > len(data):
        return None
    try:
        return data[pos:pos+size*2].decode('utf-16le')
    except UnicodeDecodeError:
        return None


def audit_numeric_sources(data, records):
    point_start = class_payload(data, b'OPointManager')
    point = class_payload(data, b'OPoint')
    alnum = class_payload(data, b'OAlnum')
    if None in (point_start, point, alnum) or not alnum < point_start < point:
        return []
    marker = data[point:point+2]
    sources = {}
    for match in re.finditer(re.escape(marker), data[point_start:]):
        pos = point_start + match.start()
        if pos+4 > len(data):
            continue
        count = struct.unpack_from('<H', data, pos+2)[0]
        end = pos+4+count*4
        if not 1 <= count <= 1000 or end > len(data):
            continue
        source = unicode_string(data, end)
        if not source:
            continue
        for ident in struct.unpack_from('<'+'I'*count, data, pos+4):
            sources.setdefault(ident, set()).add(source)

    # First OAlnum declaration is followed by its reference and base reference.
    signature = data[alnum:alnum+4]
    by_id = {r['object_id']: r for r in records}
    candidates = {}
    for match in re.finditer(re.escape(signature), data[alnum:point_start]):
        pos = alnum+match.start()+4
        if pos+12 > point_start:
            continue
        dynamic_id, point_id, object_id = struct.unpack_from('<III', data, pos)
        record = by_id.get(object_id)
        if not record or 'text' not in record:
            continue
        offset = record['offset']
        if offset < 0 or offset+4 > len(data):
            continue
        count = struct.unpack_from('<H', data, offset+2)[0]
        if count > 1000 or offset+4+count*4 > len(data):
            continue
        references = struct.unpack_from('<'+'I'*count, data, offset+4)
        values = sources.get(dynamic_id, set())
        if dynamic_id not in references or len(values) != 1:
            continue
        candidates.setdefault(dynamic_id, []).append(dict(
            objectId=object_id, dynamicId=dynamic_id, pointId=point_id,
            automationOffset=pos-4, text=record['text'],
            sourceReference=next(iter(values)),
            formattingDecoded=False, writeBehaviorDecoded=False))
    # Do not silently choose one match if the binary scan is ambiguous.
    result = [rows[0] for rows in candidates.values() if len(rows) == 1]
    for row in result:
        pos = row['automationOffset']
        # Observed OAlnum layout with empty common strings only. Require the
        # following CString and placeholder width as independent checks.
        block = data[pos:pos+71]
        if len(block) < 71 or block[67:70] != b'\xff\xfe\xff':
            continue
        integer, decimals = block[62], block[63]
        width = struct.unpack_from('<H', block, 65)[0]
        placeholder = re.search(r'\?+', row['text'])
        if (placeholder and len(placeholder.group()) == width
                and 1 <= integer <= 20 and decimals <= 15
                and integer + decimals + (1 if decimals else 0) <= width
                and block[64] == 0):
            row['formattingCandidate'] = dict(digits=integer+decimals,
                                              decimals=decimals, padZeros=False,
                                              multiplier=1)
    return result


def bind_numeric_displays(screen, rows):
    """Apply only unambiguous text sources; leave all inputs read-only."""
    by_object = {}
    for row in rows:
        by_object.setdefault(row['objectId'], []).append(row)
    count = 0

    def visit(objects):
        nonlocal count
        for obj in objects:
            visit(obj.get('children', []))
            matches = by_object.get(obj.get('source', {}).get('objectId'), [])
            if obj.get('type') != 'text' or len(matches) != 1 or obj.get('textBindings'):
                continue
            row = matches[0]
            text = obj.get('text', '')
            if len(re.findall(r'\?+', text)) != 1 or not row.get('formattingCandidate'):
                continue
            raw = row['sourceReference']
            expression = bool(re.match(r'^\s*x\s*=', raw, re.I) or '{{' in raw)
            binding = dict(enabled=True, status='unresolved', sourceReference=raw,
                           **row['formattingCandidate'])
            if expression:
                binding.update(sourceType='expression', expression=re.sub(r'^\s*x\s*=\s*', '', raw, flags=re.I))
            else:
                binding.update(sourceType='tag', connection_id='', tag=raw)
            obj['text'] = re.sub(r'\?+', '{1}', text, count=1)
            obj['textBindings'] = {'1': binding}
            obj['source']['numericRecovery'] = dict(dynamicId=row['dynamicId'],
                originalText=text, formattingProvisional=True, writesEnabled=False)
            count += 1

    visit(screen.get('objects', []))
    return count


if __name__ == '__main__':
    import json
    import sys
    import olefile
    from pathlib import Path

    with olefile.OleFileIO(sys.argv[1]) as archive:
        contents = archive.openstream('Contents').read()
    records = json.loads(Path(sys.argv[2]).read_text())
    print(json.dumps(audit_numeric_sources(contents, records), indent=2))
