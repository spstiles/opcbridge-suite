"""Build a diagnostic static screen from the experimental geometry probe."""
import json
import runpy
import sys
from pathlib import Path

target = Path(sys.argv[2])
if target.exists():
    raise SystemExit('Refusing to overwrite existing output: ' + str(target))
probe_dir = target.parent / (target.stem + '-probe')
if probe_dir.exists():
    raise SystemExit('Refusing to overwrite probe output: ' + str(probe_dir))
sys.argv = ['geometry_probe.py', sys.argv[1], str(probe_dir)]
probe = runpy.run_path(str(Path(__file__).with_name('geometry_probe.py')))
records, by_id = probe['records'], probe['by_id']
visible = {r['object_id'] for r in probe['ordered']}
seen = set()
counts = {}

def convert(rec, origin=(0,0)):
    ident = rec['object_id']
    if ident in seen or ident not in visible:
        return None
    seen.add(ident)
    x,y,right,bottom = rec['bounds']
    code = rec['type_code']
    obj = dict(id=f'gdf32_{ident}', importId=f'gdf32_{ident}', x=x-origin[0], y=y-origin[1],
               w=right-x, h=bottom-y,
               source={'format':'graphworx32-experimental','objectId':ident,'recordOffset':rec['offset']})
    if code == 0x800e:
        obj['type'] = 'group'
        obj['children'] = [child for cid in rec.get('children_candidate',[]) if cid in by_id
                           if (child := convert(by_id[cid],(x,y))) is not None]
        if not obj['children']: return None
    elif code == 0x8776 and 'embedded_png_base64' in rec:
        obj.update(type='image', src='data:image/png;base64,'+rec['embedded_png_base64'],
                   preserveAspectRatio='none')
        obj['source']['conversionNote'] = 'Embedded PNG recovered with chunk CRC validation.'
    elif code == 0x8014 and 'line_points_candidate' in rec:
        points = [dict(x=px-origin[0], y=py-origin[1]) for px,py in rec['line_points_candidate']]
        repeated_endpoint = len(points) > 2 and points[0] == points[-1]
        closed = len(points) > 2 and (repeated_endpoint or rec['fill_enabled_candidate'])
        if repeated_endpoint:
            points.pop()
        obj.update(type='polyline', points=points, closed=closed,
                   fill=rec['provisional_color_b'] if closed and rec['fill_enabled_candidate'] else 'transparent',
                   stroke=rec['provisional_color_a'] if rec['pen_style_candidate'] != 5 else 'none',
                   strokeWidth=max(1, rec['line_width_candidate']))
        obj['source']['conversionNote'] = 'Recovered line/path points; source bounds verified.'
    elif code == 0x801c and 'arc_points_candidate' in rec and not rec.get('fill_enabled_candidate'):
        obj.update(type='spline', closed=False, fill='transparent',
                   points=[dict(x=px-origin[0], y=py-origin[1]) for px,py in rec['arc_points_candidate']],
                   stroke=rec['provisional_color_a'] if rec['pen_style_candidate'] != 5 else 'none',
                   strokeWidth=max(1, rec['line_width_candidate']))
        obj['source']['conversionNote'] = 'Quarter ellipse approximated by editable spline; bounds verified.'
    elif code == 0x801e and 'text' in rec:
        obj.update(type='text',text=rec['text'].replace('\r',''),fontSize=rec['font_size_candidate'],
                   fill=rec['provisional_color_a'],background='transparent',borderEnabled=False,
                   autoSize=False,positionMode='insertion-point',align='left',valign='top',padding=0,wrapMode='explicit')
        obj['align'] = rec.get('horizontal_alignment_candidate', 'left')
        # HMI x is the insertion anchor, not always the box's left edge.
        obj['x'] += obj['w'] * {'left': 0, 'center': 0.5, 'right': 1}[obj['align']]
        obj['valign'] = rec.get('vertical_alignment_candidate', 'top')
        if obj['valign'] == 'middle':
            obj['y'] += obj['h'] / 2
        obj['source']['alignmentProvisional'] = True
        obj['bold'] = rec.get('font_weight_candidate', 400) >= 700
        layout = rec.get('text_layout_bounds_candidate')
        if layout and obj['align'] in ('left', 'right'):
            inset = layout[0]-x if obj['align'] == 'left' else right-layout[2]
            # Use the stored layout edge for horizontal placement. Vertical
            # centering is unchanged by symmetric native text padding.
            if 0 <= inset < min(obj['w'], obj['h']) / 2:
                obj['padding'] = inset
    else:
        supported = code in (0x8006,0x800b)
        obj.update(type='ellipse' if code==0x8006 else 'rect',
                   fill=rec['provisional_color_b'] if supported else 'transparent',
                   stroke=rec['provisional_color_a'],strokeWidth=1)
        if not supported: obj['source']['conversionWarning']='Bounding-box placeholder; original shape not decoded.'
    # Provisional common style layout: fill byte, WORD pen width, DWORD
    # Windows-style pen. Only solid/null styles observed in these objects.
    # Keep unsupported bounding-box placeholders visibly provisional.
    if code in (0x8006, 0x800b, 0x801e):
        pen = rec.get('pen_style_candidate')
        width = rec.get('line_width_candidate', 0)
        if pen in (0, 5) and 0 <= width <= 100:
            filled = rec.get('fill_enabled_candidate', True)
            if obj['type'] == 'text':
                obj['background'] = rec['provisional_color_b'] if filled else 'transparent'
                obj['borderEnabled'] = pen != 5
                if pen != 5:
                    obj['borderColor'] = rec['provisional_color_a']
                    obj['borderWidth'] = max(1, width)
            else:
                obj['fill'] = rec['provisional_color_b'] if filled else 'transparent'
                obj['stroke'] = rec['provisional_color_a'] if pen != 5 else 'none'
                obj['strokeWidth'] = max(1, width) if pen != 5 else 0
        # Effects are independent of the ordinary pen: text can have a null
        # pen and still draw a raised frame. 10=inset is source-confirmed;
        # 5=outset is its provisional paired mapping. Leave groups/ellipses
        # alone until their frame geometry is understood.
        effect = rec.get('edge_effect_candidate')
        if code in (0x800b, 0x801e) and effect in (5, 10):
            obj['borderStyle'] = 'inset' if effect == 10 else 'outset'
            if obj['type'] == 'text':
                obj['borderEnabled'] = True
                obj['borderColor'] = rec['provisional_color_a']
                obj['borderWidth'] = max(1, rec.get('line_width_candidate', 0))
            else:
                obj['stroke'] = rec['provisional_color_a']
                obj['strokeWidth'] = max(1, rec.get('line_width_candidate', 0))
    counts[obj['type']] = counts.get(obj['type'],0)+1
    return obj

