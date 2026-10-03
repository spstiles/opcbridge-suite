import struct
import unittest
from display_settings import dimensions


def fixture(width, height, flags=b'\0\0', schema=26):
    settings = bytearray(57)
    struct.pack_into('<II', settings, 0, width, height)
    settings[8:10] = flags
    struct.pack_into('<I', settings, 10, 50)  # Zoom is not a dimension.
    struct.pack_into('<I', settings, 14, 1)
    for offset in (18, 28, 32, 36, 41, 45, 49):
        settings[offset] = 2
    settings[51:57] = b'\xff\xfe\xff\x01*\0'
    style = bytearray(36 if schema == 18 else 38)
    style[:4] = b'\xff\x8d\x8d\x02'
    return b'\xff\xff' + struct.pack('<H', schema) + b'\x08\x00ODisplay' + b'\xff\xff\x01\x00\x05\x00OGrid' + bytes(style) + bytes(settings)


class DisplaySettingsTests(unittest.TestCase):
    def test_dimensions_do_not_depend_on_geometry_or_zoom(self):
        result = dimensions(fixture(7680, 3600))
        self.assertEqual((result['width'], result['height']), (7680, 3600))
        self.assertEqual(result['background'], '#ff8d8d')
        self.assertEqual(dimensions(fixture(1280, 1024, schema=18))['background'], '#ff8d8d')
        result = dimensions(fixture(1282, 1024, b'\1\1'))
        self.assertEqual((result['width'], result['height']), (1282, 1024))

    def test_missing_truncated_invalid_or_ambiguous_settings_fail(self):
        valid = fixture(1600, 1200)
        for data in (b'', valid[:-1], fixture(0, 1200), valid + valid[11:], valid + valid):
            with self.assertRaises(ValueError):
                dimensions(data)
