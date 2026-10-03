"""Experimental recovery of OVisible bounds, not a complete MFC decoder."""
import json
import base64
import math
import re
import struct
import sys
from pathlib import Path
from xml.sax.saxutils import escape
import olefile
from embedded_png import extract_png
from gradients import recover_gradient
from text_fonts import font_candidates
from path_geometry import recover_points
from visible_records import archive_headers, normalized_chunk
from embedded_controls import inventory, associated_control
from display_settings import dimensions

src, dest = map(Path, sys.argv[1:3])
with olefile.OleFileIO(src) as f:
    data = f.openstream('Contents').read()
    embedded_controls = inventory(f)
try:
    display_settings = dimensions(data)
except ValueError as error:
    raise SystemExit(str(error))
end = data.find(b'ODynamicManager')
if end < 0:
    raise SystemExit('Missing ODynamicManager section; unsupported archive layout.')
candidates = []
header_info = {}
for offset, count_offset, code, schema in archive_headers(data, end):
    count = struct.unpack_from('<H', data, count_offset)[0]
    if count > 1000:
        continue
    id_width = 2 if schema == 3 else 4
    pos = count_offset + 2 + count * id_width
    if pos + 61 > end:
        continue
    bounds = struct.unpack_from('<4f', data, pos)
    quad_is_unrotated = data[pos:pos+16] == data[pos+16:pos+32]
    x, y, right, bottom = bounds
    if not all(math.isfinite(n) and -1000 <= n <= 20000 for n in bounds):
        continue
    if right < x or bottom < y or (right == x and bottom == y and code != 0x800e):
        continue
    object_id = struct.unpack_from('<H' if schema == 3 else '<I', data, pos+32)[0]
    header_info[offset] = (schema, pos)
    # Style layout is identical after accounting for the narrower object ID.
    style_pos = pos - (2 if schema == 3 else 0)
    rgb = lambda start: '#' + data[start:start+3].hex()
    candidates.append(dict(offset=offset, bounds=list(bounds), object_id=object_id, type_code=code,
                           quad_is_unrotated=quad_is_unrotated,
                           provisional_color_a=rgb(style_pos+37), provisional_color_b=rgb(style_pos+41),
                           fill_enabled_candidate=bool(data[style_pos+45]),
                           line_width_candidate=struct.unpack_from('<H', data, style_pos+46)[0],
                           pen_style_candidate=struct.unpack_from('<I', data, style_pos+48)[0],
                           edge_effect_candidate=struct.unpack_from('<I', data, style_pos+57)[0]))

# An object can match the scan twice: once at its own record and once inside a
# neighbouring record. The unrotated-quad match is the authoritative one, so
# prefer it and only keep a rotated match when no unrotated match exists. This
# admits rotated records (their two quads differ) without duplicating IDs.
records_by_id = {}
for rec in candidates:
    previous = records_by_id.get(rec['object_id'])
    if previous is None:
        records_by_id[rec['object_id']] = rec
    elif previous['quad_is_unrotated'] and not rec['quad_is_unrotated']:
        continue
    elif not previous['quad_is_unrotated'] and rec['quad_is_unrotated']:
        records_by_id[rec['object_id']] = rec
records = sorted(records_by_id.values(), key=lambda rec: rec['offset'])
rotated_ids = sorted(rec['object_id'] for rec in records if not rec['quad_is_unrotated'])

