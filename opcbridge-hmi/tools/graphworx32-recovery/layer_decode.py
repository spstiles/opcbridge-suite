"""Decode GraphWorX32 layer metadata from an OLE ``Contents`` stream.

Layer records are ordinary records in the display's object graph. Each one
carries its display name in the first CString of its group tail, and the
collection that owns them lists them in draw order with a visibility byte
appended after the child list.

Nothing here is keyed on a specific object ID: records are indexed from the
stream itself and the layer collection is found by structure, so an archive
whose layout does not match is reported as having no layers rather than being
guessed at.

Verified against one authorized GraphWorX 6.1 wall display export. This is a
recovery reader, not a general-purpose GraphWorX parser.
"""
import re
import struct

CSTRING_MARKER = b'\xff\xfe\xff'
EMPTY_CSTRING = CSTRING_MARKER + b'\x00'
THREE_EMPTY = EMPTY_CSTRING * 3
# A record's name CString (which may be empty) is followed by seven zero bytes,
# a four-byte field whose value varies, and then the three empty CStrings.
NAME_SPACER = b'\x00' * 7
# A rotated record stores a four-byte float in the middle of that spacer run,
# between two leading zero bytes and one trailing zero byte. The value is
# radians; a record is only accepted as rotated if this shape matches exactly,
# and the tail header still has to validate.
ROTATED_NAME_SPACER_LEN = 7
# Every record begins with this prefix; the object ID sits 8 bytes before it.
RECORD_PREFIX = b'\x0e\x80\x0e\x80\x08\x80'
# A layer's child list is followed by <visible byte> and then a fixed
# discriminator. Two discriminators occur: the plain one, and the variant that
# carries an appended OLayerInfo class record.
VISIBILITY_TAILS = (b'\x03\x91', b'\x03\xff\xff')
TAIL_VERSION = 2

MAX_NAME = 256
MAX_CHILDREN = 20000


def read_cstring(buf, pos):
    """Read one MFC CString at ``pos``. Returns ``(text, next_pos)``.

    Returns ``(None, pos)`` when the marker or the length is not valid, so
    callers can try another candidate without special-casing errors.
    """
    if buf[pos:pos+3] != CSTRING_MARKER:
        return None, pos
    pos += 3
    if pos >= len(buf):
        return None, pos
    length = buf[pos]
    pos += 1
    if length == 255:
        if pos + 2 > len(buf):
            return None, pos
        length = struct.unpack_from('<H', buf, pos)[0]
        pos += 2
    if length > MAX_NAME or pos + length * 2 > len(buf):
        return None, pos
    try:
        return buf[pos:pos + length * 2].decode('utf-16le'), pos + length * 2
    except UnicodeDecodeError:
        return None, pos


def _read_name_before(chunk, spacer_start):
    """Decode the optional name CString that ends at ``spacer_start``.

    Returns the text, or None when the bytes there are not a name. The name is
    accepted only if its length byte makes it end exactly at the spacer and the
    characters are printable, which keeps a coincidental ``ff fe ff`` in the
    record body from being read as a name.
    """
    for length in range(0, MAX_NAME + 1):
        start = spacer_start - 4 - 2 * length
        if start < 0:
            return None
        if chunk[start:start+3] != CSTRING_MARKER:
            continue
        if chunk[start+3] != length:
            continue
        if length == 0:
            return ''
        text, end = read_cstring(chunk, start)
        if text is None or end != spacer_start:
            return None
        if any(ord(ch) < 0x20 or ord(ch) == 0x7F for ch in text):
            return None
        return text
    return None


def read_group_tail(chunk):
    """Read a record's group tail.

    The tail is <optional name CString><spacer><3 empty CStrings><version 2>
    <parent DWORD><flag byte><WORD count><count child IDs>. Returns None when
    the record is not a group, and otherwise a dict with ``name`` (empty for an
    unnamed group), ``parent``, ``children`` and ``end`` (the offset just past
    the child list).
    """
    marker = chunk.find(THREE_EMPTY)
    if marker < 0:
        return None
    name_end = marker - 4
    if name_end < ROTATED_NAME_SPACER_LEN:
        return None
    # Try the unrotated layout first, then the rotated one. In both cases the
    # tail header must still parse, so accepting a second shape here cannot by
    # itself turn a non-group record into a group.
    if chunk[name_end-len(NAME_SPACER):name_end] == NAME_SPACER:
        spacers = (NAME_SPACER,)
    elif (chunk[name_end-ROTATED_NAME_SPACER_LEN:name_end-5] == b'\x00\x00'
            and chunk[name_end-1] == 0):
        spacers = (chunk[name_end-ROTATED_NAME_SPACER_LEN:name_end],)
    else:
        return None
    header = marker + len(THREE_EMPTY)

    # A named record is the expected case for layers, so try it first and fall
    # back to the unnamed group layout only if it does not parse.
    for spacer in spacers:
        for name in (_read_name_before(chunk, name_end - len(spacer)), ''):
            tail = _read_tail_header(chunk, header, name)
            if tail is not None:
                return tail
    return None


