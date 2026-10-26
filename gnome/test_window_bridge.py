"""The two window-bridge entry points must stay on the same D-Bus contract.

    python3 gnome/test_window_bridge.py
"""

import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import install_window_bridge

ROOT = Path(__file__).resolve().parent / "window-bridge"
LEGACY = (ROOT / "extension-42.js").read_text()
MODERN = (ROOT / "extension-45.js").read_text()
META = json.loads((ROOT / "metadata.json").read_text())


class WindowBridgeTest(unittest.TestCase):
    def test_legacy_file_is_a_script(self):
        self.assertIsNone(re.search(r"(?m)^\s*(import|export)\b", LEGACY))
        self.assertIn("function init()", LEGACY)
        self.assertIn("imports.gi", LEGACY)

    def test_modern_file_is_a_module(self):
        self.assertRegex(MODERN, r"(?m)^import Gio from 'gi://Gio';")
        self.assertIn("export default class", MODERN)
        self.assertNotIn("imports.gi", MODERN)

    def test_metadata_covers_the_break_at_45(self):
        versions = META["shell-version"]
        self.assertIn("42", versions)
        self.assertIn("45", versions)
        self.assertEqual(META["uuid"], "wispr-flow-window-bridge@wispr.flow")
        # A version field would block a same-session reload on GNOME 42.
        self.assertNotIn("version", META)

    def test_both_files_export_the_same_bus_contract(self):
        for source in (LEGACY, MODERN):
            self.assertIn("org.wispr.flow.WindowBridge", source)
            self.assertIn("/org/wispr/flow/WindowBridge", source)
            self.assertIn("GetFocusedWindow()", source)
            self.assertIn("GetWindowList()", source)
            self.assertIn("FocusChanged", source)
            self.assertIn("appId", source)
            self.assertIn("wmClass", source)

    def test_enabled_list_round_trip(self):
        raw = "@as ['color-picker@tuberry', 'wispr-flow-window-bridge@wispr.flow']"
        values = install_window_bridge.parse_enabled_list(raw)
        self.assertEqual(
            values,
            ["color-picker@tuberry", "wispr-flow-window-bridge@wispr.flow"],
        )
        self.assertEqual(install_window_bridge.parse_enabled_list("@as []"), [])
        self.assertEqual(install_window_bridge.parse_enabled_list("[]"), [])
        again = install_window_bridge.parse_enabled_list(
            install_window_bridge.format_enabled_list(values)
        )
        self.assertEqual(again, values)

    def test_enable_and_remove_do_not_duplicate_the_uuid(self):
        uuid = install_window_bridge.UUID
        added, changed = install_window_bridge.ensure_enabled(["other"], uuid)
        self.assertEqual(added, ["other", uuid])
        self.assertTrue(changed)
        again, changed = install_window_bridge.ensure_enabled(added, uuid)
        self.assertEqual(again, added)
        self.assertFalse(changed)
        removed, changed = install_window_bridge.without_enabled(again, uuid)
        self.assertEqual(removed, ["other"])
        self.assertTrue(changed)


if __name__ == "__main__":
    unittest.main()
