"""Tests for key translation and the paste session, without a keyboard.

Run from anywhere:

    python3 helper/test_pass2.py
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evdev import ecodes

import keycodes
import paste


class KeyTrackerTest(unittest.TestCase):
    def test_ctrl_and_space_use_windows_codes(self):
        tracker = keycodes.KeyTracker()
        ctrl = tracker.event(ecodes.KEY_LEFTCTRL, 1)
        self.assertEqual(ctrl, {"eventType": "key_event_press", "index": 1, "key": 162})
        # A second press from another interface of the same key is not sent.
        self.assertIsNone(tracker.event(ecodes.KEY_LEFTCTRL, 1))
        space = tracker.event(ecodes.KEY_SPACE, 1)
        self.assertEqual(space["index"], 2)
        self.assertEqual(space["key"], 32)
        self.assertEqual(tracker.stale([162, 32, 27]), [27])
        released = tracker.event(ecodes.KEY_LEFTCTRL, 0)
        self.assertEqual(released["eventType"], "key_event_release")
        self.assertEqual(released["key"], 162)
        # Repeat and a release we never saw are ignored.
        self.assertIsNone(tracker.event(ecodes.KEY_SPACE, 2))
        self.assertIsNone(tracker.event(ecodes.KEY_ESC, 0))

    def test_letters_are_not_read_as_a_range(self):
        # KEY_A and KEY_B are not neighbours in the Linux table.
        self.assertNotEqual(ecodes.KEY_B, ecodes.KEY_A + 1)
        self.assertEqual(keycodes.vk_for(ecodes.KEY_A), 65)
        self.assertEqual(keycodes.vk_for(ecodes.KEY_B), 66)
        self.assertIsNone(keycodes.vk_for(ecodes.KEY_FN))

    def test_keyboard_filter(self):
        keys = [ecodes.KEY_SPACE, ecodes.KEY_A, ecodes.KEY_LEFTCTRL, ecodes.KEY_B]
        self.assertTrue(keycodes.is_keyboard({ecodes.EV_KEY: keys}))
        self.assertFalse(keycodes.is_keyboard({ecodes.EV_KEY: [ecodes.BTN_LEFT]}))


class ClipboardSpawnTest(unittest.TestCase):
    def test_clipboard_owner_is_not_waited_on(self):
        class FakeStdin:
            def __init__(self):
                self.written = b""
                self.closed = False

            def write(self, data):
                self.written += data

            def close(self):
                self.closed = True

        class FakeProc:
            def __init__(self):
                self.stdin = FakeStdin()

        created = []

        def spawn(argv, **_kwargs):
            proc = FakeProc()
            created.append((argv, proc))
            return proc

        paste.spawn_clipboard(spawn, ["/usr/bin/xclip", "-selection", "clipboard"], {}, b"hello")
        self.assertEqual(created[0][0][0], "/usr/bin/xclip")
        self.assertEqual(created[0][1].stdin.written, b"hello")
        self.assertTrue(created[0][1].stdin.closed)


class ClipboardHoldTest(unittest.TestCase):
    def test_wait_until_the_clipboard_reads_back(self):
        seen = {"n": 0}

        class Result:
            def __init__(self, out):
                self.returncode = 0
                self.stdout = out
                self.stderr = b""

        def run(_argv, **_kwargs):
            seen["n"] += 1
            return Result(b"" if seen["n"] < 3 else b"hello")

        self.assertTrue(paste.wait_for_clipboard(run, {}, b"hello", lambda _s: None, tries=5))
        self.assertEqual(seen["n"], 3)

    def test_ctrl_and_v_are_one_key_report(self):
        from evdev import ecodes

        class FakeDevice:
            def __init__(self):
                self.events = []

            def write(self, etype, code, value):
                self.events.append((etype, code, value))

            def syn(self):
                self.events.append(("syn",))

        keyboard = paste.VirtualKeyboard()
        keyboard._ui = FakeDevice()
        keyboard.ctrl_v(lambda _s: None)
        first_syn = keyboard._ui.events.index(("syn",))
        before = keyboard._ui.events[:first_syn]
        downs = [code for etype, code, value in before if etype == ecodes.EV_KEY and value == 1]
        self.assertEqual(downs, [ecodes.KEY_LEFTCTRL, ecodes.KEY_V])

    def test_paste_leaves_the_text_and_does_not_restore(self):
        writes = []
        pressed = {"n": 0}
        original_send = paste.send_ctrl_v
        original_write = paste.write_clipboards

        def fake_send(_sleep, _log):
            pressed["n"] += 1
            return True

        def fake_write(_spawn, _env, x11, _wayland):
            writes.append(x11)

        class Result:
            def __init__(self, out=b"", code=0):
                self.returncode = code
                self.stdout = out
                self.stderr = b""

        def run(argv, **_kwargs):
            if argv[0].endswith("xclip"):
                return Result(b"hello")
            return Result()

        class Log:
            def __init__(self):
                self.lines = []

            def write(self, line):
                self.lines.append(line)

        paste.send_ctrl_v = fake_send
        paste.write_clipboards = fake_write
        try:
            log = Log()
            ok = paste.paste_text("hello", run, {}, log, sleep=lambda _s: None)
        finally:
            paste.send_ctrl_v = original_send
            paste.write_clipboards = original_write
        self.assertTrue(ok)
        self.assertEqual(writes, [b"hello"])
        self.assertEqual(pressed["n"], 1)
        self.assertNotIn("clipboard did not read back", log.lines)


class PushToTalkSwallowTest(unittest.TestCase):
    SHORTCUTS = {
        "27": "dismiss",
        "-1+162+86": "paste_last_text",
        "162+32": "ptt",
    }

    def test_only_the_push_to_talk_trigger_is_swallowed(self):
        chords = keycodes.ptt_chords(self.SHORTCUTS)
        self.assertEqual(len(chords), 1)
        modifiers, triggers = chords[0]
        self.assertEqual(modifiers, frozenset({ecodes.KEY_LEFTCTRL}))
        self.assertEqual(triggers, frozenset({ecodes.KEY_SPACE}))
        held_ctrl = {162}
        self.assertTrue(keycodes.swallows(ecodes.KEY_SPACE, held_ctrl, chords))
        self.assertFalse(keycodes.swallows(ecodes.KEY_SPACE, set(), chords))
        self.assertFalse(keycodes.swallows(ecodes.KEY_LEFTCTRL, {32}, chords))
        self.assertFalse(keycodes.swallows(ecodes.KEY_V, held_ctrl, chords))
        self.assertFalse(keycodes.swallows(ecodes.KEY_ESC, set(), chords))

    def test_space_is_not_reinjected_while_ctrl_is_held(self):
        sent = []
        forwarder = keycodes.KeyForwarder(
            keycodes.ptt_chords(self.SHORTCUTS),
            lambda code, value: sent.append((code, value)),
        )
        self.assertTrue(forwarder.handle("kbd", ecodes.KEY_LEFTCTRL, 1, set()))
        self.assertFalse(forwarder.handle("kbd", ecodes.KEY_SPACE, 1, {162}))
        self.assertFalse(forwarder.handle("kbd", ecodes.KEY_SPACE, 2, {162}))
        self.assertFalse(forwarder.handle("kbd", ecodes.KEY_SPACE, 0, {162}))
        self.assertTrue(forwarder.handle("kbd", ecodes.KEY_V, 1, {162}))
        self.assertFalse(forwarder.handle("other", ecodes.KEY_LEFTCTRL, 1, set()))
        self.assertEqual(
            sent,
            [
                (ecodes.KEY_LEFTCTRL, 1),
                (ecodes.KEY_V, 1),
            ],
        )
        forwarder.handle("kbd", ecodes.KEY_A, 1, set())
        self.assertFalse(forwarder.handle("other", ecodes.KEY_A, 1, {65}))
        self.assertTrue(forwarder.handle("kbd", ecodes.KEY_A, 2, {65}))
        self.assertFalse(forwarder.handle("other", ecodes.KEY_A, 2, {65}))
        self.assertTrue(forwarder.handle("kbd", ecodes.KEY_A, 0, {65}))
        self.assertFalse(forwarder.handle("other", ecodes.KEY_A, 0, set()))


class SessionEnvTest(unittest.TestCase):
    def test_display_and_auth_come_from_the_xwayland_command(self):
        command = ["/usr/bin/Xwayland", ":1", "-rootless", "-auth", "/run/user/5/auth"]
        env = paste.session_env([command], "/tmp/not-a-runtime", "/home/example")
        self.assertEqual(env["DISPLAY"], ":1")
        self.assertEqual(env["XAUTHORITY"], "/run/user/5/auth")
        self.assertEqual(env["HOME"], "/home/example")
        self.assertNotIn("WAYLAND_DISPLAY", env)


if __name__ == "__main__":
    unittest.main()
