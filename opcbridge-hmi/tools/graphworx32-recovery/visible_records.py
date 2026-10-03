"""Locate supported OVisible headers, including the initial class declaration.

MFC writes a class definition on its first use and a short reference afterward.
Offsets refer to the header start; count_offset points past either header form.
This remains a recovery scanner, not a general MFC archive parser.
"""
import re
import struct
import math
from bisect import bisect_right

CANONICAL_TYPES = {'OEllipse': 0x8006, 'ORectangle': 0x800b,
                   'OSymbol': 0x800e, 'OLine': 0x8014, 'OArc': 0x801c,
                   'OText': 0x801e, 'OBitmap': 0x8776, 'OVisOleObj': 0xa68b,
                   # Static appearance only; click behavior is a separate binding.
                   'OButton': 0x801e}


def _object_headers(data, end, visible, base, declarations):
    """Match the object's outer ID to the ID in its OVisible body.

    Walking the inheritance headers also distinguishes real object records from
    an embedded OLine body, which has no outer object ID of its own.
    """
    stops = {entry[1]: entry for entry in declarations}
    width = 2 if visible[2] == 3 else 4
    headers = [(m.start(), m.end()) for m in
               re.finditer(re.escape(struct.pack('<H', base)), data[:end])]
    headers.append((visible[0], visible[1]))
    objects = []
    for offset, count_offset in sorted(headers):
        if count_offset + 2 > end:
            continue
        count = struct.unpack_from('<H', data, count_offset)[0]
        pos = count_offset + 2 + count * width
        if count > 1000 or pos + 32 + width > end:
            continue
        bounds = struct.unpack_from('<4f', data, pos)
        if not all(math.isfinite(n) for n in bounds):
            continue
        ident = int.from_bytes(data[pos+32:pos+32+width], 'little')
        cursor, chain = offset, []
        for _ in range(8):
            if chain and cursor >= width and int.from_bytes(data[cursor-width:cursor], 'little') == ident:
                objects.append((offset, count_offset, chain[-1][1], chain[-1][2]))
                break
            if cursor in stops:
                start, stop, _, name = stops[cursor]
                chain.append((start, stop, name))
                cursor = start
            elif cursor >= 2:
                ref = struct.unpack_from('<H', data, cursor-2)[0]
                if not 0x8000 <= ref < 0xffff:
                    break
                chain.append((cursor-2, cursor, ref))
                cursor -= 2
            else:
                break
    return objects


def archive_headers(data, end):
    """Resolve per-archive class references from their named declarations.

    Visible subclasses serialize their own reference immediately after their
    declaration, followed by the base class reference (or first declaration).
    Only supported OVisible schemas are admitted; unrelated high-bit words are
    not treated as class definitions.
    """
    declarations = []
    for match in re.finditer(rb'\xff\xff(..)(..)', data[:end], re.DOTALL):
        schema, size = struct.unpack('<HH', match.group(1) + match.group(2))
        name = data[match.end():match.end()+size]
        if match.end()+size <= end and 1 <= size <= 80 and re.fullmatch(rb'[A-Za-z][A-Za-z0-9_]+', name):
            declarations.append((match.start(), match.end()+size, schema, name.decode()))
    visible = next((d for d in declarations if d[3] == 'OVisible'), None)
    if visible is None or visible[2] not in (3, 5):
        return []
    base_refs = set()
    for start, stop, schema, name in declarations:
        if name not in CANONICAL_TYPES or name == 'OButton' or stop + 4 > end:
            continue
        own, base = struct.unpack_from('<HH', data, stop)
        if 0x8000 <= own < 0xffff:
            if 0x8000 <= base < 0xffff:
                base_refs.add(base)
    if len(base_refs) != 1:
        return []
    base = next(iter(base_refs))
    objects = _object_headers(data, end, visible, base, declarations)
    types, explicit = {}, {}
    for start, stop, schema, name in declarations:
        if name not in CANONICAL_TYPES or stop + 2 > end:
            continue
        own = struct.unpack_from('<H', data, stop)[0]
        if 0x8000 <= own < 0xffff and own != base:
            types[own] = CANONICAL_TYPES[name]
            explicit[name] = own

    # MFC assigns indices to both class declarations and registered objects.
    # A class first used as an embedded base may omit its own reference. Recover
    # that index only when the whole ObjectManager count agrees and all explicit
    # references agree on the index offset (e.g. an earlier VBA object).
    manager = next((d for d in declarations if d[3] == 'ObjectManager'), None)
    if manager and manager[1]+2 <= end and struct.unpack_from('<H', data, manager[1])[0] == len(objects):
        registrations = sorted(obj[2] for obj in objects)
        indices = {name: 1+i+bisect_right(registrations, start)
                   for i, (start, stop, schema, name) in enumerate(declarations)}
        offsets = {ref-0x8000-indices[name] for name, ref in explicit.items()}
        if len(offsets) == 1:
            adjustment = next(iter(offsets))
            for name, index in indices.items():
                ref = 0x8000 + index + adjustment
                if name in CANONICAL_TYPES and name not in explicit and 0x8000 <= ref < 0xffff:
                    types.setdefault(ref, CANONICAL_TYPES[name])
    hits = []
    for offset, count_offset, _, outer in objects:
        code = CANONICAL_TYPES.get(outer) if isinstance(outer, str) else types.get(outer)
        if code is not None:
            hits.append((offset, count_offset, code, visible[2]))
    return hits


def normalized_chunk(data, start, stop, schema, bounds_offset):
    """Expand schema-3 WORD object IDs to the schema-5 layout used by decoders.

    Geometry and source offsets remain untouched in the archive. Only the
    temporary record body is normalized; child IDs are expanded by its reader.
    """
    chunk = data[start:stop]
    if schema != 3:
        return chunk
    at = bounds_offset - start + 34
    chunk = chunk[:at] + b'\0\0' + chunk[at:]
    marker = chunk.find(b'\xff\xfe\xff\0' * 3)
    if marker >= 2 and marker + 14 <= len(chunk):
        # Schema 3: WORD style field, three empty strings, WORD parent, flag.
        chunk = chunk[:marker] + b'\0\0' + chunk[marker:marker+12] + b'\x02\0\0\0' + chunk[marker+12:marker+14] + b'\0\0' + chunk[marker+14:]
    return chunk

