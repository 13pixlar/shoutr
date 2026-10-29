"""Text on either side of the caret, through AT-SPI.

The focused window's process id comes from the GNOME bridge. Only that
app's accessibility tree is walked. A GTK terminal exposes a caret. A
Firefox page often reports the document as focused and leaves the caret
at -1; the page body is not a text box. An editable field under that
document is, when the field itself has a caret. The same walk reads the
document's URI or DocURL. Only an http or https address is returned.
Cursor's vscode-file URI is not a page.

The same payload is what the helper pushes as a TextBoxInfo request.
Dictation reads that stored copy, and the app clears it when a dictation
starts, so the push has to happen again after that clear.

The text itself is never logged, and neither is the page address.
Callers log lengths and the URL scheme.
"""

import uuid
import warnings

# Sent when no focused control has a caret. Same fields the app substitutes
# if the request fails, so paste keeps the path it already has.
UNAVAILABLE = {
    "accessibilityIsFunctioning": False,
    "afterText": "",
    "beforeText": "",
    "contents": "",
    "couldNotGetTextBoxInfo": True,
    "isEditable": False,
    "selectedText": "",
}

# focusedElementHash is optional. Omit it; this snapshot is caret text,
# not an element id.
_PUSH_FIELDS = (
    "accessibilityIsFunctioning",
    "afterText",
    "beforeText",
    "contents",
    "couldNotGetTextBoxInfo",
    "isEditable",
    "selectedText",
)

_desktop = None


def signature(box):
    """Identity of a snapshot. The strings stay in memory and are not logged."""
    return tuple(box.get(key) for key in _PUSH_FIELDS)


def update_request(box):
    """Helper → Electron TextBoxInfo. Same fields as the GetTextBoxInfo reply."""
    return {
        "uuid": uuid.uuid4().hex,
        "TextBoxInfo": {"payload": {key: box[key] for key in _PUSH_FIELDS}},
    }


def http_url(value):
    """An http(s) address, or "" for anything else.

    vscode-file and file URIs name a local path. They are not the browser
    page, so they stay out of the app update.
    """
    if not isinstance(value, str):
        return ""
    text = value.strip()
    lowered = text.lower()
    if lowered.startswith("https://") or lowered.startswith("http://"):
        return text
    return ""


def url_scheme(url):
    """What the log may say about a page address. Never the address itself."""
    if not isinstance(url, str):
        return "empty"
    lowered = url.lower()
    if lowered.startswith("https://"):
        return "https"
    if lowered.startswith("http://"):
        return "http"
    return "empty"


def _page_url(node):
    """http(s) URI, or else http(s) DocURL, on this node."""
    for name in ("URI", "DocURL"):
        try:
            found = http_url(node.document_attribute(name))
        except Exception:
            found = ""
        if found:
            return found
    return ""


def _document_url(node):
    """Page address of this node or one of its ancestors. The address is not logged."""
    current = node
    for _hop in range(8):
        if current is None:
            return ""
        found = _page_url(current)
        if found:
            return found
        try:
            current = current.parent()
        except Exception:
            return ""
    return ""


def _editable_caret(root, node_limit, depth_limit):
    """Deepest editable descendant with a caret. The root itself does not count."""
    best = None

    def walk(node, depth, budget):
        nonlocal best
        if node is None or budget[0] <= 0 or depth > depth_limit:
            return
        budget[0] -= 1
        if depth > 0:
            try:
                editable = node.editable()
                caret = node.caret()
            except Exception:
                editable, caret = False, -1
            if editable and isinstance(caret, int) and caret >= 0:
                if best is None or depth >= best[0]:
                    best = (depth, node)
        count = node.child_count()
        for index in range(count):
            if budget[0] <= 0:
                return
            walk(node.child_at(index), depth + 1, budget)

    walk(root, 0, [node_limit])
    return None if best is None else best[1]


def context_from(root, node_limit=2000, depth_limit=12):
    """The caret node, if there is one, and the focused document's page URL.

    A focused caret wins. Otherwise an editable descendant of the focused
    node can supply the caret. A focused page with neither stays empty:
    its body is not a text box. The URL is still returned when it is http(s).
    """
    best = None
    focused = None

    def walk(node, depth, budget):
        nonlocal best, focused
        if node is None or budget[0] <= 0 or depth > depth_limit:
            return
        budget[0] -= 1
        try:
            is_focused = node.is_focused()
            caret = node.caret()
        except Exception:
            is_focused, caret = False, -1
        if is_focused:
            if focused is None or depth >= focused[0]:
                focused = (depth, node)
            if isinstance(caret, int) and caret >= 0:
                if best is None or depth >= best[0]:
                    best = (depth, node)
        count = node.child_count()
        for index in range(count):
            if budget[0] <= 0:
                return
            walk(node.child_at(index), depth + 1, budget)

    walk(root, 0, [node_limit])
    url = ""
    if focused is not None:
        url = _document_url(focused[1])
    if best is not None:
        return best[1], url
    if focused is not None:
        fallback = _editable_caret(focused[1], node_limit, depth_limit)
        if fallback is not None:
            return fallback, url
    return None, url


