import struct
import unittest

from path_geometry import recover_points


def path(points, gradient=False):
    chunk = bytes(20) + bytes([gradient])
    if gradient:
        chunk += b'\xff\xff\x01\0\x0d\0OGradientInfo'
        chunk += bytes.fromhex('00000002 ffffff02 01 cdcc4c3e 0000 19000000')
        chunk += struct.pack('<2f', 0, -1)
    return chunk + struct.pack('<H', len(points)) + b''.join(struct.pack('<2f', *p) for p in points)


class PathGeometryTests(unittest.TestCase):
    def test_horizontal_and_vertical_lines_keep_exact_points(self):
        for points, bounds in [([(10, 20), (30, 20)], [10, 20, 30, 21]),
                               ([(10, 20), (10, 40)], [10, 20, 11, 40])]:
            self.assertEqual(recover_points(path(points), 0, bounds), points)

    def test_gradient_header_and_direction_vector_precede_points(self):
        points = [(10, 20), (30, 20), (30, 40), (10, 20)]
        self.assertEqual(recover_points(path(points, True), 0, [10, 20, 30, 40]), points)

    def test_older_gradient_setting_is_a_word_before_direction_vector(self):
        points = [(10, 20), (30, 20), (30, 40), (10, 20)]
        data = path(points, True)
        payload = 21 + len(b'\xff\xff\x01\0\x0d\0OGradientInfo')
        data = data[:payload+17] + data[payload+19:]
        self.assertEqual(recover_points(data, 0, [10, 20, 30, 40]), points)

    def test_disabled_gradient_with_direct_rgb_still_has_path_points(self):
        points = [(10, 20), (30, 20), (30, 40), (10, 20)]
        data = bytearray(path(points, True))
        payload = 21 + len(b'\xff\xff\x01\0\x0d\0OGradientInfo')
        data[payload+7] = 0
        data[payload+8] = 0
        self.assertEqual(recover_points(data, 0, [10, 20, 30, 40]), points)

    def test_rotated_rectangle_requires_a_closed_verified_outline(self):
        points = [(10, 20), (30, 20), (30, 40), (10, 20)]
        self.assertEqual(recover_points(path(points), 0, [10, 20, 30, 40], True), points)
        self.assertIsNone(recover_points(path(points[:-1]), 0, [10, 20, 30, 40], True))

    def test_mismatched_or_truncated_points_are_rejected(self):
        data = path([(10, 20), (30, 20)])
        self.assertIsNone(recover_points(data, 0, [10, 19, 30, 20]))
        self.assertIsNone(recover_points(data[:-1], 0, [10, 20, 30, 21]))
