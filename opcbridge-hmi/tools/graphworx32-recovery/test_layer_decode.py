import struct
import unittest

import layer_decode


def cstring(text):
    data = text.encode('utf-16le')
    return b'\xff\xfe\xff' + bytes([len(text)]) + data


def record(object_id, name, parent, children, visible, discriminator=b'\x03\x91'):
    body = b'\x0e\x80\x0e\x80\x08\x80'
    if name is not None:
        body += cstring(name)
    body += b'\x00' * 7 + b'\xff\xff\x00\x00' + layer_decode.THREE_EMPTY
    body += struct.pack('<II', layer_decode.TAIL_VERSION, parent)
    body += b'\x00' + struct.pack('<H', len(children))
    body += b''.join(struct.pack('<I', child) for child in children)
    if visible is not None:
        body += bytes([1 if visible else 0]) + discriminator
    return struct.pack('<I', object_id) + body


def rotated_record(object_id, name, parent, children, visible, radians=0.89):
    """A record whose name spacer holds a rotation float instead of zeros."""
    body = b'\x0e\x80\x0e\x80\x08\x80'
    if name is not None:
        body += cstring(name)
    spacer = b'\x00\x00' + struct.pack('<f', radians) + b'\x00'
    body += spacer + b'\xff\xff\x00\x00' + layer_decode.THREE_EMPTY
    body += struct.pack('<II', layer_decode.TAIL_VERSION, parent)
    body += b'\x00' + struct.pack('<H', len(children))
    body += b''.join(struct.pack('<I', child) for child in children)
    if visible is not None:
        body += bytes([1 if visible else 0]) + b'\x03\x91'
    return struct.pack('<I', object_id) + body


def display(children):
    """A layer collection plus one object per layer, in a bare stream."""
    body = b''
    body += record(1, None, 0, [221], None)
    body += record(221, None, 1, [layer[0] for layer in children], None)
    for layer_id, name, kids, visible in children:
        body += record(layer_id, name, 221, kids, visible)
    return body, len(body)


def decode_stream(body, end):
    return layer_decode.decode(body, end)


