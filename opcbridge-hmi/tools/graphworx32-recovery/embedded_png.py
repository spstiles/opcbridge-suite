"""Bounded, CRC-checked extraction of a PNG stored inside an object record."""
import struct
import zlib


def extract_png(record):
    start = record.find(b'\x89PNG\r\n\x1a\n')
    if start < 0:
        return None
    pos = start + 8
    first = True
    width = height = 0
    has_data = False
    while pos + 12 <= len(record) and pos - start <= 16 * 1024 * 1024:
        length = struct.unpack_from('>I', record, pos)[0]
        end = pos + 12 + length
        if end > len(record) or end-start > 16 * 1024 * 1024:
            return None
        kind = record[pos+4:pos+8]
        payload = record[pos+8:pos+8+length]
        crc = struct.unpack_from('>I', record, pos+8+length)[0]
        if zlib.crc32(kind+payload) & 0xffffffff != crc:
            return None
        if first:
            if kind != b'IHDR' or length != 13:
                return None
            width, height = struct.unpack_from('>II', payload)
            if not 0 < width <= 16384 or not 0 < height <= 16384 or width*height > 16777216:
                return None
            first = False
        elif kind == b'IHDR':
            return None
        if kind == b'IDAT':
            has_data = True
        if kind == b'IEND':
            return (record[start:end], width, height) if length == 0 and has_data else None
        pos = end
    return None
