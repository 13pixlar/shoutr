"""Install the window bridge that matches this GNOME Shell.

GNOME 45 loads extension.js as a module. GNOME 42 loads it as a script.
One file cannot be both, so this copies extension-42.js or extension-45.js
to extension.js. Shell 43 and 44 use the same script as 42. The break is 45.

    python3 gnome/install_window_bridge.py
    python3 gnome/install_window_bridge.py --enable
    python3 gnome/install_window_bridge.py --reload
    python3 gnome/install_window_bridge.py --remove

With no flag the files are copied and the running shell keeps its previous
copy until the next login. --enable turns the extension on, and reloads
every extension when that is what it takes for this shell to see the new
file. The panel can flicker. --reload does that even when the file did not
change. --remove drops it from this user's enabled list and deletes the copy.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

UUID = "wispr-flow-window-bridge@wispr.flow"
BUS_NAME = "org.wispr.flow.WindowBridge"
OBJECT_PATH = "/org/wispr/flow/WindowBridge"
SOURCE = Path(__file__).resolve().parent / "window-bridge"
VERSION_SCHEMA = "org.gnome.shell"
VERSION_KEY = "disable-extension-version-validation"
ENABLED_SCHEMA = "org.gnome.shell"
ENABLED_KEY = "enabled-extensions"


def parse_enabled_list(raw):
    """UUIDs from `gsettings get` output. The @as prefix is display only."""
    return re.findall(r"'([^']*)'", raw)


def format_enabled_list(values):
    """A value `gsettings set` accepts for a string array."""
    if not values:
        return "[]"
    return "[" + ", ".join("'" + value + "'" for value in values) + "]"


def ensure_enabled(values, uuid):
    if uuid in values:
        return list(values), False
    return [*values, uuid], True


def without_enabled(values, uuid):
    kept = [value for value in values if value != uuid]
    return kept, len(kept) != len(values)


def shell_major():
    out = subprocess.check_output(["gnome-shell", "--version"], text=True)
    match = re.search(r"(\d+)", out)
    if not match:
        raise RuntimeError(f"could not read a version from {out!r}")
    return int(match.group(1))


def entry_point(major):
    # 45 is the first shell that loads extension.js as a module.
    name = "extension-42.js" if major < 45 else "extension-45.js"
    path = SOURCE / name
    if not path.is_file():
        raise RuntimeError(f"missing {path}")
    return path


def destination():
    data = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(data) / "gnome-shell" / "extensions" / UUID


def write_if_changed(path, text):
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return False
    path.write_text(text, encoding="utf-8")
    return True


def install(major):
    src = entry_point(major)
    dest = destination()
    dest.mkdir(parents=True, exist_ok=True)
    changed = write_if_changed(dest / "metadata.json", (SOURCE / "metadata.json").read_text(encoding="utf-8"))
    changed = write_if_changed(dest / "extension.js", src.read_text(encoding="utf-8")) or changed
    return src.name, dest, changed


def session_bus_available():
    if os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
        return True
    runtime = os.environ.get("XDG_RUNTIME_DIR")
    if not runtime:
        return False
    bus = os.path.join(runtime, "bus")
    if os.path.exists(bus):
        os.environ["DBUS_SESSION_BUS_ADDRESS"] = "unix:path=" + bus
        return True
    return False


def extension_info():
    raw = subprocess.check_output(
        [
            "gdbus", "call", "--session",
            "--dest", "org.gnome.Shell.Extensions",
            "--object-path", "/org/gnome/Shell/Extensions",
            "--method", "org.gnome.Shell.Extensions.GetExtensionInfo",
            UUID,
        ],
        text=True,
    )
    state = re.search(r"'state': <([0-9.]+)>", raw)
    error = re.search(r"'error': <'(.*)'>, 'hasPrefs'", raw)
    if not state:
        raise RuntimeError(f"no state in {raw!r}")
    message = error.group(1) if error else ""
    return int(float(state.group(1))), message


def try_extension_info():
    try:
        return extension_info()
    except (subprocess.CalledProcessError, RuntimeError):
        return None


def read_enabled():
    raw = subprocess.check_output(
        ["gsettings", "get", ENABLED_SCHEMA, ENABLED_KEY],
        text=True,
    )
    return parse_enabled_list(raw)


def write_enabled(values):
    subprocess.check_call(
        ["gsettings", "set", ENABLED_SCHEMA, ENABLED_KEY, format_enabled_list(values)]
    )


def reload_extensions():
    """Flip the version-check setting and restore it. Each edge reloads."""
    current = subprocess.check_output(
        ["gsettings", "get", VERSION_SCHEMA, VERSION_KEY],
        text=True,
    ).strip()
    if current not in ("true", "false"):
        raise RuntimeError(f"unexpected {VERSION_KEY} value {current!r}")
    other = "false" if current == "true" else "true"
    subprocess.check_call(["gsettings", "set", VERSION_SCHEMA, VERSION_KEY, other])
    wait_until_settled()
    subprocess.check_call(["gsettings", "set", VERSION_SCHEMA, VERSION_KEY, current])
    return wait_until_settled()


def wait_until_settled():
    # loadExtension marks the extension ERROR for a moment before enable, so
    # one ENABLED reading is not enough. Two in a row means the reload finished.
    # A shell that has not scanned the new directory yet has no state at all.
    last = None
    enabled_reads = 0
    deadline = time.monotonic() + 8
    time.sleep(0.3)
    while time.monotonic() < deadline:
        last = try_extension_info()
        if last and last[0] == 1:
            enabled_reads += 1
            if enabled_reads >= 2:
                return last
        else:
            enabled_reads = 0
        time.sleep(0.25)
    return last


def focused_window():
    raw = subprocess.check_output(
        [
            "gdbus", "call", "--session",
            "--dest", BUS_NAME,
            "--object-path", OBJECT_PATH,
            "--method", f"{BUS_NAME}.GetFocusedWindow",
        ],
        text=True,
    )
    return raw.strip()


def print_focused():
    try:
        print(focused_window())
    except (subprocess.CalledProcessError, OSError):
        return


def ask_shell_to_enable():
    subprocess.call(
        ["gnome-extensions", "enable", UUID],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def activate(changed, force_reload):
    values, dirty = ensure_enabled(read_enabled(), UUID)
    if dirty:
        write_enabled(values)
    ask_shell_to_enable()
    state = try_extension_info()
    if state and state[0] == 1 and not changed and not force_reload:
        print(f"GNOME extension enabled ({UUID})")
        print_focused()
        return 0
    print("Reloading GNOME extensions so this shell reads the bridge. The panel may flicker.")
    reload_extensions()
    ask_shell_to_enable()
    state = try_extension_info()
    if not state:
        print("The shell did not report the extension. Log out and back in.")
        return 1
    code, message = state
    print(f"state {code}" + (f": {message}" if message else ""))
    if code != 1:
        return 1
    print_focused()
    return 0


def remove_extension():
    if session_bus_available():
        try:
            values, dirty = without_enabled(read_enabled(), UUID)
            if dirty:
                write_enabled(values)
        except (subprocess.CalledProcessError, OSError) as error:
            print(f"Could not update the enabled list: {error}")
        subprocess.call(
            ["gnome-extensions", "disable", UUID],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    dest = destination()
    if dest.exists():
        shutil.rmtree(dest)
        print(f"Removed {dest}")
    else:
        print(f"No extension at {dest}")
    print("Log out if the shell is still running the old copy.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--enable",
        action="store_true",
        help="enable the extension, reloading the shell if it cannot see the new file",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="reload every enabled extension even when the files did not change",
    )
    parser.add_argument(
        "--remove",
        action="store_true",
        help="disable the extension and delete this user's copy",
    )
    args = parser.parse_args()
    if args.remove:
        return remove_extension()
    major = shell_major()
    name, dest, changed = install(major)
    print(f"GNOME Shell {major}: installed {name} to {dest}")
    if not args.enable and not args.reload:
        print("The running shell keeps the previous copy until login, or pass --enable.")
        return 0
    if not session_bus_available():
        print("No desktop session bus. Log in and run: python3 gnome/install_window_bridge.py --enable")
        return 0
    return activate(changed, force_reload=args.reload)


if __name__ == "__main__":
    sys.exit(main())