objects=[]
for rec in probe['ordered']:
    if rec['object_id'] not in seen:
        result=convert(rec)
        if result: objects.append(result)
# Visible warning is intentional: this must not be mistaken for live plant data.
objects.append(dict(type='text',id='static_preview_warning',x=0,y=0,w=7680,h=32,
    text='STATIC RECOVERY PREVIEW — NO LIVE DATA OR CONTROL — dynamics, visibility and some shapes are not converted',
    fontSize=24,fill='#ffffff',background='#8b0000',autoSize=False,positionMode='insertion-point',align='left',valign='top',padding=2))
screen=dict(width=7680,height=3600,background='#ffffff',objects=objects,
    importInfo=dict(format='graphworx32-experimental',sourceFile=Path(sys.argv[1]).name,
        staticOnly=True,zOrderPreserved=False,
        limitations=['No tag bindings, live data, controls or dynamic automations.',
        'Recovered grouping and layer visibility are provisional.',
        'Quarter-ellipse arcs are spline approximations; unmatched paths and unrecognized objects remain bounding-box placeholders.',
        'Fonts, transparency, fills, borders and gradients are not fully decoded.']))
target.write_text(json.dumps(screen,ensure_ascii=False,indent=2))
print(json.dumps({'output':str(target),'objects_by_type':counts,'bytes':target.stat().st_size}))
