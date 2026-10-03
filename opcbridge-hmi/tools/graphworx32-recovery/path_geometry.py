"""Recover point arrays only when their geometry agrees with stored bounds."""
import math
import struct

from gradients import gradient_payload_start


def recover_points(chunk, tail, bounds, require_closed=False):
    if tail < 0 or tail+21 > len(chunk):
        return None
    flag = chunk[tail+20]
    if flag == 0:
        starts = [tail+21]
    elif flag == 1:
        payload = gradient_payload_start(chunk, tail)
        if payload is None:
            return None
        # The gradient settings may be followed by an eight-byte direction
        # vector before the point count. Validate both layouts against bounds.
        # Files converted to newer OVisible layouts can still contain the
        # older WORD gradient setting. The point count and bounds distinguish
        # these layouts; the OVisible version alone cannot.
        starts = [payload+17, payload+25, payload+19, payload+27]
    else:
        return None
    matches = []
    for start in starts:
        if start+2 > len(chunk):
            continue
        count = struct.unpack_from('<H', chunk, start)[0]
        if not 2 <= count <= 10000 or start+2+count*8 > len(chunk):
            continue
        points = list(struct.iter_unpack('<2f', chunk[start+2:start+2+count*8]))
        if not all(math.isfinite(v) for point in points for v in point):
            continue
        if require_closed and (count < 4 or points[0] != points[-1]):
            continue
        actual = [min(p[0] for p in points), min(p[1] for p in points),
                  max(p[0] for p in points), max(p[1] for p in points)]
        # GraphWorX gives a perfectly straight line a one-pixel extent on its
        # zero-span axis. Keep the points exact and accept that stored box.
        expanded = actual[:]
        if actual[2] == actual[0]:
            expanded[2] += 1
        if actual[3] == actual[1]:
            expanded[3] += 1
        if any(max(abs(a-b) for a,b in zip(candidate, bounds)) <= .05
               for candidate in (actual, expanded)):
            matches.append(points)
    return matches[0] if len(matches) == 1 else None
