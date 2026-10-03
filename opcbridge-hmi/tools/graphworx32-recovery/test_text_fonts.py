import struct
import unittest
from text_fonts import font_candidates


class FontTests(unittest.TestCase):
    def fixture(self, face):
        prefix = struct.pack('<5i', -24, -12, 0, 0, 400) + bytes.fromhex('0000000003020122')
        face_bytes = b'\xff\xfe\xff' + bytes([len(face)]) + face.encode('utf-16le')
        text_pos = len(prefix) + len(face_bytes) + 29
        chunk = prefix + face_bytes + bytes(29) + b'\xff\xfe\xff\x04T\x00e\x00x\x00t\x00'
        return chunk, [(28, face), (text_pos, 'Text')]

    def test_unfamiliar_face_keeps_text(self):
        for face in ('', 'Arial', 'Arial Black', 'Uninstalled Custom Face'):
            self.assertEqual(font_candidates(*self.fixture(face)), [(0, 28, face)])

    def test_empty_caption_is_a_valid_text_record(self):
        chunk, strings = self.fixture('Arial')
        pos = strings[-1][0]
        chunk = chunk[:pos] + b'\xff\xfe\xff\0'
        strings[-1] = (pos, '')
        self.assertEqual(font_candidates(chunk, strings), [(0, 28, 'Arial')])

    def test_rejects_wrong_layout_and_font_metrics(self):
        chunk, strings = self.fixture('Arial Black')
        self.assertEqual(font_candidates(bytes(28)+chunk[28:], strings), [])
        strings[1] = (strings[1][0]+1, 'Text')
        self.assertEqual(font_candidates(chunk, strings), [])
