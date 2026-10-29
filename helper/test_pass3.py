"""Focused-app replies and caret splits, without a session bus.

    python3 helper/test_pass3.py
"""

import json
import os
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import apps
import shoutr_helper
import textbox


DESKTOP = """[Desktop Entry]
Name[en_US]=Localized
Name=Firefox
Exec=firefox
"""


class FakeNode:
    def __init__(
        self,
        focused,
        text="",
        caret=-1,
        children=(),
        selections=(),
        editable=True,
        uri="",
        doc_url="",
    ):
        self._focused = focused
        self._text = text
        self._caret = caret
        self._children = list(children)
        self._selections = list(selections)
        self._editable = editable
        self._uri = uri
        self._doc_url = doc_url
        self._parent = None

    def is_focused(self):
        return self._focused

    def editable(self):
        return self._editable

    def document_attribute(self, name):
        if name == "URI":
            return self._uri
        if name == "DocURL":
            return self._doc_url
        return ""

    def parent(self):
        return self._parent

    def caret(self):
        return self._caret

    def character_count(self):
        return len(self._text)

    def read(self, start, end):
        return self._text[start:end]

    def selections(self):
        return list(self._selections)

    def child_count(self):
        return len(self._children)

    def child_at(self, index):
        child = self._children[index]
        child._parent = self
        return child


class FakeBridge:
    def __init__(self):
        self.info = {
            "appId": "firefox.desktop",
            "title": "a|b+c",
            "pid": 5,
            "wmClass": "firefox",
        }
        self.windows = [
            self.info,
            dict(self.info),
            {"appId": "slack.desktop", "title": "chat", "pid": 9, "wmClass": "slack"},
            {"appId": "", "title": "", "pid": 0, "wmClass": ""},
        ]

    def call(self, method):
        if method == "GetFocusedWindow":
            return self.info
        if method == "GetWindowList":
            return self.windows
        raise AssertionError(method)


class Names:
    def name(self, app_id):
        return {"firefox.desktop": "Firefox", "slack.desktop": "Slack"}.get(app_id, "")


class ListLog:
    def __init__(self):
        self.lines = []

    def write(self, line):
        self.lines.append(line)


def reply(request, watch):
    read_fd, write_fd = os.pipe()
    try:
        shoutr_helper.handle(
            json.dumps({"HelperAPIRequest": request}),
            write_fd,
            ListLog(),
            None,
            False,
            watch,
        )
        os.close(write_fd)
        write_fd = -1
        raw = os.read(read_fd, 1 << 20).decode()
    finally:
        if write_fd >= 0:
            os.close(write_fd)
        os.close(read_fd)
    body = shoutr_helper.unescape(raw[:-1])
    return json.loads(body)["HelperAPIResponse"]


class AccessibilitySwitchTest(unittest.TestCase):
    def test_enable_turns_it_on_only_when_it_was_off(self):
        state = {"on": False}
        calls = []

        def set_enabled(value):
            calls.append(value)
            state["on"] = value

        switch = apps.AccessibilitySwitch(lambda: state["on"], set_enabled)
        switch.enable()
        self.assertEqual(calls, [True])
        self.assertTrue(switch.turned_on)
        switch.restore()
        self.assertEqual(calls, [True, False])
        self.assertFalse(switch.turned_on)

    def test_an_existing_client_is_left_on(self):
        calls = []
        switch = apps.AccessibilitySwitch(lambda: True, calls.append)
        switch.enable()
        switch.restore()
        self.assertEqual(calls, [])
        self.assertFalse(switch.turned_on)


class DesktopNameTest(unittest.TestCase):
    def test_default_name_wins_over_a_translation(self):
        self.assertEqual(apps.parse_desktop_name(DESKTOP), "Firefox")
        self.assertEqual(apps.short_name("org.gnome.Nautilus.desktop"), "Nautilus")

    def test_describe_uses_the_desktop_name_and_keeps_the_pid(self):
        app = apps.describe(
            {"appId": "firefox.desktop", "title": "Inbox", "pid": 5, "wmClass": "firefox"},
            Names().name,
            lambda _pid: "firefox",
        )
        self.assertEqual(app["appName"], "Firefox")
        self.assertEqual(app["bundleId"], "firefox.desktop")
        self.assertEqual(app["pid"], 5)
        self.assertNotIn("pid", apps.active_fields(app))
        self.assertNotIn("windowTitle", apps.app_info_fields(app))
        own = apps.describe(
            {"appId": "window:867", "title": "Hub", "pid": 4, "wmClass": "shoutr"},
            lambda _app_id: "",
            lambda _pid: "",
        )
        self.assertEqual(own["bundleId"], "shoutr")
        self.assertEqual(own["appName"], "shoutr")

    def test_running_apps_collapse_to_one_row_per_id(self):
        rows = apps.running_apps(FakeBridge().windows, Names().name)
        self.assertEqual(
            rows,
            [
                {"bundleId": "firefox.desktop", "name": "Firefox"},
                {"bundleId": "slack.desktop", "name": "Slack"},
            ],
        )


