import copy
import unittest
from flash_sources import decode_flash, bind_flash_displays


class FlashTests(unittest.TestCase):
    def test_color_flash_preserves_visibility_and_base_colors(self):
        record = bytes(16) + bytes.fromhex('f401000000fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00000000ffffff020000000280808002010100000001')
        settings = decode_flash(record, 0)
        self.assertEqual(settings['flashRate'], 'fast')
        self.assertEqual(settings['fillColor'], '#ffffff')
        obj = dict(type='text', source=dict(objectId=1), fill='#ffff00', background='transparent', visibility=dict(tag='Keep'))
        row = dict(settings, objectId=1, dynamicId=2, supported=True, sources=['Old.Fail'])
        stats = bind_flash_displays(dict(objects=[obj]), [row])
        self.assertEqual(stats['colorBindings'], 1)
        self.assertEqual(obj['visibility'], dict(tag='Keep'))
        self.assertEqual(obj['fill'], '#ffff00')
        self.assertEqual(obj['backgroundAutomation']['onColor'], '#ffffff')
        self.assertEqual(obj['fillAutomation']['onColor'], '#000000')
        self.assertTrue(obj['fillAutomation']['flashEnabled'])
        self.assertEqual(obj['fillAutomation']['match'], '1')

    def test_verified_settings_only(self):
        record = bytes(16) + bytes.fromhex('e803000000fffeff0000fffffffffffffffffffeff00fffeff000200000000000000fffeff00000000ffe2b2020000000280808002010100010101')
        self.assertEqual(decode_flash(record, 0)['flashRate'], 'slow')
        self.assertIsNone(decode_flash(record[:-1]+b'\x00', 0))
        for end in range(len(record)):
            self.assertIsNone(decode_flash(record[:end], 0))

    def test_hidden_fallback_and_no_overwrite(self):
        obj = dict(type='text', source=dict(objectId=1))
        row = dict(objectId=1, dynamicId=2, supported=True, sources=['Old.Fail'], flashRate='slow', sourceRateMs=1000)
        screen = dict(objects=[obj])
        self.assertEqual(bind_flash_displays(screen, [row])['bindings'], 1)
        self.assertFalse(obj['visibility']['defaultVisible'])
        self.assertEqual(obj['visibility']['rules'][0]['match'], '1')
        saved = copy.deepcopy(obj['visibility'])
        self.assertEqual(bind_flash_displays(screen, [row])['reviewRequired'], 1)
        self.assertEqual(obj['visibility'], saved)