def _read_tail_header(chunk, pos, name):
    if pos + 8 > len(chunk):
        return None
    version, parent = struct.unpack_from('<II', chunk, pos)
    if version != TAIL_VERSION:
        return None
    pos += 8
    if pos + 3 > len(chunk):
        return None
    flag = chunk[pos]
    pos += 1
    count = struct.unpack_from('<H', chunk, pos)[0]
    pos += 2
    if count > MAX_CHILDREN or pos + 4 * count > len(chunk):
        return None
    children = list(struct.unpack_from('<' + 'I' * count, chunk, pos)) if count else []
    pos += 4 * count
    return dict(name=name, parent=parent, flag=flag, children=children, end=pos)


def read_visibility(chunk, tail_end):
    """Read the visibility byte that follows a layer's child list.

    Requires a known discriminator after the byte, so a group that is not a
    layer is rejected rather than silently treated as hidden.
    """
    pos = tail_end
    for discriminator in VISIBILITY_TAILS:
        if chunk[pos+1:pos+1+len(discriminator)] == discriminator:
            return bool(chunk[pos]), pos + 1 + len(discriminator)
    return None


_RECORD_CACHE = {}


def build_records(data, end):
    """Index every record in the stream as ``{offset, object_id}``.

    The prefix is a fixed 6-byte sequence preceded by a 4-byte object ID, so
    records are unambiguous and their IDs are unique. The result is memoized per
    stream and length, because the builder calls this repeatedly for the same
    archive; the caller receives a fresh list and must not modify it.
    """
    key = (id(data), end, len(data))
    cached = _RECORD_CACHE.get(key)
    if cached is not None and cached[0] is data:
        return list(cached[1])

    records = []
    for match in re.finditer(re.escape(RECORD_PREFIX), data[:end]):
        offset = match.start() + 4
        if offset < 8:
            continue
        records.append(dict(offset=offset,
                            object_id=struct.unpack_from('<I', data, offset - 8)[0]))
    records.sort(key=lambda rec: rec['offset'])
    _RECORD_CACHE.clear()
    _RECORD_CACHE[key] = (data, records)
    return list(records)


def decode(data, end):
    """Return ``(collection_id, layers)`` for the display's layer stack.

    ``layers`` follows the order the collection declares, and each entry is
    ``{object_id, name, visible, children}``. The collection's list is treated as
    back-to-front, which matches the one verified sample, but that direction has
    not been confirmed against the GraphWorX editor's Draw stack. Returns
    ``(None, [])`` when the archive has no layer collection this reader
    recognises.
    """
    records = build_records(data, end)
    if not records:
        return None, []

    children_by_record = {}
    layers_by_id = {}
    for index, rec in enumerate(records):
        limit = records[index+1]['offset'] if index + 1 < len(records) else end
        chunk = data[rec['offset']:limit]
        tail = read_group_tail(chunk)
        if tail is None:
            continue
        children_by_record[rec['object_id']] = tail['children']
        # A layer is a named group followed by a visibility byte. Requiring the
        # discriminator keeps a plain named group out of the layer stack.
        if not tail['name']:
            continue
        visible = read_visibility(chunk, tail['end'])
        if visible is None:
            continue
        layers_by_id[rec['object_id']] = dict(
            object_id=rec['object_id'], name=tail['name'],
            visible=visible[0], children=tail['children'])

    # The layer collection is the parent that owns the most layers, and its own
    # child list is the draw order.
    owners = {}
    for object_id, children in children_by_record.items():
        for child in children:
            if child in layers_by_id:
                owners.setdefault(object_id, []).append(child)
    if not owners:
        return None, []

    collection = max(owners, key=lambda key: len(owners[key]))
    return collection, [layers_by_id[oid] for oid in owners[collection]]


def group_children(data, end, object_id):
    """Return a record's ordered child IDs, or None if it is not a group.

    Used to reach through a group the geometry probe could not index, so its
    children are recovered even when the group itself is not.
    """
    records = build_records(data, end)
    for index, rec in enumerate(records):
        if rec['object_id'] != object_id:
            continue
        limit = records[index+1]['offset'] if index + 1 < len(records) else end
        tail = read_group_tail(data[rec['offset']:limit])
        return tail['children'] if tail is not None else None
    return None


def sibling_collections(data, end, collection_id):
    """Return the other top-level collections the display keeps beside its layers.

    A GraphWorX display owns a layer collection and a background collection side
    by side. The background collection is not a layer, so it is reported
    separately instead of being folded into the layer stack.
    """
    records = build_records(data, end)
    children_by_record = {}
    for index, rec in enumerate(records):
        limit = records[index+1]['offset'] if index + 1 < len(records) else end
        tail = read_group_tail(data[rec['offset']:limit])
        if tail is not None:
            children_by_record[rec['object_id']] = tail['children']
    owners = [oid for oid, kids in children_by_record.items() if collection_id in kids]
    if not owners:
        return []
    owner = owners[0]
    return [oid for oid in children_by_record[owner] if oid != collection_id]


def main(argv=None):
    """Print a .gdf file's layer stack. Developer research entry point."""
    import argparse
    import json
    import olefile

    parser = argparse.ArgumentParser(description='Report GraphWorX32 layer metadata.')
    parser.add_argument('source', help='GraphWorX32 .gdf file')
    args = parser.parse_args(argv)
    with olefile.OleFileIO(args.source) as handle:
        data = handle.openstream('Contents').read()
    collection, found = decode(data, data.find(b'ODynamicManager'))
    print(json.dumps(dict(layerCollectionObjectId=collection, layers=found), indent=2))
    return 0 if collection is not None else 1


if __name__ == '__main__':
    import sys
    sys.exit(main())
