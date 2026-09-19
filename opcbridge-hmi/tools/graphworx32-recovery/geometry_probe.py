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

src, dest = map(Path, sys.argv[1:3])
with olefile.OleFileIO(src) as f:
    data = f.openstream('Contents').read()
end = data.find(b'ODynamicManager')
records = []
for match in re.finditer(b'\x08\x80', data[:end]):
    offset = match.start()
    count = struct.unpack_from('<H', data, offset + 2)[0]
    if count > 1000:
        continue
    pos = offset + 4 + count * 4
    if pos + 36 > end:
        continue
    bounds = struct.unpack_from('<4f', data, pos)
    if data[pos:pos+16] != data[pos+16:pos+32]:
        continue
    x, y, right, bottom = bounds
    if not all(math.isfinite(n) and -1000 <= n <= 20000 for n in bounds):
        continue
    if right < x or bottom < y or right == x and bottom == y:
        continue
    object_id = struct.unpack_from('<I', data, pos+32)[0]
    code = struct.unpack_from('<H', data, offset-2)[0]
    rgb = lambda start: '#' + data[start:start+3].hex()
    records.append(dict(offset=offset, bounds=list(bounds), object_id=object_id, type_code=code,
                        provisional_color_a=rgb(pos+37), provisional_color_b=rgb(pos+41),
                        fill_enabled_candidate=bool(data[pos+45]),
                        line_width_candidate=struct.unpack_from('<H', data, pos+46)[0],
                        pen_style_candidate=struct.unpack_from('<I', data, pos+48)[0],
                        edge_effect_candidate=struct.unpack_from('<I', data, pos+57)[0]))

for i, rec in enumerate(records):
    limit = records[i+1]['offset'] if i+1 < len(records) else end
    chunk = data[rec['offset']:limit]
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
        if rec['type_code'] == 0x800b:
            gradient = recover_gradient(chunk, tail)
            if gradient:
                rec['gradient_fill_candidate'] = gradient
        if rec['type_code'] == 0x8014 and chunk[tail+20] == 0 and tail+23 <= len(chunk):
            n = struct.unpack_from('<H', chunk, tail+21)[0]
            if 2 <= n <= 10000 and tail+23+n*8 <= len(chunk):
                points = list(struct.iter_unpack('<2f', chunk[tail+23:tail+23+n*8]))
                if all(math.isfinite(v) for pt in points for v in pt):
                    recovered = [min(p[0] for p in points), min(p[1] for p in points),
                                 max(p[0] for p in points), max(p[1] for p in points)]
                    if max(abs(a-b) for a,b in zip(recovered,rec['bounds'])) <= .05:
                        rec['line_points_candidate'] = points
        if rec['type_code'] == 0x801c and chunk[tail+20] == 0 and tail+45 <= len(chunk):
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
            if n < 2000 and tail+23+4*n <= len(chunk):
                rec['children_candidate'] = list(struct.unpack_from('<'+'I'*n,chunk,tail+23))
                after = tail+23+4*n
                if after+2 <= len(chunk) and chunk[after+1] == 3:
                    rec['layer_visible_candidate'] = bool(chunk[after])
    if rec['type_code'] != 0x801e:
        continue
    limit = records[i+1]['offset'] if i+1 < len(records) else end
    chunk = data[rec['offset']:limit]
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
        if value: strings.append((m.start(), value))
    # Text records contain a LOGFONT face string followed by the display string.
    faces = [(j, p, value) for j,(p,value) in enumerate(strings) if value in ('Arial','Arial Unicode MS','Tahoma','Times New Roman','MS Sans Serif','Verdana','Courier New')]
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
parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="900" viewBox="0 0 7680 3600">', '<rect width="7680" height="3600" fill="white"/>']
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
print(json.dumps({'candidate_count':len(records),'unique_ids':len(set(r['object_id'] for r in records)), 'classes':dict(Counter(hex(r['type_code']) for r in records)), 'extents':[min(r['bounds'][0] for r in records), min(r['bounds'][1] for r in records),max(r['bounds'][2] for r in records), max(r['bounds'][3] for r in records)]},indent=2))
