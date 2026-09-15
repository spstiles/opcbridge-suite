"""Remove verified document/layer wrappers, preserving all leaf world positions."""
import copy
import json
import sys
from pathlib import Path

if len(sys.argv) != 3:
    raise SystemExit('Usage: unwrap_screen.py INPUT.screen OUTPUT.screen')
source, target = map(Path, sys.argv[1:3])
if target.exists():
    raise SystemExit('Output already exists; refusing to overwrite.')
screen = json.loads(source.read_text())
# Document, background collection, layer collection, visible drawing layer.
wrappers = {'gdf32_1', 'gdf32_18788', 'gdf32_221', 'gdf32_248'}

def world_leaves(objects, ox=0, oy=0):
    result = {}
    for obj in objects:
        x, y = ox+obj['x'], oy+obj['y']
        if obj.get('type') == 'group':
            result.update(world_leaves(obj['children'], x, y))
        elif obj.get('type') in ('polyline', 'spline', 'polygon', 'pipe'):
            result[obj['id']] = tuple(v for p in obj['points'] for v in (ox+p['x'], oy+p['y']))
        else:
            result[obj['id']] = (x,y,obj['w'],obj['h'])
    return result

def unwrap(objects, dx=0, dy=0):
    result = []
    for original in objects:
        obj = copy.deepcopy(original)
        obj['x'] += dx
        obj['y'] += dy
        if obj.get('type') in ('polyline', 'spline', 'polygon', 'pipe'):
            for point in obj['points']:
                point['x'] += dx
                point['y'] += dy
        if obj['id'] in wrappers:
            assert obj['type'] == 'group'
            result.extend(unwrap(obj['children'], obj['x'], obj['y']))
        else:
            result.append(obj)
    return result

before = world_leaves(screen['objects'])
screen['objects'] = unwrap(screen['objects'])
after = world_leaves(screen['objects'])
assert before.keys() == after.keys()
assert all(all(abs(a-b) < 1e-8 for a,b in zip(before[key],after[key])) for key in before)
screen['importInfo']['removedWrapperGroups'] = sorted(wrappers)
target.write_text(json.dumps(screen, ensure_ascii=False, indent=2))
print(f'Created {target}\nVerified {len(after)} leaf positions and dimensions; {len(screen["objects"])} top-level objects.')
