"""Text on either side of the caret, through AT-SPI.

The focused window's process id comes from the GNOME bridge. Only that
app's accessibility tree is walked, and only until a focused control with
a caret is found. A GTK terminal does that. A Firefox page often reports
the document as focused and leaves the caret at -1, and then this returns
the same empty result the app already uses when the helper has no answer.

The same payload is what the helper pushes as a TextBoxInfo request.
Dictation reads that stored copy, and the app clears it when a dictation
starts, so the push has to happen again after that clear.

The text itself is never logged. Callers log lengths.
"""

import uuid

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


def find_focused_text(root, node_limit=2000, depth_limit=12):
    """The deepest focused node whose caret() is zero or more."""
    best = None

    def walk(node, depth, budget):
        nonlocal best
        if node is None or budget[0] <= 0 or depth > depth_limit:
            return
        budget[0] -= 1
        caret = node.caret()
        if node.is_focused() and isinstance(caret, int) and caret >= 0:
            if best is None or depth >= best[0]:
                best = (depth, node)
        count = node.child_count()
        for index in range(count):
            if budget[0] <= 0:
                return
            walk(node.child_at(index), depth + 1, budget)

    walk(root, 0, [node_limit])
    return None if best is None else best[1]


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
        "isEditable": True,
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


def read_for_pid(pid):
    """Text box for one process, or None when that process has no caret."""
    if not isinstance(pid, int) or pid <= 0:
        return None
    try:
        desktop = _atspi_desktop()
    except Exception:
        return None
    root = None
    try:
        count = desktop.get_child_count()
    except Exception:
        return None
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
        return None
    node = find_focused_text(root)
    if node is None:
        return None
    return textbox_from(node)


def _atspi_desktop():
    global _desktop
    import gi

    gi.require_version("Atspi", "2.0")
    from gi.repository import Atspi

    if _desktop is None:
        Atspi.init()
        _desktop = Atspi.get_desktop(0)
    return _desktop
