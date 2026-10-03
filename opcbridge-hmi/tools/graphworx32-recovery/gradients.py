"""Conservative recovery of screenshot-verified gradient fill styles.

The class reference belongs to the currently supported archive schema. Unknown
styles remain undecoded rather than guessing their direction from their colors.
"""
import struct


def gradient_payload_start(chunk, tail):
    """Find the settings after a cached or newly declared OGradientInfo."""
    start = tail + 21
    if tail < 0 or tail+20 >= len(chunk) or chunk[tail+20] != 1:
        return None
    declaration = b'\xff\xff\x01\x00\x0d\x00OGradientInfo'
    if chunk[start:start+len(declaration)] == declaration:
        start += len(declaration)
    elif start+2 <= len(chunk) and 0x8000 <= struct.unpack_from('<H', chunk, start)[0] < 0xffff:
        start += 2
    else:
        return None
    # COLORREF uses 0 for direct RGB and 2 for the palette-relative form.
    if start+17 > len(chunk) or chunk[start+3] not in (0, 2) or chunk[start+7] not in (0, 2):
        return None
    return start


def recover_gradient(chunk, tail, schema=5):
    start = gradient_payload_start(chunk, tail)
    if start is None:
        return None
    size = 17 if schema == 3 else 19
    if start+size > len(chunk):
        return None
    payload = chunk[start:start + size]
    # Two COLORREFs, then the observed settings. The remaining fields are
    # deliberately constrained: their general semantics are not decoded.
    if payload[3] != 2 or payload[7] != 2:
        return None
    style = payload[13:15]
    if payload[8] != 1:
        return None
    setting = struct.unpack_from('<H' if schema == 3 else '<I', payload, 15)[0]
    if (style, setting) not in ((b'\x01\x01', 25), (b'\x00\x01', 25), (b'\x00\x00', 100)):
        return None
    if abs(struct.unpack_from('<f', payload, 9)[0] - 0.2) > 0.00001:
        return None
    first = '#' + payload[:3].hex()
    second = '#' + payload[4:7].hex()
    if style in (b'\x00\x01', b'\x00\x00'):
        return f'linear-gradient(180deg, {first} 0%, {second} 100%)'
    return f'linear-gradient(90deg, {first} 0%, {second} 50%, {first} 100%)'
