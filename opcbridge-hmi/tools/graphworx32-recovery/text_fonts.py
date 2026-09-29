"""Identify serialized LOGFONT faces structurally, not by installed font names."""
import struct


def font_candidates(chunk, strings):
    candidates = []
    for j, (pos, face) in enumerate(strings[:-1]):
        if pos < 28 or not 1 <= len(face) <= 32 or any(ord(c) < 32 for c in face):
            continue
        height, width, escapement, orientation, weight = struct.unpack_from('<5i', chunk, pos-28)
        if not (1 <= abs(height) <= 2000 and abs(width) <= 2000
                and abs(escapement) <= 3600 and abs(orientation) <= 3600
                and 0 <= weight <= 1000
                and all(v in (0, 1) for v in chunk[pos-8:pos-5])):
            continue
        # Face CString, twelve bytes of metrics, RECT, one byte, text CString.
        face_end = pos + 4 + len(face.encode('utf-16le'))
        if strings[j+1][0] != face_end + 29:
            continue
        candidates.append((j, pos, face))
    return candidates
