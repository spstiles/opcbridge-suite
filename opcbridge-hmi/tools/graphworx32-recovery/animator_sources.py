"""Recover the wall display's screenshot-correlated timed Animator layout.

qbU8hbR5m6.png shows the unique 55ms Animator: source 1, Animate When True,
Invisible When Off, First Frame When Off. Only that complete settings/flag
combination is accepted; individual flag meanings are not generalized.
"""
import struct
import re
import uuid
from numeric_sources import class_payload
from visibility_sources import audit_dynamic_sources


def audit_animator_sources(data, records):
    start = class_payload(data, b'OAnimator')
    end = class_payload(data, b'OPointManager')
    if start is None or end is None or start >= end:
        return []
    declaration = b'\xff\xff\x06\x00\x08\x00ODynamic'
    first_base = start + 2
    if data[first_base:first_base + len(declaration)] == declaration:
        first_base += len(declaration)
        # Other dynamic subclasses reference the shared base class. Its
        # repeated tag follows the OFlash class reference in this archive.
        flash = class_payload(data, b'OFlash')
        if flash is None:
            return []
        base_reference = data[flash + 2:flash + 4]
    else:
        base_reference = data[start + 2:start + 4]
        first_base += 2
    if len(base_reference) != 2 or not struct.unpack('<H', base_reference)[0] & 0x8000:
        return []
    signature = data[start:start + 2] + base_reference
    def decode(blob, pos):
        base = first_base if pos == start else pos + 4
        if base + 56 > end:
            return None
        rate = struct.unpack_from('<I', data, base + 12)[0]
        return dict(frameIntervalCandidateMs=rate,
                    settingsHex=data[base + 16:base + 53].hex(),
                    flagBytesHex=data[base + 53:base + 56].hex(),
                    originalOffset=pos)
    rows = audit_dynamic_sources(data, records, b'OAnimator', decode,
                                 reference_signature=signature, first_record_base=first_base)
    for row in rows:
        known = row.get('settingsHex') == '00fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00000000' and row.get('flagBytesHex') == '010000'
        row['supported'] = row['supported'] and known and row.get('frameIntervalCandidateMs', 0) > 0
        if row['supported']:
            row.update(frameIntervalMs=row['frameIntervalCandidateMs'], animateWhenTrue=True,
                       inactiveVisible=False, inactiveFrame='fallback')
        else:
            row['reason'] = 'Unverified Animator settings or unresolved/ambiguous source.' 
    return rows


def bind_animator_displays(screen, rows, records):
    objects = {}
    def collect(items):
        for obj in items:
            objects[obj.get('source', {}).get('objectId')] = obj
            collect(obj.get('children', []))
    collect(screen.get('objects', []))
    source_records = {record['object_id']: record for record in records}
    grouped = {}
    for row in rows:
        grouped.setdefault(row['objectId'], []).append(row)
    stats = dict(bindings=0, frames=0, reviewRequired=0, absentObjects=0)
    notices = screen.setdefault('importInfo', {}).setdefault('conversionNotices', [])
    for object_id, variants in grouped.items():
        obj = objects.get(object_id)
        if obj is None:
            stats['absentObjects'] += 1
            continue
        children = obj.get('children', [])
        expected = source_records.get(object_id, {}).get('children_candidate')
        actual = [child.get('source', {}).get('objectId') for child in children]
        if (len(variants) != 1 or not variants[0]['supported'] or obj.get('type') != 'group'
                or not children or expected != actual or obj.get('animator')):
            stats['reviewRequired'] += 1
            obj.setdefault('externalReferences', []).append(dict(kind='animator', automation='animator',
                supported=False, status='unsupported', source=dict(format='graphworx32', value=str(object_id))))
            continue
        row = variants[0]
        raw = row['sources'][0].strip()
        binding = dict(status='unresolved', sourceReference=raw)
        if re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?', raw) or raw.lower() in ('true', 'false'):
            binding = dict(sourceType='expression', expression=raw.lower())
        elif re.match(r'^x\s*=', raw, re.I) or '{{' in raw:
            binding.update(sourceType='expression', expression=re.sub(r'^x\s*=\s*', '', raw, flags=re.I))
        else:
            binding.update(sourceType='tag', connection_id='', tag=raw)
        frames = []
        for child in children:
            frame_id = 'frame_' + uuid.uuid4().hex
            child['animatorFrameId'] = frame_id
            frames.append(dict(id=frame_id))
        obj['animator'] = dict(binding, enabled=True, mode='playback', frames=frames,
            frameIntervalMs=row['frameIntervalMs'], repeatCount=None,
            animateWhenTrue=row['animateWhenTrue'], inactiveVisible=row['inactiveVisible'],
            inactiveFrame=row['inactiveFrame'], stoppedFrameId=frames[0]['id'], startValue=0, stopValue=100)
        stats['bindings'] += 1
        stats['frames'] += len(frames)
    if stats['reviewRequired'] or stats['absentObjects']:
        notices.append(f"Animator recovery skipped {stats['reviewRequired'] + stats['absentObjects']} groups with unsupported settings, missing frames, or ambiguous associations.")
    return stats
