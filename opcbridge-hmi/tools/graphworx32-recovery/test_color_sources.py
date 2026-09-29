import copy
import struct
import unittest
from color_sources import audit_color_sources, bind_color_displays
from test_numeric_sources import declaration


def fixture(repeated=False, shadow=False):
    data = b'\x08\x80' + struct.pack('<HI', 1, 42) + declaration(b'OColorDynInfo')
    record = b'\x3e\xad\x25\xad' + struct.pack('<III', 42, 70, 100)
    record += bytes.fromhex('fffeff000200000000000000fffeff00')
    record += bytes.fromhex('00000000ff000200000002808080020101') + bytes([shadow, 1])
    data += record * (2 if repeated else 1)
    data += declaration(b'OPointManager') + declaration(b'OPoint')
    data += b'\xa8\xb2' + struct.pack('<HI', 1, 42)
    data += b'\xff\xfe\xff\x07' + 'Old.Tag'.encode('utf-16le')
    return data, [dict(object_id=100, offset=0)]


class ColorTests(unittest.TestCase):
    def test_multi_source_point_ids_and_rule_order(self):
        data, records = fixture()
        split = data.index(declaration(b'OPointManager'))
        first = data[:split]
        record_start = first.index(b'\x3e\xad\x25\xad')
        second = bytearray(first[record_start:])
        struct.pack_into('<I', second, 8, 71)
        second[-16:-12] = bytes.fromhex('ff7f0002')
        data = first + b'\x3e\xad' + second
        data += declaration(b'OPointManager') + declaration(b'OPoint')
        data += b'\xa8\xb2\x00\x00'
        # Reverse the point serialization order: mapping must use IDs,
        # not alphabetical order or source collection order.
        for pid, source in ((71, 'A.Reverse'), (70, 'Z.Forward')):
            data += struct.pack('<I', pid) + b'\xa8\xb2\xa8\xb2' + struct.pack('<HI', 1, 42)
            data += b'\xff\xfe\xff' + bytes([len(source)]) + source.encode('utf-16le')
            data += struct.pack('<HI', 5, pid)
        row = audit_color_sources(data, records)[0]
        self.assertTrue(row['supported'])
        self.assertEqual([r['sources'][0] for r in row['rules']], ['Z.Forward', 'A.Reverse'])
        obj = dict(type='rect', source=dict(objectId=100), fill='#ffffff', stroke='#222222')
        bind_color_displays(dict(objects=[obj]), [row])
        self.assertEqual([r['onColor'] for r in obj['fillAutomation']['rules']], ['#00ff00', '#ff7f00'])
        self.assertEqual(len(obj['colorAutomationRules']), 2)
        self.assertEqual(obj['fill'], '#ffffff')

    def test_decode_and_truncation(self):
        data, records = fixture()
        row = audit_color_sources(data, records)[0]
        self.assertTrue(row['supported'])
        self.assertEqual(row['fillColor'], '#00ff00')
        self.assertEqual(row['lineColor'], '#000000')
        self.assertFalse(row['invert'])
        for end in range(len(data)):
            audit_color_sources(data[:end], records)

    def test_unverified_variants_are_not_guessed(self):
        for args in (dict(repeated=True), dict(shadow=True)):
            self.assertFalse(audit_color_sources(*fixture(**args))[0]['supported'])

    def test_text_targets_and_expression(self):
        row = audit_color_sources(*fixture())[0]
        row['sources'] = ['x={{Old.Tag}}>0']
        obj = dict(type='text', source=dict(objectId=100), fill='#777777', background='#ffffff')
        bind_color_displays(dict(objects=[obj]), [row])
        self.assertEqual(obj['fillAutomation']['onColor'], '#000000')
        self.assertEqual(obj['backgroundAutomation']['onColor'], '#00ff00')
        self.assertEqual(obj['fillAutomation']['expression'], '{{Old.Tag}}>0')
        self.assertEqual(obj['fill'], '#777777')

    def test_group_and_conflict_are_atomic(self):
        row = audit_color_sources(*fixture())[0]
        child = dict(type='rect', source=dict(objectId=101), fill='#ffffff', stroke='#222222')
        group = dict(type='group', source=dict(objectId=100), children=[child])
        screen = dict(objects=[group])
        self.assertEqual(bind_color_displays(screen, [row])['objectBindings'], 1)
        original = copy.deepcopy(child)
        self.assertEqual(bind_color_displays(screen, [row])['reviewRequired'], 1)
        self.assertEqual(child, original)
        self.assertNotIn('fillAutomation', group)


if __name__ == '__main__':
    unittest.main()