for i, rec in enumerate(records):
    limit = records[i+1]['offset'] if i+1 < len(records) else end
    schema, pos = header_info[rec['offset']]
    chunk = normalized_chunk(data, rec['offset'], limit, schema, pos)
    if rec['type_code'] == 0xa68b:
        control = associated_control(chunk, embedded_controls)
        if control:
            rec['embedded_control_candidate'] = control
    if rec['type_code'] == 0x8776:
        png = extract_png(chunk)
        if png:
            content, width, height = png
            rec['embedded_png_base64'] = base64.b64encode(content).decode('ascii')
            rec['embedded_png_size'] = [width, height]
    # Common visible-object tail: three MFC strings, version, parent ID,
    # gradient flag. Symbol records then contain an ordered child-ID array.
    tail = chunk.find(b'\xff\xfe\xff\x00\xff\xfe\xff\x00\xff\xfe\xff\x00\x02\x00\x00\x00')
    if tail >= 0 and tail+21 <= len(chunk):
        rec['parent_candidate'] = struct.unpack_from('<I', chunk, tail+16)[0]
        if rec['type_code'] in (0x800b, 0x8014):
            gradient = recover_gradient(chunk, tail, schema)
            if gradient:
                rec['gradient_fill_candidate'] = gradient
        if rec['type_code'] == 0x8014 or (rec['type_code'] == 0x800b and not rec['quad_is_unrotated']):
            points = recover_points(chunk, tail, rec['bounds'], require_closed=rec['type_code'] == 0x800b)
            if points:
                rec['line_points_candidate'] = points
        if rec['type_code'] == 0x801c and chunk[tail+20] == 0 and tail+46 <= len(chunk):
            arc_type = chunk[tail+45]
            if arc_type in (0, 1, 2):
                rec['arc_style_candidate'] = ('arc', 'pie', 'chord')[arc_type]
            cx, cy, radius, ratio, start, finish = struct.unpack_from('<6f', chunk, tail+21)
            if all(math.isfinite(v) for v in (cx, cy, radius, ratio, start, finish)) and radius > 0 and ratio > 0:
                sweep = (finish-start+math.pi) % (2*math.pi)-math.pi
                if abs(abs(sweep)-math.pi/2) < .001:
                    points = [[cx+radius*math.cos(start+sweep*j/16),
                               cy-radius*ratio*math.sin(start+sweep*j/16)] for j in range(17)]
                    recovered = [min(p[0] for p in points), min(p[1] for p in points),
                                 max(p[0] for p in points), max(p[1] for p in points)]
                    if max(abs(a-b) for a,b in zip(recovered,rec['bounds'])) < .001:
                        rec['arc_points_candidate'] = points
                        rec['arc_geometry_candidate'] = dict(
                            x=cx-radius, y=cy-radius*ratio, w=radius*2, h=radius*ratio*2,
                            startAngle=-math.degrees(start), sweepAngle=-math.degrees(sweep))
        if rec['type_code'] == 0x800e and chunk[tail+20] == 0 and tail+23 <= len(chunk):
            n = struct.unpack_from('<H', chunk, tail+21)[0]
            width = 2 if schema == 3 else 4
            if n < 2000 and tail+23+width*n <= len(chunk):
                rec['children_candidate'] = list(struct.unpack_from('<'+('H' if width == 2 else 'I')*n,chunk,tail+23))
                after = tail+23+width*n
                if after+2 <= len(chunk) and chunk[after+1] == 3:
                    rec['layer_visible_candidate'] = bool(chunk[after])
    if rec['type_code'] != 0x801e:
        continue
    limit = records[i+1]['offset'] if i+1 < len(records) else end
    chunk = normalized_chunk(data, rec['offset'], limit, schema, pos)
    strings = []
    for m in re.finditer(b'\xff\xfe\xff', chunk):
        p = m.end()
        if p >= len(chunk): continue
        length = chunk[p]; p += 1
        if length == 255:
            if p+2 > len(chunk): continue
            length = struct.unpack_from('<H', chunk, p)[0]; p += 2
        if length > 4096 or p+length*2 > len(chunk): continue
        try: value = chunk[p:p+length*2].decode('utf-16le')
        except UnicodeDecodeError: continue
        strings.append((m.start(), value))
    # Text records contain a LOGFONT face string followed by the display string.
    faces = font_candidates(chunk, strings)
    if len(faces) == 1:
        j,p,face = faces[0]
        if j+1 < len(strings):
            rec['text'] = strings[j+1][1]
            rec['font'] = face
            height = abs(struct.unpack_from('<i', chunk, p-28)[0]) if p>=28 else 0
            rec['font_size_candidate'] = height if 6 <= height <= 200 else 20
            if p >= 12:
                weight = struct.unpack_from('<i', chunk, p-12)[0]
                if 0 <= weight <= 1000:
                    rec['font_weight_candidate'] = weight
            # A stored integer text-layout rectangle follows the face CString
            # and 12 bytes of flags/metrics. All recovered records in this file
            # center that rectangle vertically in the floating object bounds.
            layout_start = p + 4 + len(face) * 2 + 12
            if layout_start + 16 <= len(chunk):
                layout = struct.unpack_from('<4i', chunk, layout_start)
                x, y, right, bottom = rec['bounds']
                if (layout[2] > layout[0] and layout[3] > layout[1]
                        and abs((layout[1]+layout[3]-y-bottom)/2) <= 1):
                    rec['text_layout_bounds_candidate'] = list(layout)
                    rec['vertical_alignment_candidate'] = 'middle'
            # This file stores a byte then a 32-bit horizontal justification
            # after the display CString. Mapping remains provisional pending
            # comparison with GraphWorX32: 0=left, 1=center, 2=right.
            text_start = strings[j+1][0] + 3
            text_length = chunk[text_start]
            text_start += 1
            if text_length == 255:
                text_length = struct.unpack_from('<H', chunk, text_start)[0]
                text_start += 2
            text_end = text_start + text_length * 2
            if text_end + 5 <= len(chunk):
                justification = struct.unpack_from('<I', chunk, text_end+1)[0]
                if chunk[text_end] == 0 and justification in (0, 1, 2):
                    rec['horizontal_alignment_candidate'] = ('left', 'center', 'right')[justification]
                    rec['horizontal_alignment_raw'] = justification

