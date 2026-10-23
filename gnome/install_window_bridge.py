"""Install the window bridge that matches this GNOME Shell.

GNOME 45 loads extension.js as a module. GNOME 42 loads it as a script.
One file cannot be both, so this copies extension-42.js or extension-45.js
to extension.js. Shell 43 and 44 use the same script as 42. The break is 45.

    python3 gnome/install_window_bridge.py
    python3 gnome/install_window_bridge.py --reload

--reload asks the running shell to load extensions again. GNOME 42 has no
per-extension reload. Flipping disable-extension-version-validation is the
switch the shell already listens for, and it reloads every extension, then
the setting is put back. The panel can flicker. Without --reload, a login
is what makes a changed extension.js take effect.
"""

import argparse
import os
import re
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


def install(major):
    src = entry_point(major)
    dest = destination()
    dest.mkdir(parents=True, exist_ok=True)
    (dest / "metadata.json").write_text((SOURCE / "metadata.json").read_text())
    (dest / "extension.js").write_text(src.read_text())
    return src.name, dest


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
    last = None
    enabled_reads = 0
    deadline = time.monotonic() + 8
    time.sleep(0.3)
    while time.monotonic() < deadline:
        last = extension_info()
        if last[0] == 1:
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--reload",
        action="store_true",
        help="reload every enabled extension so the new file runs without a login",
    )
    args = parser.parse_args()
    major = shell_major()
    name, dest = install(major)
    print(f"GNOME Shell {major}: installed {name} to {dest}")
    if not args.reload:
        print("The running shell keeps the previous copy until login, or pass --reload.")
        return 0
    state, message = reload_extensions()
    print(f"state {state}" + (f": {message}" if message else ""))
    if state != 1:
        return 1
    print(focused_window())
    return 0


if __name__ == "__main__":
    sys.exit(main())