class ReplyTest(unittest.TestCase):
    def setUp(self):
        self.watch = apps.AppWatch("/tmp", "/tmp", ListLog())
        self.watch._bridge = FakeBridge()
        self.watch._names = Names()

    def messages(self, write):
        read_fd, write_fd = os.pipe()
        try:
            write(write_fd)
        finally:
            os.close(write_fd)
            raw = os.read(read_fd, 1 << 20).decode()
            os.close(read_fd)
        return [
            json.loads(shoutr_helper.unescape(part))
            for part in raw.split("|")
            if part
        ]

    def kind(self, message):
        body = message.get("HelperAPIRequest") or message.get("HelperAPIResponse")
        name, _value = shoutr_helper.message_kind(body)
        return name

    def test_active_app_round_trip_keeps_pipe_and_plus_in_the_title(self):
        response = reply({"uuid": "u1", "GetActiveAppInfo": True}, self.watch)
        self.assertEqual(response["uuid"], "u1")
        payload = response["ActiveAppInfo"]["payload"]
        self.assertEqual(payload["appName"], "Firefox")
        self.assertEqual(payload["bundleId"], "firefox.desktop")
        self.assertEqual(payload["windowTitle"], "a|b+c")
        self.assertEqual(payload["url"], "")

    def test_app_info_omits_the_title(self):
        response = reply({"uuid": "u2", "GetAppInfo": True}, self.watch)
        payload = response["AppInfo"]["payload"]
        self.assertEqual(set(payload), {"appName", "bundleId", "url"})

    def test_focus_poll_sends_a_change_once(self):
        first = self.watch.poll()
        self.assertEqual(first["bundleId"], "firefox.desktop")
        self.assertIsNone(self.watch.poll())
        self.watch.arm()
        self.assertEqual(self.watch.poll()["windowTitle"], "a|b+c")

    def test_text_box_lengths_are_logged_and_the_text_is_not(self):
        secret = "secret-before"
        self.watch.textbox = lambda: {
            "accessibilityIsFunctioning": True,
            "afterText": "after",
            "beforeText": secret,
            "contents": secret + "after",
            "couldNotGetTextBoxInfo": False,
            "isEditable": True,
            "selectedText": "",
        }
        log = ListLog()
        read_fd, write_fd = os.pipe()
        try:
            shoutr_helper.handle(
                json.dumps({"HelperAPIRequest": {"uuid": "u3", "GetTextBoxInfo": True}}),
                write_fd,
                log,
                None,
                False,
                self.watch,
            )
        finally:
            os.close(write_fd)
            os.close(read_fd)
        self.assertIn("before=13", log.lines[0])
        self.assertNotIn(secret, log.lines[0])

    def test_dictation_start_pushes_the_same_caret_again(self):
        secret = "se|cret+before"
        box = {
            "accessibilityIsFunctioning": True,
            "afterText": "after",
            "beforeText": secret,
            "contents": secret + "after",
            "couldNotGetTextBoxInfo": False,
            "isEditable": True,
            "selectedText": "",
        }
        calls = {"n": 0}

        def reader(_app):
            calls["n"] += 1
            return dict(box)

        self.watch.textbox_for = reader
        log = ListLog()

        def publish(fd):
            shoutr_helper.publish_focus(fd, log, self.watch)

        first = self.messages(publish)
        self.assertEqual(
            [self.kind(message) for message in first],
            ["AppInfoUpdate", "TextBoxInfo"],
        )
        payload = first[1]["HelperAPIRequest"]["TextBoxInfo"]["payload"]
        self.assertEqual(payload["beforeText"], secret)
        self.assertEqual(
            set(payload),
            {
                "accessibilityIsFunctioning",
                "afterText",
                "beforeText",
                "contents",
                "couldNotGetTextBoxInfo",
                "isEditable",
                "selectedText",
            },
        )
        self.assertEqual(calls["n"], 1)

        # Same window, not dictating: the tree is not walked again.
        self.assertEqual(self.messages(publish), [])
        self.assertEqual(calls["n"], 1)
        box["beforeText"] = secret + "x"
        box["contents"] = box["beforeText"] + "after"
        self.assertEqual(self.messages(publish), [])
        self.assertEqual(calls["n"], 1)

        def start(fd):
            shoutr_helper.handle(
                json.dumps({"HelperAPIRequest": {"uuid": "d1", "DictationStart": True}}),
                fd,
                log,
                None,
                False,
                self.watch,
            )

        started = self.messages(start)
        self.assertEqual([self.kind(message) for message in started], ["TextBoxInfo", "ACK"])
        pushed = started[0]["HelperAPIRequest"]["TextBoxInfo"]["payload"]
        self.assertEqual(pushed["beforeText"], secret + "x")
        self.assertTrue(started[1]["HelperAPIResponse"]["ACK"])
        self.assertEqual(calls["n"], 2)
        self.assertIn("before=15", "\n".join(log.lines))
        self.assertNotIn(secret, "\n".join(log.lines))

        # Open dictation, text unchanged: walked, not sent again.
        self.assertEqual(self.messages(publish), [])
        self.assertEqual(calls["n"], 3)
        box["beforeText"] = "yy"
        box["contents"] = "yyafter"
        changed = self.messages(publish)
        self.assertEqual([self.kind(message) for message in changed], ["TextBoxInfo"])
        self.assertEqual(changed[0]["HelperAPIRequest"]["TextBoxInfo"]["payload"]["beforeText"], "yy")
        self.assertEqual(calls["n"], 4)

        def gone(_app):
            calls["n"] += 1
            return dict(textbox.UNAVAILABLE)

        self.watch.textbox_for = gone
        lost = self.messages(publish)
        self.assertEqual([self.kind(message) for message in lost], ["TextBoxInfo"])
        empty = lost[0]["HelperAPIRequest"]["TextBoxInfo"]["payload"]
        self.assertTrue(empty["couldNotGetTextBoxInfo"])
        self.assertFalse(empty["isEditable"])
        walked = calls["n"]
        self.assertEqual(self.messages(publish), [])
        self.assertEqual(calls["n"], walked)

        def stop(fd):
            shoutr_helper.handle(
                json.dumps({"HelperAPIRequest": {"uuid": "d2", "DictationStop": True}}),
                fd,
                log,
                None,
                False,
                self.watch,
            )

        stopped = self.messages(stop)
        self.assertEqual(self.kind(stopped[0]), "ACK")
        self.assertFalse(self.watch.dictating)

    def test_a_page_url_is_sent_and_not_logged(self):
        secret = "https://example.com/secret-page"
        calls = {"n": 0}

        def reader(app):
            calls["n"] += 1
            app["url"] = secret
            return dict(textbox.UNAVAILABLE)

        self.watch.textbox_for = reader
        log = ListLog()
        first = self.messages(lambda fd: shoutr_helper.publish_focus(fd, log, self.watch))
        self.assertEqual(
            [self.kind(message) for message in first],
            ["AppInfoUpdate", "TextBoxInfo"],
        )
        payload = first[0]["HelperAPIRequest"]["AppInfoUpdate"]["payload"]
        self.assertEqual(payload["url"], secret)
        self.assertEqual(calls["n"], 1)
        self.assertIn("url=https", "\n".join(log.lines))
        self.assertNotIn(secret, "\n".join(log.lines))

        # Same window, new address: DictationStart sends the app again.
        other = "https://example.com/other-secret"

        def later(app):
            calls["n"] += 1
            app["url"] = other
            return dict(textbox.UNAVAILABLE)

        self.watch._page_url = secret
        self.watch._page_bundle = "firefox.desktop"
        self.watch.textbox_for = later
        log.lines.clear()

        def start(fd):
            shoutr_helper.handle(
                json.dumps({"HelperAPIRequest": {"uuid": "d1", "DictationStart": True}}),
                fd,
                log,
                None,
                False,
                self.watch,
            )

        started = self.messages(start)
        self.assertEqual(
            [self.kind(message) for message in started],
            ["AppInfoUpdate", "TextBoxInfo", "ACK"],
        )
        updated = started[0]["HelperAPIRequest"]["AppInfoUpdate"]["payload"]["url"]
        self.assertEqual(updated, other)
        self.assertIn("url=https", "\n".join(log.lines))
        self.assertNotIn(secret, "\n".join(log.lines))
        self.assertNotIn(other, "\n".join(log.lines))


