"""Which app is focused, from the GNOME window bridge.

The bridge is a shell extension on the session bus. This process does not
inherit DBUS_SESSION_BUS_ADDRESS: Electron replaces the environment at
spawn. The bus socket is /run/user/<uid>/bus, which is stable for the login.

The app stores the focused app from AppInfoUpdate (a request we send) and
also asks with GetAppInfo, GetActiveAppInfo, and GetRunningApps. Window
titles stay out of the log. They are sent to the app, which already shows
the focused window's title.
"""

import json
import os
import uuid

import textbox

BUS_NAME = "org.wispr.flow.WindowBridge"
OBJECT_PATH = "/org/wispr/flow/WindowBridge"

# What the app uses when GetAppInfo fails. Matching it keeps a dead bridge
# from looking like a different failure.
UNKNOWN_APP = {"appName": "unknown", "bundleId": "unknown", "url": "unknown"}
UNKNOWN_ACTIVE = {"appName": "unknown", "bundleId": "", "url": "", "windowTitle": ""}


def session_bus_address(runtime_dir):
    current = os.environ.get("DBUS_SESSION_BUS_ADDRESS")
    if current:
        return current
    path = os.path.join(runtime_dir, "bus")
    if os.path.exists(path):
        return "unix:path=" + path
    return None


def short_name(app_id):
    """org.gnome.Nautilus.desktop -> Nautilus."""
    if not isinstance(app_id, str) or not app_id:
        return ""
    base = app_id[:-8] if app_id.endswith(".desktop") else app_id
    return base.rsplit(".", 1)[-1]


def parse_desktop_name(text):
    """The default Name= in a desktop file. Localized Name[xx] is the fallback."""
    name = ""
    localized = ""
    in_entry = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("["):
            if in_entry:
                break
            in_entry = stripped == "[Desktop Entry]"
            continue
        if not in_entry or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        if key == "Name" and value.strip():
            name = value.strip()
        elif key.startswith("Name[") and value.strip() and not localized:
            localized = value.strip()
    return name or localized


def application_dirs(home):
    return [
        os.path.join(home, ".local", "share", "applications"),
        os.path.join(home, ".local", "share", "flatpak", "exports", "share", "applications"),
        "/usr/local/share/applications",
        "/usr/share/applications",
        "/var/lib/flatpak/exports/share/applications",
    ]


class DesktopNames:
    """App id to the Name= in its desktop file. Misses are cached too."""

    def __init__(self, home, read_text=None):
        self._dirs = application_dirs(home)
        self._read_text = read_text or _read_text
        self._cache = {}

    def name(self, app_id):
        if not isinstance(app_id, str) or not app_id:
            return ""
        if app_id in self._cache:
            return self._cache[app_id]
        found = ""
        for directory in self._dirs:
            path = os.path.join(directory, app_id)
            text = self._read_text(path)
            if text:
                found = parse_desktop_name(text)
                if found:
                    break
        self._cache[app_id] = found
        return found


