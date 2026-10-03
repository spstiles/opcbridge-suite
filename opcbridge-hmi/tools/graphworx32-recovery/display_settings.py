"""Recover persisted display dimensions, independently of object bounds.

The display settings follow the top-level OGrid/OTabInfo settings. The window
properties may be a cached class reference (or occur earlier in a pick action),
so searching for the first OWindowProperties declaration is not sufficient.
"""
import re
import struct


def dimensions(data):
    grids = list(re.finditer(b'\xff\xff\x01\x00\x05\x00OGrid', data))
    if len(grids) != 1:
        raise ValueError('Cannot identify the display settings grid uniquely.')
    start = grids[0].end()
    matches = []
    # Bounded settings block, not a search across geometry or arbitrary streams.
    for pos in range(start, min(start + 1024, len(data) - 56)):
        width, height = struct.unpack_from('<II', data, pos)
        if not (1 <= width <= 32768 and 1 <= height <= 32768):
            continue
        if data[pos + 8] not in (0, 1) or data[pos + 9] not in (0, 1):
            continue
        if data[pos + 14:pos + 18] != b'\x01\x00\x00\x00':
            continue
        # Seven following COLORREFs and intervening Boolean flags, followed by
        # the persisted Unicode wildcard CString. Zoom is deliberately ignored.
        if not all(data[pos + offset] in (0, 2) for offset in (18, 28, 32, 36, 41, 45, 49)):
            continue
        if not all(data[pos + offset] in (0, 1) for offset in (23, 24, 37, 50)):
            continue
        if data[pos + 51:pos + 57] != b'\xff\xfe\xff\x01*\x00':
            continue
        matches.append(dict(width=width, height=height, offset=pos))
    if len(matches) != 1:
        raise ValueError('Cannot recover source display dimensions uniquely; no canvas size was guessed.')
    result = matches[0]
    pos = result['offset']
    if data[:2] != b'\xff\xff' or data[4:14] != b'\x08\x00ODisplay':
        raise ValueError('Missing source display schema.')
    schema = struct.unpack_from('<H', data, 2)[0]
    # Version 18 has a WORD where version 26 has a DWORD in the style tail.
    distance = {18: 36, 26: 38}.get(schema)
    if distance is None:
        raise ValueError('Unsupported source display style schema.')
    color = data[pos - distance:pos - distance + 4] if pos >= distance else b''
    if len(color) != 4 or color[3] not in (0, 2):
        raise ValueError('Unsupported display background color encoding.')
    result['background'] = '#' + color[:3].hex()
    return result
