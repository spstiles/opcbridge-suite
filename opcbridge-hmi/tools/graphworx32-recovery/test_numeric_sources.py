import struct
import unittest

from numeric_sources import audit_numeric_sources, bind_numeric_displays


def declaration(name):
    return b'\xff\xff\x01\x00' + struct.pack('<H', len(name)) + name


def fixture(link=42, duplicate_source=False):
    visible = b'\x08\x80' + struct.pack('<HI', 1, link)
    data = visible + declaration(b'OAlnum') + b'\x2d\xad\x25\xad'
    data += struct.pack('<III', 42, 70, 100)
    data += declaration(b'OPointManager') + declaration(b'OPoint')
    for source in (['Plant.Flow', 'Other.Flow'] if duplicate_source else ['Plant.Flow']):
        data += b'\xa8\xb2' + struct.pack('<HI', 1, 42)
        data += b'\xff\xfe\xff' + bytes([len(source)]) + source.encode('utf-16le')
    return data, [dict(object_id=100, offset=0, text='????? gpm')]


class NumericSourceTests(unittest.TestCase):
    def test_binding_preserves_units_and_original_reference(self):
        obj = dict(type='text', text='????? gpm', source=dict(objectId=100))
        row = dict(objectId=100, dynamicId=42, sourceReference='Old.Flow',
                   formattingCandidate=dict(digits=4, decimals=1, padZeros=False, multiplier=1))
        screen = dict(objects=[dict(type='group', children=[obj])])
        self.assertEqual(bind_numeric_displays(screen, [row]), 1)
        self.assertEqual(obj['text'], '{1} gpm')
        self.assertEqual(obj['textBindings']['1']['tag'], 'Old.Flow')
        self.assertEqual(obj['textBindings']['1']['status'], 'unresolved')
        self.assertNotIn('action', obj)
        self.assertEqual(bind_numeric_displays(screen, [row]), 0)

    def test_expression_is_not_put_in_tag_field(self):
        obj = dict(type='text', text='?????', source=dict(objectId=100))
        row = dict(objectId=100, dynamicId=42, sourceReference='x={{Old.Flow}}/1000',
                   formattingCandidate=dict(digits=4, decimals=1))
        self.assertEqual(bind_numeric_displays(dict(objects=[obj]), [row]), 1)
        binding = obj['textBindings']['1']
        self.assertEqual(binding['expression'], '{{Old.Flow}}/1000')
        self.assertEqual(binding['sourceReference'], 'x={{Old.Flow}}/1000')
        self.assertNotIn('tag', binding)

    def test_reciprocal_link_preserves_source_and_display_text(self):
        rows = audit_numeric_sources(*fixture())
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['sourceReference'], 'Plant.Flow')
        self.assertEqual(rows[0]['text'], '????? gpm')
        self.assertFalse(rows[0]['formattingDecoded'])

    def test_unlinked_or_ambiguous_sources_are_not_guessed(self):
        self.assertEqual(audit_numeric_sources(*fixture(link=43)), [])
        self.assertEqual(audit_numeric_sources(*fixture(duplicate_source=True)), [])

    def test_truncated_archive_is_safe(self):
        data, records = fixture()
        for end in range(len(data)):
            audit_numeric_sources(data[:end], records)


if __name__ == '__main__':
    unittest.main()
