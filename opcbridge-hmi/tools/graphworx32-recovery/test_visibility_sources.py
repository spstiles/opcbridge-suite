import copy
import struct
import unittest
from test_numeric_sources import declaration
from visibility_sources import audit_visibility_sources, bind_visibility_displays


def fixture(settings=b'\x00\x00\x00'):
    data = b'\x08\x80' + struct.pack('<HI', 1, 42)
    data += declaration(b'OHide') + b'\x2a\xad\x25\xad' + struct.pack('<III', 42, 70, 100)
    data += bytes.fromhex('e803000000fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00') + settings
    data += declaration(b'OPointManager') + declaration(b'OPoint')
    data += b'\xa8\xb2' + struct.pack('<HI', 1, 42)
    data += b'\xff\xfe\xff\x07' + 'Old.Tag'.encode('utf-16le')
    return data, [dict(object_id=100, offset=0)]


class VisibilityTests(unittest.TestCase):
    def test_verified_hide_false_and_truncation(self):
        data, records = fixture()
        rows = audit_visibility_sources(data, records)
        self.assertTrue(rows[0]['supported'])
        obj = dict(type='text', text='OPEN', source=dict(objectId=100))
        stats = bind_visibility_displays(dict(objects=[obj]), rows)
        self.assertEqual(stats['bindings'], 1)
        self.assertFalse(obj['visibility']['invert'])
        self.assertEqual(obj['visibility']['mode'], 'equals')
        self.assertEqual(obj['visibility']['match'], '1')
        self.assertEqual(obj['visibility']['tag'], 'Old.Tag')
        for end in range(len(data)):
            audit_visibility_sources(data[:end], records)

    def test_unknown_flags_remain_issues(self):
        rows = audit_visibility_sources(*fixture(b'\x00\x01\x00'))
        self.assertFalse(rows[0]['supported'])
        obj = dict(source=dict(objectId=100))
        bind_visibility_displays(dict(objects=[obj]), rows)
        self.assertNotIn('visibility', obj)
        self.assertEqual(obj['externalReferences'][0]['status'], 'unsupported')

    def test_expression_and_existing_binding(self):
        rows = audit_visibility_sources(*fixture())
        rows[0]['sources'] = ['x={{Old.Tag}} || {{Other.Tag}}']
        obj = dict(type='group', children=[], source=dict(objectId=100))
        screen = dict(objects=[obj])
        bind_visibility_displays(screen, rows)
        self.assertEqual(obj['visibility']['expression'], '{{Old.Tag}} || {{Other.Tag}}')
        self.assertNotIn('tag', obj['visibility'])
        self.assertNotIn('mode', obj['visibility'])
        saved = copy.deepcopy(obj['visibility'])
        self.assertEqual(bind_visibility_displays(screen, rows)['reviewRequired'], 1)
        self.assertEqual(obj['visibility'], saved)

    def test_multiple_conditions_not_silently_combined(self):
        rows = audit_visibility_sources(*fixture())
        obj = dict(source=dict(objectId=100))
        self.assertEqual(bind_visibility_displays(dict(objects=[obj]), rows*2)['reviewRequired'], 1)
        self.assertNotIn('visibility', obj)
