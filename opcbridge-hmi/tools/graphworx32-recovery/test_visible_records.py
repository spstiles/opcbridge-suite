import struct
import unittest

from visible_records import archive_headers


def declaration(name, schema=1):
    name = name.encode('ascii')
    return b'\xff\xff' + struct.pack('<HH', schema, len(name)) + name


def ref(index):
    return struct.pack('<H', 0x8000 | index)


def body(ident):
    return b'\0\0' + struct.pack('<4f', 10, 20, 30, 40)*2 + struct.pack('<H', ident)


def prefix(count):
    return declaration('ODisplay', 18) + declaration('ObjectManager') + struct.pack('<H', count)


def first_rectangle():
    # Class 3, registered object 4, base class 5.
    return struct.pack('<H', 1) + declaration('ORectangle', 2) + ref(3) + declaration('OVisible', 3) + body(1)


class VisibleHeaderTests(unittest.TestCase):
    def test_embedded_class_definition_resolves_later_line_instances(self):
        data = prefix(3) + first_rectangle()
        # Class 6 is an embedded member with no outer object ID or self reference.
        data += declaration('OLine') + ref(5) + body(999)
        data += struct.pack('<H', 2) + ref(6) + ref(6) + ref(5) + body(2)
        data += struct.pack('<H', 3) + declaration('OSymbol', 3) + ref(8) + ref(5) + body(3)
        headers = archive_headers(data, len(data))
        self.assertEqual([h[2] for h in headers], [0x800b, 0x8014, 0x800e])
        self.assertEqual([struct.unpack_from('<H', data, h[1]+34)[0] for h in headers], [1, 2, 3])

    def test_button_inheritance_recovers_text_first_declared_as_a_base(self):
        data = prefix(3) + first_rectangle()
        data += struct.pack('<H', 2) + declaration('OButton') + ref(6) + declaration('OText', 2) + ref(5) + body(2)
        data += struct.pack('<H', 3) + declaration('OSymbol', 3) + ref(9) + ref(5) + body(3)
        self.assertEqual([h[2] for h in archive_headers(data, len(data))],
                         [0x800b, 0x801e, 0x800e])

    def test_incomplete_object_count_does_not_guess_missing_class_reference(self):
        data = prefix(4) + first_rectangle()
        data += declaration('OLine') + ref(5) + body(999)
        data += struct.pack('<H', 2) + ref(6) + ref(6) + ref(5) + body(2)
        data += struct.pack('<H', 3) + declaration('OSymbol', 3) + ref(8) + ref(5) + body(3)
        self.assertEqual([h[2] for h in archive_headers(data, len(data))], [0x800b, 0x800e])

    def test_truncated_archive_does_not_raise(self):
        data = prefix(2) + first_rectangle()
        data += struct.pack('<H', 2) + declaration('OSymbol', 3) + ref(6) + ref(5) + body(2)
        for end in range(len(data)):
            archive_headers(data, end)
