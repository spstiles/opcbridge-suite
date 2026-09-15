"""Read-only structural probe; does not claim to decode drawing objects."""
import hashlib
import json
import re
import struct
import sys
from pathlib import Path
import olefile

source = Path(sys.argv[1])
with olefile.OleFileIO(source) as container:
    streams = [{"path": "/".join(path), "bytes": container.get_size(path)} for path in container.listdir()]
    contents = container.openstream("Contents").read()

classes = []
for match in re.finditer(rb"\xff\xff(..)(..)" , contents, re.DOTALL):
    schema, size = struct.unpack('<HH', match.group(1) + match.group(2))
    name = contents[match.end():match.end() + size]
    if 2 <= size <= 80 and re.fullmatch(rb'[A-Za-z][A-Za-z0-9_]+', name):
        classes.append({"offset": match.start(), "schema": schema, "name": name.decode('ascii')})

print(json.dumps({
    "source": source.name,
    "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "streams": streams,
    "class_declarations": classes,
    "sections": {name: contents.find(name.encode()) for name in ['ObjectManager', 'ODynamicManager', 'OPointManager']},
    "limitations": ["Class declarations are not object counts.", "Geometry, styles, hierarchy and dynamics are not yet decoded.", "VBA is inventoried only, never executed."]
}, indent=2))