def _read_text(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as handle:
            return handle.read()
    except OSError:
        return ""


def process_comm(pid):
    if not isinstance(pid, int) or pid <= 0:
        return ""
    try:
        with open(f"/proc/{pid}/comm", encoding="utf-8", errors="replace") as handle:
            return handle.read().strip()
    except OSError:
        return ""


def describe(info, lookup_name, comm_for=process_comm):
    """One bridge window object -> the fields the app stores.

    pid is kept for the text-box lookup and is not part of the reply.
    """
    if not isinstance(info, dict):
        return None
    app_id = info.get("appId") if isinstance(info.get("appId"), str) else ""
    # The shell uses "window:N" when a surface has no desktop file.
    if app_id.startswith("window:"):
        app_id = ""
    wm_class = info.get("wmClass") if isinstance(info.get("wmClass"), str) else ""
    title = info.get("title") if isinstance(info.get("title"), str) else ""
    pid = info.get("pid") if isinstance(info.get("pid"), int) else 0
    if pid < 0:
        pid = 0
    bundle = app_id or wm_class
    name = lookup_name(app_id) or lookup_name(wm_class) or comm_for(pid) or short_name(bundle)
    if not bundle and not name and not title:
        return None
    if not name:
        name = bundle or "unknown"
    return {
        "appName": name,
        "bundleId": bundle,
        "url": "",
        "windowTitle": title,
        "pid": pid,
    }


def active_fields(app):
    if app is None:
        return dict(UNKNOWN_ACTIVE)
    return {
        "appName": app["appName"],
        "bundleId": app["bundleId"],
        "url": app["url"],
        "windowTitle": app.get("windowTitle") or "",
    }


def app_info_fields(app):
    """GetAppInfo has no window title. The schema rejects unknown fields."""
    if app is None:
        return dict(UNKNOWN_APP)
    return {"appName": app["appName"], "bundleId": app["bundleId"], "url": app["url"]}


def running_apps(windows, lookup_name):
    """One entry per desktop id. The bridge returns one object per window."""
    found = []
    seen = set()
    if not isinstance(windows, list):
        return found
    for info in windows:
        app = describe(info, lookup_name, lambda _pid: "")
        bundle = app["bundleId"] if app else ""
        if not bundle or bundle in seen:
            continue
        seen.add(bundle)
        found.append({"bundleId": bundle, "name": app["appName"]})
    return found


def update_request(app):
    return {
        "uuid": uuid.uuid4().hex,
        "AppInfoUpdate": {"payload": active_fields(app)},
    }


class Bridge:
    """GetFocusedWindow and GetWindowList. Reconnects after a dropped call."""

    def __init__(self, connect):
        self._connect = connect
        self._conn = None

    def _connection(self):
        if self._conn is None:
            self._conn = self._connect()
        return self._conn

    def call(self, method):
        from gi.repository import Gio, GLib

        try:
            result = self._connection().call_sync(
                BUS_NAME,
                OBJECT_PATH,
                BUS_NAME,
                method,
                None,
                GLib.VariantType.new("(s)"),
                Gio.DBusCallFlags.NONE,
                400,
                None,
            )
        except Exception:
            self._conn = None
            raise
        payload = result.unpack()[0]
        data = json.loads(payload)
        return data


def open_session_bus(runtime_dir):
    address = session_bus_address(runtime_dir)
    if not address:
        raise OSError("session bus address is not set")
    os.environ["DBUS_SESSION_BUS_ADDRESS"] = address
    import gi
    from gi.repository import Gio

    return Gio.bus_get_sync(Gio.BusType.SESSION, None)


# Toolkits that hide their tree (Firefox) watch this property. It is not
# ScreenReaderEnabled: that one starts Orca, and it still does not give
# Cursor's editor a caret.
STATUS_BUS = "org.a11y.Bus"
STATUS_PATH = "/org/a11y/bus"
STATUS_INTERFACE = "org.a11y.Status"
ENABLED_PROPERTY = "IsEnabled"


def accessibility_enabled(connection):
    """The current IsEnabled value. A missing bus reads as false."""
    from gi.repository import Gio, GLib

    result = connection.call_sync(
        STATUS_BUS,
        STATUS_PATH,
        "org.freedesktop.DBus.Properties",
        "Get",
        GLib.Variant("(ss)", (STATUS_INTERFACE, ENABLED_PROPERTY)),
        GLib.VariantType.new("(v)"),
        Gio.DBusCallFlags.NONE,
        400,
        None,
    )
    value = result.unpack()[0]
    return bool(value)


def set_accessibility_enabled(connection, enabled):
    """Set IsEnabled. Never call this with ScreenReaderEnabled."""
    from gi.repository import Gio, GLib

    connection.call_sync(
        STATUS_BUS,
        STATUS_PATH,
        "org.freedesktop.DBus.Properties",
        "Set",
        GLib.Variant(
            "(ssv)",
            (STATUS_INTERFACE, ENABLED_PROPERTY, GLib.Variant("b", bool(enabled))),
        ),
        None,
        Gio.DBusCallFlags.NONE,
        400,
        None,
    )


class AccessibilitySwitch:
    """Turn IsEnabled on for this process, and put the old value back.

    If it was already on, another client asked for it and this process
    leaves it on. restore() is a no-op in that case.
    """

    def __init__(self, get_enabled, set_enabled):
        self._get = get_enabled
        self._set = set_enabled
        self.turned_on = False

    def enable(self):
        if self._get():
            self.turned_on = False
            return
        self._set(True)
        self.turned_on = True

    def restore(self):
        if not self.turned_on:
            return
        self._set(False)
        self.turned_on = False

    @classmethod
    def open(cls, runtime_dir):
        connection = open_session_bus(runtime_dir)
        return cls(
            lambda: accessibility_enabled(connection),
            lambda enabled: set_accessibility_enabled(connection, enabled),
        )


class AppWatch:
    """Focused app, the running list, and focus changes worth sending."""

    def __init__(self, runtime_dir, home, log):
        self._log = log
        self._names = DesktopNames(home)
        self._bridge = Bridge(lambda: open_session_bus(runtime_dir))
        self._down = False
        self._last = None
        self._force = False
        self._current = None
        # Last TextBoxInfo snapshot. None means nothing has been pushed.
        # A caret-less app is walked once per focus, not on every poll:
        # the walk is on the same thread that forwards keys.
        self._box_bundle = None
        self._box_sig = None
        self._box_has_caret = False
        # Last http(s) page address for this bundle. A fresh describe()
        # starts at "", and the walk fills it. The address is not logged.
        self._page_url = ""
        self._page_bundle = ""
        self.dictating = False
        self.detector = False

    def current(self):
        return self._current

    def focused(self):
        try:
            info = self._bridge.call("GetFocusedWindow")
            self._down = False
        except Exception as error:
            if not self._down:
                self._log.write(f"window bridge unavailable: {error.__class__.__name__}")
                self._down = True
            self._current = None
            return None
        app = describe(info, self._names.name)
        if app and app.get("bundleId") == self._page_bundle:
            app["url"] = self._page_url
        self._current = app
        return app

    def textbox_for(self, app):
        pid = app["pid"] if app else 0
        found, url = textbox.read_context(pid)
        if not isinstance(url, str):
            url = ""
        if app is not None:
            app["url"] = url
            self._page_url = url
            self._page_bundle = app.get("bundleId") or ""
        if found is None:
            missing = dict(textbox.UNAVAILABLE)
            # The bus can be up while this control has no caret. The app
            # treats "functioning but no text" as no context, and paste
            # still follows couldNotGetTextBoxInfo.
            if textbox.accessibility_up():
                missing["accessibilityIsFunctioning"] = True
            return missing
        return found

    def textbox(self):
        return self.textbox_for(self.focused())

    def wants_textbox_poll(self):
        """Walk again when the focused app changes, or during dictation if it has a caret.

        Between dictations the tree is not walked again, so key forwarding
        is not waiting on it. DictationStart forces one send even when the
        text is unchanged, because the app clears its copy at the start.
        """
        bundle = ""
        if self._current and self._current.get("bundleId"):
            bundle = self._current["bundleId"]
        if bundle != self._box_bundle:
            return True
        return self.dictating and self._box_has_caret

    def box_changed(self, box):
        bundle = ""
        if self._current and self._current.get("bundleId"):
            bundle = self._current["bundleId"]
        return (bundle, textbox.signature(box)) != (self._box_bundle, self._box_sig)

    def remember_box(self, box):
        bundle = ""
        if self._current and self._current.get("bundleId"):
            bundle = self._current["bundleId"]
        self._box_bundle = bundle
        self._box_sig = textbox.signature(box)
        self._box_has_caret = not box.get("couldNotGetTextBoxInfo")

    def accessibility(self):
        return textbox.accessibility_up()

    def running(self):
        try:
            windows = self._bridge.call("GetWindowList")
            self._down = False
        except Exception as error:
            if not self._down:
                self._log.write(f"window bridge unavailable: {error.__class__.__name__}")
                self._down = True
            return []
        return running_apps(windows, self._names.name)

    def poll(self):
        """The focused app when its id or title changed, else None."""
        app = self.focused()
        if app is None or not app["bundleId"]:
            return None
        key = (app["bundleId"], app["windowTitle"])
        if key == self._last and not self._force:
            return None
        self._last = key
        self._force = False
        return app

    def arm(self):
        """The next poll sends the current app even if it has not changed."""
        self._force = True
