import unittest
from gradients import recover_gradient


class GradientTests(unittest.TestCase):
    def sample(self):
        return bytes(20) + bytes.fromhex(
            '01 0980 009f5f02 8dff8d02 01 cdcc4c3e 0101 19000000')

    def test_verified_style(self):
        self.assertEqual(recover_gradient(self.sample(), 0),
                         'linear-gradient(90deg, #009f5f 0%, #8dff8d 50%, #009f5f 100%)')

    def test_unknown_or_truncated(self):
        data = self.sample()
        for n in range(len(data)):
            self.assertIsNone(recover_gradient(data[:n], 0))
        altered = bytearray(data)
        altered[36] = 2
        self.assertIsNone(recover_gradient(altered, 0))
        altered = bytearray(data)
        altered[20] = 0
        self.assertIsNone(recover_gradient(altered, 0))

    def test_vertical_style(self):
        data = bytes(20) + bytes.fromhex(
            '01 0980 80000002 ff555502 01 cdcc4c3e 0001 19000000')
        self.assertEqual(recover_gradient(data, 0),
                         'linear-gradient(180deg, #800000 0%, #ff5555 100%)')
        for n in range(len(data)):
            self.assertIsNone(recover_gradient(data[:n], 0))

    def test_basin_vertical_styles(self):
        for color in ('ddcfb2', '717100'):
            data = bytes(20) + bytes.fromhex(
                f'01 0980 {color}02 e2e20002 01 cdcc4c3e 0000 64000000')
            self.assertEqual(recover_gradient(data, 0),
                             f'linear-gradient(180deg, #{color} 0%, #e2e200 100%)')
            altered = bytearray(data)
            altered[-4] = 25
            self.assertIsNone(recover_gradient(altered, 0))


if __name__ == '__main__':
    unittest.main()