class TextBoxTest(unittest.TestCase):
    def test_the_deeper_focused_caret_wins(self):
        entry = FakeNode(True, "hello!", 5)
        window = FakeNode(True, "", -1, children=[entry])
        found = textbox.find_focused_text(window)
        self.assertIs(found, entry)
        payload = textbox.textbox_from(found)
        self.assertEqual(payload["beforeText"], "hello")
        self.assertEqual(payload["afterText"], "!")
        self.assertFalse(payload["couldNotGetTextBoxInfo"])
        self.assertTrue(payload["isEditable"])

    def test_a_selection_around_the_caret_is_split_out(self):
        entry = FakeNode(True, "abcdef", 4, selections=[(2, 5)])
        payload = textbox.textbox_from(entry)
        self.assertEqual(payload["beforeText"], "ab")
        self.assertEqual(payload["selectedText"], "cde")
        self.assertEqual(payload["afterText"], "f")
        self.assertEqual(payload["contents"], "abcdef")

    def test_the_slice_stays_around_the_caret(self):
        entry = FakeNode(True, "0123456789", 6)
        payload = textbox.textbox_from(entry, margin=2)
        self.assertEqual(payload["beforeText"], "45")
        self.assertEqual(payload["afterText"], "67")

    def test_no_caret_is_not_a_text_box(self):
        window = FakeNode(True, "page", -1)
        self.assertIsNone(textbox.find_focused_text(window))

    def test_an_editable_descendant_caret_is_used(self):
        entry = FakeNode(False, "hello!", 5, editable=True)
        page = FakeNode(True, "page", -1, children=[entry], editable=False)
        found = textbox.find_focused_text(page)
        self.assertIs(found, entry)
        payload = textbox.textbox_from(found)
        self.assertEqual(payload["beforeText"], "hello")
        self.assertTrue(payload["isEditable"])

    def test_a_page_without_an_editable_caret_is_not_a_text_box(self):
        static = FakeNode(False, "hello", 2, editable=False)
        page = FakeNode(True, "page", -1, children=[static], editable=False)
        self.assertIsNone(textbox.find_focused_text(page))
        node, url = textbox.context_from(page)
        self.assertIsNone(node)
        self.assertEqual(url, "")

    def test_is_editable_comes_from_the_control(self):
        entry = FakeNode(True, "ab", 1, editable=False)
        payload = textbox.textbox_from(entry)
        self.assertFalse(payload["isEditable"])
        self.assertEqual(payload["beforeText"], "a")

    def test_https_uri_is_the_page_url(self):
        page = FakeNode(True, "x", -1, editable=False, uri="https://example.com/path")
        node, url = textbox.context_from(page)
        self.assertIsNone(node)
        self.assertEqual(url, "https://example.com/path")
        self.assertEqual(textbox.url_scheme(url), "https")

    def test_doc_url_is_used_when_the_uri_is_not_http(self):
        page = FakeNode(
            True,
            "",
            -1,
            editable=False,
            uri="vscode-file://workspace/a",
            doc_url="http://example.com/z",
        )
        self.assertEqual(textbox.context_from(page)[1], "http://example.com/z")

    def test_vscode_file_and_empty_are_not_page_urls(self):
        self.assertEqual(textbox.http_url("vscode-file://workspace/a"), "")
        self.assertEqual(textbox.http_url(""), "")
        self.assertEqual(textbox.http_url("file:///tmp/a"), "")
        self.assertEqual(textbox.url_scheme("vscode-file://workspace/a"), "empty")
        page = FakeNode(True, "", -1, editable=False, uri="vscode-file://workspace/a")
        self.assertEqual(textbox.context_from(page)[1], "")

    def test_a_focused_field_uses_the_document_url(self):
        entry = FakeNode(True, "ab", 1, editable=True)
        page = FakeNode(
            False,
            "",
            -1,
            children=[entry],
            editable=False,
            doc_url="http://example.com/z",
        )
        node, url = textbox.context_from(page)
        self.assertIs(node, entry)
        self.assertEqual(url, "http://example.com/z")


if __name__ == "__main__":
    unittest.main()
