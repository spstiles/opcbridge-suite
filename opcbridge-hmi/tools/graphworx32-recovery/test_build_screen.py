import unittest
from unittest.mock import patch
import build_screen


class CombinedRecoveryTests(unittest.TestCase):
    def test_pipeline_order_and_unsupported_settings_not_persisted(self):
        child = dict(externalReferences=[dict(kind='flash', supported=False, source='secret-old-settings')])
        screen = dict(objects=[dict(type='group', children=[child]), dict(id='static_preview_warning')],
                      importInfo=dict(staticOnly=True, limitations=['No tag bindings, live data, controls or dynamic automations.']))
        calls = []
        with patch.multiple(build_screen,
                            audit_numeric_sources=lambda *args: [], audit_color_sources=lambda *args: [],
                            audit_visibility_sources=lambda *args: [], audit_flash_sources=lambda *args: [],
                            audit_animator_sources=lambda *args: [],
                            bind_animator_displays=lambda *args: calls.append('animator') or {},
                            bind_numeric_displays=lambda *args: calls.append('numeric') or 1,
                            bind_color_displays=lambda *args: calls.append('color') or {},
                            bind_visibility_displays=lambda *args: calls.append('visibility') or {},
                            bind_flash_displays=lambda *args: calls.append('flash') or {}):
            audits = build_screen.recover_bindings(screen, b'', [])
        self.assertEqual(calls, ['numeric', 'color', 'visibility', 'flash', 'animator'])
        self.assertEqual(screen['importInfo']['skippedBindings'], {'flash': 1})
        self.assertNotIn('externalReferences', child)
        self.assertNotIn('secret-old-settings', str(screen))
        self.assertEqual(set(audits), {'numeric', 'color', 'visibility', 'flash', 'animator'})
        self.assertFalse(screen['importInfo']['staticOnly'])
