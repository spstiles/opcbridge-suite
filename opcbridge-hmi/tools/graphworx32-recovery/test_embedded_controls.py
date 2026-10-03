import unittest
from types import SimpleNamespace
from io import BytesIO
from embedded_controls import inventory, unicode_strings, associated_control


def string(value):
    return b'\xff\xfe\xff' + bytes([len(value)]) + value.encode('utf-16le')


class EmbeddedControlTests(unittest.TestCase):
    def test_association_uses_storage_number_and_rejects_ambiguity(self):
        marker = b'\xff\xfe\xff\x00\x00\x01\x00\x00\x1e\x00\x00\x00\x01\x00\x00\x00'
        control = dict(storage='Embedding 30')
        self.assertIs(associated_control(marker, [dict(storage='Embedding 8'), control]), control)
        self.assertIsNone(associated_control(marker, [control, control.copy()]))

    def test_unicode_and_truncated_strings(self):
        self.assertEqual(unicode_strings(string('Débit') + b'\xff\xfe\xff\x08a'), ['Débit'])

    def test_trend_inventory_is_not_assigned_by_storage_order(self):
        def cls(name):
            return b'\xff\xff\x01\x00' + len(name).to_bytes(2, 'little') + name.encode()
        reference = r'\\SERVER\ICONICS.TWXSQLSvr.1\Flow'
        data = cls('OTWXVPenMgr') + cls('OTWXVVarMgr') + string(reference) * 2
        ole = SimpleNamespace(direntries=[SimpleNamespace(name='Embedding 9', clsid='test')],
                              exists=lambda path: True, openstream=lambda path: BytesIO(data))
        control = inventory(ole)[0]
        self.assertEqual(control['kind'], 'trend-control')
        self.assertEqual(control['sourceReferences'], [reference])
        self.assertEqual(control['objectAssociation'], 'unresolved')

    def test_database_strings_are_not_exported(self):
        data = string('AWXRep32') + string('Provider=SQL;Password=secret')
        ole = SimpleNamespace(direntries=[SimpleNamespace(name='Embedding 1', clsid='test')],
                              exists=lambda path: True, openstream=lambda path: BytesIO(data))
        control = inventory(ole)[0]
        self.assertEqual(control['kind'], 'alarm-report-control')
        self.assertNotIn('secret', str(control))


if __name__ == '__main__':
    unittest.main()