class LayerDecodeTests(unittest.TestCase):
    def test_reads_names_visibility_and_declared_order(self):
        stream = [
            (223, 'Background', [11], False),
            (248, 'GRAPHICS', [21, 22, 23], True),
            (18925, 'CallBobNow', [31], False),
        ]
        body, end = display(stream)
        collection, decoded = decode_stream(body, end)
        self.assertEqual(collection, 221)
        self.assertEqual([layer['object_id'] for layer in decoded], [223, 248, 18925])
        self.assertEqual([layer['name'] for layer in decoded],
                         ['Background', 'GRAPHICS', 'CallBobNow'])
        self.assertEqual([layer['visible'] for layer in decoded], [False, True, False])
        self.assertEqual([len(layer['children']) for layer in decoded], [1, 3, 1])

    def test_order_comes_from_the_collection_not_file_order(self):
        body, end = display([
            (248, 'GRAPHICS', [21], True),
            (223, 'Background', [11], False),
        ])
        collection, decoded = decode_stream(body, end)
        self.assertEqual(collection, 221)
        self.assertEqual([layer['name'] for layer in decoded], ['GRAPHICS', 'Background'])

    def test_accepts_the_olayerinfo_visibility_variant(self):
        body, end = display([(18865, 'PlantOpsSwitch', [6], False)])
        body += b'\x01\x00\x0a\x00' + b'OLayerInfo\x00\x00'
        collection, decoded = decode_stream(body, len(body))
        self.assertEqual(collection, 221)
        self.assertEqual(decoded[0]['name'], 'PlantOpsSwitch')
        self.assertFalse(decoded[0]['visible'])

    def test_rejects_a_name_that_does_not_end_at_the_spacer(self):
        body, end = display([])
        # A CString whose length byte does not make it end at the spacer must
        # not be read as a name.
        bogus = struct.pack('<I', 900) + b'\x0e\x80\x0e\x80\x08\x80'
        bogus += cstring('no') + b'\x01\x00' + b'\x00' * 5
        bogus += b'\xff\xff\x00\x00' + layer_decode.THREE_EMPTY
        bogus += struct.pack('<II', layer_decode.TAIL_VERSION, 221)
        bogus += b'\x00' + struct.pack('<H', 1) + struct.pack('<I', 900)
        bogus += b'\x00' + b'\x03\x91'
        collection, decoded = decode_stream(body + bogus, end + len(bogus))
        self.assertEqual(decoded, [])

    def test_named_group_without_visibility_is_not_a_layer(self):
        body, end = display([(248, 'GRAPHICS', [21], True)])
        # Append a named group whose tail is followed by unrelated bytes.
        extra = record(950, 'NotALayer', 221, [21], None) + b'\x00\x00\x00\x00\x00'
        collection, decoded = decode_stream(body + extra, end + len(extra))
        self.assertEqual([layer['name'] for layer in decoded], ['GRAPHICS'])

    def test_truncation_never_raises(self):
        body, end = display([
            (223, 'Background', [11], False),
            (248, 'GRAPHICS', [21, 22], True),
        ])
        for cut in range(len(body) + 1):
            collection, decoded = decode_stream(body[:cut], end)
            self.assertIn(collection, (None, 221))
            for layer in decoded:
                self.assertIn(layer['name'], ('Background', 'GRAPHICS'))

    def test_empty_and_unnamed_streams_report_no_layers(self):
        self.assertEqual(decode_stream(b'', 0), (None, []))
        body, end = display([])
        self.assertEqual(decode_stream(body, end), (None, []))

    def test_group_children_reaches_a_group_without_geometry(self):
        body, end = display([(248, 'GRAPHICS', [21, 22], True)])
        self.assertEqual(layer_decode.group_children(body, end, 248), [21, 22])
        # A leaf has no tail to read.
        self.assertIsNone(layer_decode.group_children(body, end, 21))
        self.assertIsNone(layer_decode.group_children(body, end, 4242))

    def test_sibling_collections_exclude_the_layer_collection(self):
        body, end = display([(248, 'GRAPHICS', [21], True)])
        collection, decoded = decode_stream(body, end)
        self.assertEqual(collection, 221)
        # Record 1 owns the layer collection and the background collection.
        self.assertEqual(layer_decode.sibling_collections(body, end, collection), [])

    def test_sibling_collections_report_the_background_collection(self):
        body, end = display([(248, 'GRAPHICS', [21], True)])
        # A display that also owns a background collection beside its layers.
        body = record(1, None, 0, [221, 18788], None) + body[12:]
        collection, decoded = decode_stream(body, len(body))
        self.assertEqual(collection, 221)
        self.assertEqual(layer_decode.sibling_collections(body, len(body), collection), [18788])

    def test_record_index_is_reused_without_leaking_between_streams(self):
        first, end = display([(248, 'GRAPHICS', [21], True)])
        second, end2 = display([(248, 'OTHER', [22, 23], False)])
        # Alternating calls must not serve one stream's records for the other,
        # even when the caller keeps a reference to a previously returned list.
        self.assertEqual(layer_decode.group_children(first, end, 248), [21])
        self.assertEqual(layer_decode.group_children(second, end2, 248), [22, 23])
        self.assertEqual(layer_decode.group_children(first, end, 248), [21])

    def test_a_different_end_reindexes_rather_than_reusing(self):
        body, end = display([(248, 'GRAPHICS', [21, 22], True)])
        full = layer_decode.build_records(body, end)
        # Cut just before the last record's prefix, so that record drops out.
        cut = body.rfind(b'\x0e\x80\x0e\x80\x08\x80') - 4
        self.assertEqual(len(layer_decode.build_records(body, cut)), len(full) - 1)
        # Returning to the original end must rebuild the full index.
        self.assertEqual(layer_decode.build_records(body, end), full)

    def test_oversized_child_count_is_rejected(self):
        body, end = display([])
        bogus = struct.pack('<I', 800) + b'\x0e\x80\x0e\x80\x08\x80'
        bogus += layer_decode.THREE_EMPTY + struct.pack('<II', layer_decode.TAIL_VERSION, 221)
        bogus += b'\x00' + struct.pack('<H', 60000) + b'\x00' * 4
        collection, decoded = decode_stream(body + bogus, end + len(bogus))
        self.assertEqual(collection, None)
        self.assertEqual(decoded, [])

    def test_reads_a_rotated_group_whose_spacer_holds_a_float(self):
        body = rotated_record(1075, None, 248, [10, 11, 12], None)
        tail = layer_decode.read_group_tail(body[4:])
        self.assertIsNotNone(tail)
        self.assertEqual(tail['parent'], 248)
        self.assertEqual(tail['children'], [10, 11, 12])

    def test_a_rotated_named_record_can_still_be_a_layer(self):
        body = rotated_record(248, 'GRAPHICS', 221, [7], True)
        tail = layer_decode.read_group_tail(body[4:])
        self.assertIsNotNone(tail)
        self.assertEqual(tail['name'], 'GRAPHICS')

    def test_rotation_only_counts_with_the_exact_spacer_shape(self):
        # Same float, but the leading/trailing zero bytes are wrong, so the
        # rotated layout must not be accepted on a shape guess alone.
        body = b'\x0e\x80\x0e\x80\x08\x80'
        body += b'\x00\x01' + struct.pack('<f', 0.89) + b'\x00'
        body += b'\xff\xff\x00\x00' + layer_decode.THREE_EMPTY
        body += struct.pack('<II', layer_decode.TAIL_VERSION, 248)
        body += b'\x00' + struct.pack('<H', 0)
        self.assertIsNone(layer_decode.read_group_tail(body))


class CStringTests(unittest.TestCase):
    def test_reads_named_and_empty_strings(self):
        buf = cstring('GRAPHICS') + layer_decode.THREE_EMPTY
        text, pos = layer_decode.read_cstring(buf, 0)
        self.assertEqual(text, 'GRAPHICS')
        # read_cstring consumes one string, so the triple must be walked 3x.
        for _ in range(3):
            text, pos = layer_decode.read_cstring(buf, pos)
            self.assertEqual(text, '')
        self.assertEqual(pos, len(buf))

    def test_rejects_a_bad_marker(self):
        self.assertEqual(layer_decode.read_cstring(b'\x00\x00\x00', 0), (None, 0))

    def test_rejects_a_truncated_string(self):
        buf = cstring('GRAPHICS')[:-4]
        self.assertEqual(layer_decode.read_cstring(buf, 0)[0], None)


if __name__ == '__main__':
    unittest.main()