def find_focused_text(root, node_limit=2000, depth_limit=12):
    """The caret node from context_from, or None when the page has no caret."""
    node, _url = context_from(root, node_limit, depth_limit)
    return node


def textbox_from(node, margin=8000):
    """before / selected / after, clipped to `margin` characters each side.

    A terminal scrollback can be long. The slice is around the caret so the
    part the user is typing stays in the reply.
    """
    try:
        count = node.character_count()
        caret = node.caret()
    except Exception:
        return None
    if not isinstance(count, int) or not isinstance(caret, int):
        return None
    if count < 0 or caret < 0:
        return None
    if caret > count:
        caret = count
    start, end = caret, caret
    try:
        for sel_start, sel_end in node.selections():
            if isinstance(sel_start, int) and isinstance(sel_end, int) and sel_start <= caret <= sel_end:
                start, end = sel_start, sel_end
                break
    except Exception:
        start, end = caret, caret
    if start < 0:
        start = 0
    if end < start:
        end = start
    lo = max(0, start - margin)
    hi = min(count, end + margin)
    try:
        before = node.read(lo, start)
        selected = node.read(start, end) if end > start else ""
        after = node.read(end, hi)
    except Exception:
        return None
    if not isinstance(before, str) or not isinstance(selected, str) or not isinstance(after, str):
        return None
    return {
        "accessibilityIsFunctioning": True,
        "afterText": after,
        "beforeText": before,
        "contents": before + selected + after,
        "couldNotGetTextBoxInfo": False,
        "isEditable": bool(node.editable()),
        "selectedText": selected,
    }


class AtspiView:
    """The node methods find_focused_text and textbox_from call, over AT-SPI."""

    def __init__(self, node, child_limit=120):
        self._node = node
        self._child_limit = child_limit

    def is_focused(self):
        from gi.repository import Atspi

        try:
            return self._node.get_state_set().contains(Atspi.StateType.FOCUSED)
        except Exception:
            return False

    def editable(self):
        from gi.repository import Atspi

        try:
            return self._node.get_state_set().contains(Atspi.StateType.EDITABLE)
        except Exception:
            return False

    def document_attribute(self, name):
        from gi.repository import Atspi

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore", DeprecationWarning)
                value = Atspi.Document.get_document_attribute_value(self._node, name)
        except Exception:
            return ""
        return value if isinstance(value, str) else ""

    def parent(self):
        try:
            parent = self._node.get_parent()
        except Exception:
            return None
        if parent is None:
            return None
        return AtspiView(parent, self._child_limit)

    def caret(self):
        try:
            return self._node.get_caret_offset()
        except Exception:
            return -1

    def character_count(self):
        try:
            return self._node.get_character_count()
        except Exception:
            return -1

    def read(self, start, end):
        return self._node.get_text(start, end)

    def selections(self):
        try:
            count = self._node.get_n_selections()
        except Exception:
            return []
        found = []
        for index in range(count):
            try:
                span = self._node.get_selection(index)
            except Exception:
                continue
            found.append((span.start_offset, span.end_offset))
        return found

    def child_count(self):
        try:
            count = self._node.get_child_count()
        except Exception:
            return 0
        if count < 0:
            return 0
        return min(count, self._child_limit)

    def child_at(self, index):
        try:
            child = self._node.get_child_at_index(index)
        except Exception:
            return None
        if child is None:
            return None
        return AtspiView(child, self._child_limit)


def accessibility_up():
    try:
        return _atspi_desktop().get_child_count() >= 0
    except Exception:
        return False


def read_context(pid):
    """Text box and page URL for one process.

    The box is None when that process has no caret. The URL is "" when the
    focused document has no http(s) address. Either can be present alone.
    """
    if not isinstance(pid, int) or pid <= 0:
        return None, ""
    try:
        desktop = _atspi_desktop()
    except Exception:
        return None, ""
    root = None
    try:
        count = desktop.get_child_count()
    except Exception:
        return None, ""
    for index in range(count):
        try:
            app = desktop.get_child_at_index(index)
        except Exception:
            continue
        if app is None:
            continue
        try:
            if app.get_process_id() != pid:
                continue
        except Exception:
            continue
        root = AtspiView(app)
        break
    if root is None:
        return None, ""
    node, url = context_from(root)
    if node is None:
        return None, url
    box = textbox_from(node)
    if box is None:
        return None, url
    return box, url


def read_for_pid(pid):
    """Text box for one process, or None when that process has no caret."""
    box, _url = read_context(pid)
    return box


def _atspi_desktop():
    global _desktop
    import gi

    gi.require_version("Atspi", "2.0")
    from gi.repository import Atspi

    if _desktop is None:
        Atspi.init()
        _desktop = Atspi.get_desktop(0)
    return _desktop
