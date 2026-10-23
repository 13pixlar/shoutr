// GNOME Shell 42–44 entry point. The shell loads this file as a script.
// An `import` or `export` here is a syntax error ("import declarations may
// only appear at top level of a module"), which is why GNOME 45 has its
// own file. The installer copies this file to extension.js on those versions.
//
// D-Bus, same on both entry points:
//   name      org.wispr.flow.WindowBridge
//   object    /org/wispr/flow/WindowBridge
//   interface org.wispr.flow.WindowBridge
//     GetFocusedWindow() -> (s)   JSON {appId,title,pid,wmClass}
//     GetWindowList()    -> (s)   JSON array of that shape
//     FocusChanged(s)             the same JSON when focus or the title changes

const {Gio, GLib, Meta, Shell} = imports.gi;

const BUS_NAME = 'org.wispr.flow.WindowBridge';
const OBJECT_PATH = '/org/wispr/flow/WindowBridge';

const IFACE_XML = `
<node>
  <interface name="org.wispr.flow.WindowBridge">
    <method name="GetFocusedWindow">
      <arg type="s" direction="out" name="json"/>
    </method>
    <method name="GetWindowList">
      <arg type="s" direction="out" name="json"/>
    </method>
    <signal name="FocusChanged">
      <arg type="s" name="json"/>
    </signal>
  </interface>
</node>`;

function emptyWindow() {
    return {appId: '', title: '', pid: 0, wmClass: ''};
}

function asString(value) {
    return typeof value === 'string' ? value : '';
}

// The focused window, or the most recently used normal window when the
// shell itself has focus. That is the window dictation would land in.
function focusedOrMru() {
    let win = global.display.get_focus_window();
    if (win)
        return win;
    try {
        let ws = global.workspace_manager.get_active_workspace();
        let list = global.display.get_tab_list(Meta.TabList.NORMAL, ws);
        for (let i = 0; i < list.length; i++) {
            let candidate = list[i];
            if (!candidate)
                continue;
            if (candidate.window_type !== Meta.WindowType.NORMAL)
                continue;
            if (!candidate.is_skip_taskbar())
                return candidate;
        }
    } catch (e) {}
    return null;
}

function windowInfo(win) {
    if (!win)
        return emptyWindow();

    let appId = '';
    try {
        let app = Shell.WindowTracker.get_default().get_window_app(win);
        if (app)
            appId = asString(app.get_id());
    } catch (e) {}

    let title = '';
    try {
        title = asString(win.get_title());
    } catch (e) {}

    let pid = 0;
    try {
        pid = win.get_pid();
        if (typeof pid !== 'number' || pid < 0)
            pid = 0;
    } catch (e) {
        pid = 0;
    }

    let wmClass = '';
    try {
        wmClass = asString(win.get_wm_class());
    } catch (e) {}

    return {appId: appId, title: title, pid: pid, wmClass: wmClass};
}

var WindowBridge = class WindowBridge {
    enable() {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(IFACE_XML, this);
        this._dbusImpl.export(Gio.DBus.session, OBJECT_PATH);
        this._ownerId = Gio.bus_own_name_on_connection(
            Gio.DBus.session,
            BUS_NAME,
            Gio.BusNameOwnerFlags.REPLACE,
            null,
            null
        );
        this._focusWindow = null;
        this._titleId = 0;
        this._focusChangedId = global.display.connect(
            'notify::focus-window',
            () => this._onFocusChanged()
        );
        this._onFocusChanged();
    }

    disable() {
        if (this._focusChangedId) {
            global.display.disconnect(this._focusChangedId);
            this._focusChangedId = 0;
        }
        this._disconnectTitle();
        this._focusWindow = null;
        if (this._ownerId) {
            Gio.bus_unown_name(this._ownerId);
            this._ownerId = 0;
        }
        if (this._dbusImpl) {
            this._dbusImpl.unexport();
            this._dbusImpl = null;
        }
    }

    _disconnectTitle() {
        if (this._titleId && this._focusWindow) {
            try {
                this._focusWindow.disconnect(this._titleId);
            } catch (e) {}
        }
        this._titleId = 0;
    }

    _onFocusChanged() {
        let win = global.display.get_focus_window();
        if (win !== this._focusWindow) {
            this._disconnectTitle();
            this._focusWindow = win;
            if (win) {
                this._titleId = win.connect('notify::title', () => this._emitFocus());
            }
        }
        this._emitFocus();
    }

    _emitFocus() {
        if (!this._dbusImpl)
            return;
        let json = JSON.stringify(windowInfo(focusedOrMru()));
        this._dbusImpl.emit_signal('FocusChanged', new GLib.Variant('(s)', [json]));
    }

    GetFocusedWindow() {
        return JSON.stringify(windowInfo(focusedOrMru()));
    }

    // Normal, taskbar-visible windows. Skip surfaces with no .desktop id:
    // the shell names those "window:N" and leaves wmClass empty. That drops
    // the helper's own clipboard windows.
    GetWindowList() {
        let out = [];
        let actors = global.get_window_actors();
        for (let i = 0; i < actors.length; i++) {
            let win = actors[i].meta_window;
            if (!win)
                continue;
            if (win.window_type !== Meta.WindowType.NORMAL)
                continue;
            if (win.is_skip_taskbar())
                continue;
            let info = windowInfo(win);
            if (info.wmClass === '' && info.appId.indexOf('window:') === 0)
                continue;
            out.push(info);
        }
        return JSON.stringify(out);
    }
};

function init() {
    return new WindowBridge();
}
