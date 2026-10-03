"""Read embedded-control diagnostics without activating OLE or executing scripts.

Storage-to-canvas associations are not decoded yet. Keep this inventory at
screen level rather than assigning a control to an object by storage order.
Do not export database connection strings, SQL, or arbitrary persisted text.
"""
import re
import struct


def associated_control(chunk, controls):
    """Resolve the persisted container-item storage number, never list order."""
    matches = []
    prefix = b'\xff\xfe\xff\x00\x00\x01\x00\x00'
    for control in controls:
        name = re.fullmatch(r'Embedding\s*(\d+)', control['storage'])
        if not name:
            continue
        marker = prefix + struct.pack('<I', int(name[1])) + b'\x01\x00\x00\x00'
        if marker in chunk:
            matches.append(control)
    return matches[0] if len(matches) == 1 else None


def unicode_strings(data):
    """Recover bounded, short-form MFC Unicode CStrings, including Unicode text."""
    result = []
    for match in re.finditer(b'\xff\xfe\xff', data):
        pos = match.end()
        if pos >= len(data):
            continue
        count = data[pos]
        if count == 255:  # Extended lengths need separate structural decoding.
            continue
        end = pos + 1 + count * 2
        if end > len(data):
            continue
        try:
            value = data[pos + 1:end].decode('utf-16le')
        except UnicodeDecodeError:
            continue
        if value and all(c.isprintable() or c in '\r\n\t' for c in value):
            result.append(value)
    return result


def inventory(ole):
    controls = []
    for entry in ole.direntries:
        if not entry or not entry.name.startswith('Embedding') or not entry.clsid:
            continue
        stream = [entry.name, 'Contents']
        if not ole.exists(stream):
            continue
        data = ole.openstream(stream).read()
        strings = unicode_strings(data)
        classes = []
        for match in re.finditer(b'\xff\xff', data):
            pos = match.end()
            if pos + 4 > len(data):
                continue
            schema, length = struct.unpack_from('<HH', data, pos)
            name = data[pos + 4:pos + 4 + length]
            if 0 < schema < 100 and 1 <= length <= 64 and re.fullmatch(rb'O[A-Za-z0-9_ ]+', name):
                classes.append(name.decode('ascii').strip())
        classes = sorted(set(classes))
        kind = 'unidentified-control'
        if {'OTWXVPenMgr', 'OTWXVVarMgr'} <= set(classes):
            kind = 'trend-control'
        elif 'ICONICS.AlarmServer.'.encode('utf-16le') in data:
            kind = 'alarm-control'
        elif 'AWXRep32' in strings:
            kind = 'alarm-report-control'
        elif any(text.lower().endswith('.gdf') for text in strings):
            kind = 'screen-reference-control'
        control = dict(storage=entry.name, clsid=entry.clsid, kind=kind,
                       serializedClasses=classes, contentsBytes=len(data),
                       objectAssociation='unresolved')
        if kind == 'trend-control':
            control['sourceReferences'] = list(dict.fromkeys(
                text for text in strings if text.startswith('\\\\') and 'ICONICS.TWXSQLSvr.' in text))
        elif kind == 'alarm-control':
            # This control persists expressions as DWORD-length UTF-16 strings,
            # not the MFC CString encoding used by the trend viewer.
            for match in re.finditer('x='.encode('utf-16le'), data):
                pos = match.start()
                if pos < 4:
                    continue
                count = struct.unpack_from('<I', data, pos - 4)[0]
                if not 2 <= count <= 16384 or pos + count * 2 > len(data):
                    continue
                try:
                    value = data[pos:pos + count * 2].decode('utf-16le')
                except UnicodeDecodeError:
                    continue
                if all(c.isprintable() or c in '\r\n\t' for c in value):
                    strings.append(value)
            control['filterExpressions'] = list(dict.fromkeys(
                text for text in strings if text.lstrip().startswith('x=') and '{{' in text))
        elif kind == 'screen-reference-control':
            control['screenReferences'] = list(dict.fromkeys(
                text for text in strings if text.lower().endswith('.gdf')))
        controls.append(control)
    return controls
