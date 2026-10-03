import struct
import unittest
from animator_sources import audit_animator_sources, bind_animator_displays


def declaration(name, schema=1):
    return b'\xff\xff' + struct.pack('<HH', schema, len(name)) + name


class AnimatorAuditTests(unittest.TestCase):
    def fixture(self):
        data = bytearray(600)
        def put(at, value):
            data[at:at + len(value)] = value
        prefix = declaration(b'OAnimator')
        start = 10 + len(prefix)
        put(10, prefix + b'\x23\xad' + declaration(b'ODynamic', 6) +
            struct.pack('<4I', 610, 800, 7854, 180) + bytes(37) + b'\x01\x00\x00')
        put(100, declaration(b'OFlash') + b'\x26\xad\x25\xad')
        put(140, b'\x23\xad\x25\xad' + struct.pack('<4I', 611, 800, 7855, 100) + bytes(37) + b'\x01\x00\x00')
        put(220, declaration(b'OPointManager'))
        put(250, declaration(b'OPoint') + b'\x77\xad' + struct.pack('<HII', 2, 610, 611) + b'\xff\xfe\xff\x01' + '1'.encode('utf-16le'))
        put(400, b'\xaa\xbb' + struct.pack('<HI', 1, 610))
        put(420, b'\xaa\xbb' + struct.pack('<HI', 1, 611))
        return bytes(data), [dict(object_id=7854, offset=400), dict(object_id=7855, offset=420)], start

    def test_first_base_declaration_and_repeated_references(self):
        data, records, start = self.fixture()
        rows = audit_animator_sources(data, records)
        self.assertEqual([row['dynamicId'] for row in rows], [610, 611])
        self.assertEqual(rows[0]['automationOffset'], start)
        self.assertEqual([row['frameIntervalCandidateMs'] for row in rows], [180, 100])
        self.assertTrue(all(row['sources'] == ['1'] for row in rows))
        self.assertTrue(all(row['flagBytesHex'] == '010000' for row in rows))
        self.assertTrue(all(row['supported'] is False for row in rows))

    def test_requires_object_back_reference(self):
        data, records, _ = self.fixture()
        data = bytearray(data)
        struct.pack_into('<I', data, 404, 999)
        self.assertEqual([row['dynamicId'] for row in audit_animator_sources(bytes(data), records)], [611])

    def test_known_wall_options_decode_and_unknown_flags_are_rejected(self):
        data, records, _ = self.fixture()
        data = bytearray(data)
        settings = bytes.fromhex('00fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00000000')
        first_base = 10 + len(declaration(b'OAnimator')) + 2 + len(declaration(b'ODynamic', 6))
        for base in (first_base, 144):
            data[base+16:base+53] = settings
        rows = audit_animator_sources(bytes(data), records)
        self.assertTrue(all(row['supported'] for row in rows))
        self.assertEqual(rows[0]['frameIntervalMs'], 180)
        self.assertFalse(rows[0]['inactiveVisible'])
        self.assertTrue(rows[0]['animateWhenTrue'])
        data[first_base+53] = 0
        self.assertFalse(audit_animator_sources(bytes(data), records)[0]['supported'])

    def test_binding_preserves_order_geometry_and_constant_activation(self):
        children = [dict(type='rect', x=12, source=dict(objectId=1)), dict(type='ellipse', x=34, source=dict(objectId=2))]
        obj = dict(type='group', source=dict(objectId=7854), children=children)
        screen = dict(objects=[obj], importInfo={})
        rows = [dict(objectId=7854, supported=True, sources=['1'], frameIntervalMs=55,
                     animateWhenTrue=True, inactiveVisible=False, inactiveFrame='fallback')]
        stats = bind_animator_displays(screen, rows, [dict(object_id=7854, children_candidate=[1, 2])])
        self.assertEqual(stats['bindings'], 1)
        self.assertEqual(stats['frames'], 2)
        self.assertEqual(obj['animator']['expression'], '1')
        self.assertNotIn('status', obj['animator'])
        self.assertEqual(obj['animator']['frameIntervalMs'], 55)
        self.assertEqual([child['x'] for child in children], [12, 34])
        self.assertEqual([child['animatorFrameId'] for child in children], [frame['id'] for frame in obj['animator']['frames']])
        self.assertTrue(all(set(frame) == {'id'} for frame in obj['animator']['frames']))

    def test_missing_or_reordered_frames_are_not_animated(self):
        for actual in ([1], [2, 1]):
            obj = dict(type='group', source=dict(objectId=7854), children=[dict(source=dict(objectId=i)) for i in actual])
            screen = dict(objects=[obj], importInfo={})
            stats = bind_animator_displays(screen, [dict(objectId=7854, supported=True)],
                                          [dict(object_id=7854, children_candidate=[1, 2])])
            self.assertEqual(stats['reviewRequired'], 1)
            self.assertNotIn('animator', obj)
            self.assertTrue(screen['importInfo']['conversionNotices'])

    def test_missing_classes_safe(self):
        self.assertEqual(audit_animator_sources(b'', []), [])


if __name__ == '__main__':
    unittest.main()