dest.mkdir(parents=True, exist_ok=True)
(dest/'embedded-controls.json').write_text(json.dumps(embedded_controls, indent=2))
(dest/'display-settings.json').write_text(json.dumps(display_settings, indent=2))
by_id = {r['object_id']:r for r in records}
ordered, seen = [], set()
def visit(rec, hidden=False):
    if rec['object_id'] in seen: return
    seen.add(rec['object_id'])
    hidden = hidden or rec.get('layer_visible_candidate') is False
    if not hidden: ordered.append(rec)
    for child in rec.get('children_candidate',[]):
        if child in by_id: visit(by_id[child], hidden)
roots = [r for r in records if r.get('parent_candidate') not in by_id]
for rec in sorted(roots, key=lambda r:r['object_id']): visit(rec)
for rec in records: visit(rec)
width, height = display_settings['width'], display_settings['height']
parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="{1920 * height / width}" viewBox="0 0 {width} {height}">', f'<rect width="{width}" height="{height}" fill="{display_settings["background"]}"/>']
for i, rec in enumerate(ordered):
    x,y,r,b = rec['bounds']
    code = rec['type_code']
    # Class codes observed in this file only; no promise of general applicability.
    color = rec['provisional_color_a']
    fill = rec['provisional_color_b']
    title = escape(f"candidate {rec['object_id']}, class {code:x}, offset {rec['offset']}")
    if code == 0x801e and 'text' in rec:
        lines = rec['text'].replace('\r','').split('\n')
        size = min(rec['font_size_candidate'], max(6,(b-y)/max(1,len(lines))))
        # Alignment/font metrics are provisional until their fields are decoded.
        parts.append(f'<text x="{x}" y="{y+size}" font-family="{escape(rec["font"])}" font-size="{size}" fill="{rec["provisional_color_a"]}">')
        for n,line in enumerate(lines):
            parts.append(f'<tspan x="{x}" dy="{0 if n==0 else size}">{escape(line)}</tspan>')
        parts.append('</text>')
    elif code == 0x8006:
        parts.append(f'<ellipse cx="{(x+r)/2}" cy="{(y+b)/2}" rx="{(r-x)/2}" ry="{(b-y)/2}" fill="{fill}" stroke="{color}"><title>{title}</title></ellipse>')
    elif code == 0x800b:
        parts.append(f'<rect x="{x}" y="{y}" width="{r-x}" height="{b-y}" fill="{fill}" stroke="{color}" stroke-width="1"><title>{title}</title></rect>')
    else:
        parts.append(f'<rect x="{x}" y="{y}" width="{r-x}" height="{b-y}" fill="none" stroke="{color}" stroke-width="1"><title>{title}</title></rect>')
parts.append('</svg>')
(dest/'geometry-preview.svg').write_text('\n'.join(parts))
(dest/'geometry-candidates.json').write_text(json.dumps(records, indent=2))
from collections import Counter
print(json.dumps({'candidate_count':len(records),'unique_ids':len(set(r['object_id'] for r in records)), 'classes':dict(Counter(hex(r['type_code']) for r in records)), 'extents':[min(r['bounds'][0] for r in records), min(r['bounds'][1] for r in records),max(r['bounds'][2] for r in records), max(r['bounds'][3] for r in records)] if records else None},indent=2))
