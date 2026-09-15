import struct
import unittest
import zlib
from embedded_png import extract_png


def chunk(kind, data):
    return struct.pack('>I', len(data))+kind+data+struct.pack('>I', zlib.crc32(kind+data) & 0xffffffff)


class EmbeddedPngTest(unittest.TestCase):
    def setUp(self):
        self.png = (b'\x89PNG\r\n\x1a\n' +
                    chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 6, 0, 0, 0)) +
                    chunk(b'IDAT', zlib.compress(b'\x00\xff\x00\x00\xff')) + chunk(b'IEND', b''))

    def test_extract_without_record_trailer(self):
        self.assertEqual(extract_png(b'prefix'+self.png+b'trailer'), (self.png, 1, 1))

    def test_reject_truncation_and_corruption(self):
        self.assertIsNone(extract_png(self.png[:-1]))
        corrupt = bytearray(self.png)
        corrupt[20] ^= 1
        self.assertIsNone(extract_png(corrupt))
        self.assertIsNone(extract_png(b'not an image'))


if __name__ == '__main__':
    unittest.main()
