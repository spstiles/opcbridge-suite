"""Conversion-level regression tests using controlled decoded source records."""
import contextlib
import io
import json
import runpy
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import layer_decode


BUILDER = Path(__file__).with_name('build_static_screen.py')


def record(ident, code, bounds, **extra):
    return dict(object_id=ident, type_code=code, bounds=bounds, offset=0,
                provisional_color_a='#000000', provisional_color_b='#ffffff',
                fill_enabled_candidate=False, pen_style_candidate=0,
                line_width_candidate=1, **extra)


class BuildStaticScreenTests(unittest.TestCase):
    def test_open_arc_ignores_common_fill_flag(self):
        arc = record(1, 0x801c, [0, 0, 25, 25], arc_style_candidate='arc',
                     arc_geometry_candidate=dict(x=0, y=0, w=50, h=50, startAngle=-90, sweepAngle=-90))
        arc['fill_enabled_candidate'] = True
        obj = self.build([arc], [1])['objects'][0]
        self.assertEqual(obj['type'], 'arc')
        self.assertEqual(obj['fill'], 'none')

    def test_pie_is_not_silently_converted_to_open_arc(self):
        arc = record(1, 0x801c, [0, 0, 25, 25], arc_style_candidate='pie',
                     arc_geometry_candidate=dict(x=0, y=0, w=50, h=50, startAngle=-90, sweepAngle=-90))
        obj = self.build([arc], [1])['objects'][0]
        self.assertNotEqual(obj['type'], 'arc')
    def test_unsupported_control_is_skipped_without_configuration(self):
        control = record(1, 0xa68b, [0, 0, 100, 100],
                         embedded_control_candidate=dict(kind='trend-control', sourceReferences=['old-tag']))
        screen = self.build([control], [1])
        self.assertEqual(len(screen['objects']), 1)  # Preview notice only.
        self.assertNotIn('old-tag', json.dumps(screen))
        self.assertEqual(screen['importInfo']['skippedControls'], {'trend-control': 1})

    def test_alarm_panel_uses_native_defaults_not_hidden_filters(self):
        control = record(1, 0xa68b, [10, 20, 110, 220],
                         embedded_control_candidate=dict(kind='alarm-control', filterExpressions=['old-filter']))
        screen = self.build([control], [1])
        obj = screen['objects'][0]
        self.assertEqual(obj['type'], 'alarms-panel')
        self.assertEqual((obj['x'], obj['y'], obj['w'], obj['h']), (10, 20, 100, 200))
        self.assertNotIn('old-filter', json.dumps(screen))

    def test_embedded_screen_has_editable_native_target(self):
        control = record(1, 0xa68b, [0, 0, 100, 100],
                         embedded_control_candidate=dict(kind='screen-reference-control', screenReferences=[r'C:\Screens\Overview.gdf']))
        obj = self.build([control], [1])['objects'][0]
        self.assertEqual(obj['type'], 'viewport')
        self.assertEqual(obj['target'], 'Overview')
        self.assertEqual(obj['scaleMode'], 'contain')

    def test_canvas_and_notice_use_source_dimensions(self):
        screen = self.build([record(1, 0x800b, [0, 0, 100, 100])], [1])
        self.assertEqual((screen['width'], screen['height']), (1600, 1200))
        self.assertEqual(screen['objects'][-1]['w'], 1600)
        self.assertEqual(screen['background'], '#ff8d8d')

    def build(self, records, children, groups=None, layers=True):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'preview.screen'
            probe = dict(records=records, by_id={r['object_id']: r for r in records},
                         data=b'', end=0, display_settings=dict(width=1600, height=1200, background='#ff8d8d'))
            decoded = (99, [dict(object_id=100, name='Test', visible=True,
                                children=children)]) if layers else (None, [])
            execute = runpy.run_path
            with patch.object(sys, 'argv', [str(BUILDER), 'source.gdf', str(target)]), \
                    patch('runpy.run_path', return_value=probe), \
                    patch.object(layer_decode, 'decode', return_value=decoded), \
                    patch.object(layer_decode, 'sibling_collections', return_value=[]), \
                    patch.object(layer_decode, 'group_children',
                                 side_effect=lambda data, end, ident: (groups or {}).get(ident)), \
                    contextlib.redirect_stdout(io.StringIO()):
                if not layers:
                    with self.assertRaisesRegex(SystemExit, 'No screen was written'):
                        execute(str(BUILDER))
                    self.assertFalse(target.exists())
                    return
                execute(str(BUILDER))
            return json.loads(target.read_text())

    def test_synthesized_group_preserves_path_world_points(self):
        path = record(2, 0x8014, [100, 200, 110, 210],
                      line_points_candidate=[[100, 200], [110, 210]])
        screen = self.build([path], [1], {1: [2]})
        group = screen['objects'][0]
        child = group['children'][0]
        self.assertEqual(child['points'], [{'x': 0, 'y': 0}, {'x': 10, 'y': 10}])
        self.assertEqual((group['x'], group['y']), (100, 200))

    def test_missing_group_inside_indexed_group_is_recovered(self):
        parent = record(1, 0x800e, [50, 60, 300, 400], children_candidate=[2])
        path = record(3, 0x8014, [100, 200, 110, 210],
                      line_points_candidate=[[100, 200], [110, 210]])
        screen = self.build([parent, path], [1], {2: [3]})
        outer = screen['objects'][0]
        inner = outer['children'][0]
        point = inner['children'][0]['points'][0]
        self.assertEqual((outer['x'] + inner['x'] + point['x'],
                          outer['y'] + inner['y'] + point['y']), (100, 200))

    def test_unrecoverable_nested_child_is_reported_with_layer(self):
        parent = record(1, 0x800e, [0, 0, 10, 10], children_candidate=[2])
        screen = self.build([parent], [1])
        self.assertEqual(screen['importInfo']['unrecoveredLayerChildren'],
                         [dict(objectId=2, layerId='gdf32_layer_100')])

    def test_unknown_layer_structure_does_not_write_empty_screen(self):
        self.build([record(1, 0x800b, [0, 0, 10, 10])], [1], layers=False)
