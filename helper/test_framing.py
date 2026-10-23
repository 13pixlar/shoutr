"""Tests for the helper's framing, and one end-to-end reply check.

Run from anywhere:

    python3 helper/test_framing.py
"""

import json
import os
import pwd
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import shoutr_helper


HELPER = Path(__file__).resolve().parent / "shoutr_helper.py"


class FramingTest(unittest.TestCase):
    def test_round_trip_keeps_plus_pipe_and_newline(self):
        text = 'a+2|b and a newline\n'
        wire = shoutr_helper.encode(text)
        self.assertTrue(wire.endswith("|"))
        self.assertNotIn("|", wire[:-1])
        self.assertEqual(shoutr_helper.unescape(wire[:-1]), text)

    def test_unescape_order(self):
        # "+2" in the original is the characters plus and 2, not a pipe.
        self.assertEqual(shoutr_helper.unescape("+12"), "+2")
        self.assertEqual(shoutr_helper.unescape("+2"), "|")
        self.assertEqual(shoutr_helper.unescape("+1"), "+")

    def test_message_split_across_reads(self):
        framer = shoutr_helper.Framer()
        self.assertEqual(framer.feed(b'{"a":1'), [])
        self.assertEqual(framer.feed("}|next".encode()), ['{"a":1}'])
        self.assertEqual(framer.feed(b"|"), ["next"])

    def test_delimiter_split_mid_escape(self):
        framer = shoutr_helper.Framer()
        # The escape for "|" is "+2", delivered one byte at a time, then the delimiter.
        wire = shoutr_helper.encode("x|y").encode()
        got = []
        for byte in wire:
            got.extend(framer.feed(bytes([byte])))
        self.assertEqual(got, ["x|y"])

    def test_utf8_split_across_reads(self):
        framer = shoutr_helper.Framer()
        text = "café|"
        raw = text.encode()
        split = text.index("é") + 1  # one byte into the two-byte character
        self.assertEqual(framer.feed(raw[:split]), [])
        self.assertEqual(framer.feed(raw[split:]), ["café"])


class ReplyTest(unittest.TestCase):
    def test_ready_and_unhandled_over_fd3(self):
        # The child must inherit fd 3. Python closes every fd above 2 unless
        # it is listed in pass_fds, and that happens after a preexec dup, so
        # the write end is moved onto fd 3 here and passed through.
        read_fd, write_fd = os.pipe()
        saved = None
        try:
            os.fstat(3)
            saved = os.dup(3)
        except OSError:
            pass
        os.dup2(write_fd, 3)
        os.close(write_fd)

        log_path = Path(shoutr_helper.state_log_path())
        before = log_path.stat().st_size if log_path.exists() else 0
        env = os.environ.copy()
        # The child is the real helper. These keep the test from reading the
        # keyboard and from pasting the sample text into the focused window.
        env["SHOUTR_DISABLE_KEYS"] = "1"
        env["SHOUTR_DISABLE_PASTE"] = "1"
        try:
            proc = subprocess.Popen(
                [str(HELPER)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                pass_fds=(3,),
                env=env,
            )
        finally:
            os.close(3)
            if saved is not None:
                os.dup2(saved, 3)
                os.close(saved)

        ready = {"HelperAPIRequest": {"uuid": "u1", "sentryTrace": "trace", "IsReady": True}}
        stale = {
            "HelperAPIRequest": {
                "uuid": "u2",
                "CheckStaleKeys": {"payload": {"keycodes": [162, 32]}},
            }
        }
        paste = {
            "HelperAPIRequest": {
                "uuid": "u3",
                "PasteText": {"payload": {"pasteId": "p", "text": "secret words"}},
            }
        }
        blob = (
            shoutr_helper.encode(json.dumps(ready))
            + shoutr_helper.encode(json.dumps(stale))
            + shoutr_helper.encode(json.dumps(paste))
        ).encode()
        stdout, stderr = proc.communicate(blob, timeout=5)

        chunks = []
        while True:
            piece = os.read(read_fd, 65536)
            if not piece:
                break
            chunks.append(piece)
        os.close(read_fd)
        self.assertEqual(proc.returncode, 0, stderr)
        self.assertEqual(stdout, b"")
        self.assertEqual(stderr, b"")

        messages = [json.loads(shoutr_helper.unescape(part)) for part in b"".join(chunks).decode().split("|") if part]
        self.assertEqual(len(messages), 3)

        first = messages[0]["HelperAPIResponse"]
        self.assertEqual(list(first)[:2], ["uuid", "ACK"])
        self.assertEqual(first["uuid"], "u1")
        self.assertIs(first["ACK"], True)
        self.assertIsInstance(first["HelperLaunchTiming"]["helperMainEntryMs"], int)

        stale_body = messages[1]["HelperAPIResponse"]
        self.assertEqual(stale_body["uuid"], "u2")
        self.assertEqual(stale_body["StaleKeysResponse"]["payload"]["staleKeys"], [162, 32])

        pasted = messages[2]["HelperAPIResponse"]
        self.assertEqual(pasted["uuid"], "u3")
        self.assertIs(pasted["ACK"], True)

        added = log_path.read_text(encoding="utf-8")[before:]
        self.assertIn("PasteText pasteId=p chars=12 (paste disabled)", added)
        self.assertNotIn("secret words", added)
        # The helper must not have followed HOME. The log is under the passwd home.
        self.assertEqual(log_path, Path(pwd.getpwuid(os.getuid()).pw_dir) / ".local/state/Wispr Flow/logs/helper.log")


if __name__ == "__main__":
    unittest.main()
