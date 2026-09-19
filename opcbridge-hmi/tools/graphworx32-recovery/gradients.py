"""Conservative recovery of screenshot-verified gradient fill styles.

The class reference belongs to the currently supported archive schema. Unknown
styles remain undecoded rather than guessing their direction from their colors.
"""
import struct


def recover_gradient(chunk, tail):
    start = tail + 21
    if tail < 0 or len(chunk) < start + 21 or chunk[tail + 20] != 1:
        return None
    if chunk[start:start + 2] != b'\x09\x80':
        return None
    payload = chunk[start + 2:start + 21]
    # Two COLORREFs, then the observed settings. The remaining fields are
    # deliberately constrained: their general semantics are not decoded.
    if payload[3] != 2 or payload[7] != 2:
        return None
    style = payload[13:15]
    if payload[8] != 1:
        return None
    setting = struct.unpack_from('<I', payload, 15)[0]
    if (style, setting) not in ((b'\x01\x01', 25), (b'\x00\x01', 25), (b'\x00\x00', 100)):
        return None
    if abs(struct.unpack_from('<f', payload, 9)[0] - 0.2) > 0.00001:
        return None
    first = '#' + payload[:3].hex()
    second = '#' + payload[4:7].hex()
    if style in (b'\x00\x01', b'\x00\x00'):
        return f'linear-gradient(180deg, {first} 0%, {second} 100%)'
    return f'linear-gradient(90deg, {first} 0%, {second} 50%, {first} 100%)'
