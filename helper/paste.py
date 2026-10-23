"""Put dictated text into the focused window.

Electron asks us to paste. We write the text to both clipboards and leave
it there, then press Ctrl+V on a virtual keyboard this process keeps open.
ydotool's daemon was not doing that: it exited between pastes, and the
key press never reached the focused window. A keyboard that stays open
does, on both Wayland and XWayland. The previous clipboard is not restored.

This process has no PATH, DISPLAY, or XDG_RUNTIME_DIR. Electron replaced
the environment at spawn. Tools are called by absolute path, and the
session values are read from the Xwayland process and /run/user.
"""

import os
import socket
import subprocess
import time

XCLIP = "/usr/bin/xclip"
WL_COPY = "/usr/bin/wl-copy"
WL_PASTE = "/usr/bin/wl-paste"
YDOTOOL = "/usr/bin/ydotool"
YDOTOOLD = "/usr/bin/ydotoold"
# ydotool 0.1.8 listens here. The path is compiled into the binary.
YDOTOOL_SOCKET = "/tmp/.ydotool_socket"


def session_env(proc_cmdlines, runtime_dir, home):
    """Environment for xclip, wl-copy, and ydotool.

    proc_cmdlines is a list of argument lists, one per process. The
    Xwayland line carries the display name and the auth file, which
    changes every login.
    """
    display = ":0"
    xauthority = None
    for parts in proc_cmdlines:
        if not parts:
            continue
        if os.path.basename(parts[0]) != "Xwayland" and "Xwayland" not in parts[0]:
            continue
        if len(parts) > 1 and parts[1].startswith(":"):
            display = parts[1]
        if "-auth" in parts:
            index = parts.index("-auth")
            if index + 1 < len(parts):
                xauthority = parts[index + 1]
        break
    env = {
        "HOME": home,
        "PATH": "/usr/bin:/bin",
        "DISPLAY": display,
        "XDG_RUNTIME_DIR": runtime_dir,
    }
    if xauthority:
        env["XAUTHORITY"] = xauthority
    wayland = os.path.join(runtime_dir, "wayland-0")
    if os.path.exists(wayland):
        env["WAYLAND_DISPLAY"] = "wayland-0"
    return env


def read_process_cmdlines(proc_root="/proc"):
    found = []
    try:
        names = os.listdir(proc_root)
    except OSError:
        return found
    for name in names:
        if not name.isdigit():
            continue
        path = os.path.join(proc_root, name, "cmdline")
        try:
            raw = open(path, "rb").read()
        except OSError:
            continue
        parts = [part.decode(errors="replace") for part in raw.split(b"\0") if part]
        if parts:
            found.append(parts)
    return found


def socket_is_open(path):
    client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        client.connect(path)
        return True
    except OSError:
        return False
    finally:
        client.close()


def ensure_ydotoold(run, log, socket_path=YDOTOOL_SOCKET):
    """Start the uinput daemon if it is not already listening.

    A leftover socket file from a dead daemon is removed first. run() is
    the same shape as subprocess.Popen, so tests can record the command
    instead of starting a daemon.
    """
    if socket_is_open(socket_path):
        return True
    try:
        os.remove(socket_path)
    except FileNotFoundError:
        pass
    except OSError as error:
        log.write(f"could not remove stale ydotool socket: {error}")
        return False
    run(
        [YDOTOOLD],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    for _ in range(50):
        if socket_is_open(socket_path):
            log.write("ydotoold listening")
            return True
        time.sleep(0.02)
    log.write("ydotoold did not open its socket")
    return False


def _run(run, argv, env, input_bytes=None):
    # A clipboard tool that fails to daemonize must not stall the helper.
    # Electron relaunches a helper that stops answering IsReady.
    return run(
        argv,
        input=input_bytes,
        capture_output=True,
        env=env,
        check=False,
        timeout=2,
    )


def read_clipboards(run, env):
    """Current X11 and Wayland clipboard text.

    An empty clipboard makes these tools exit non-zero. That is stored as
    empty bytes.
    """
    x11 = _run(run, [XCLIP, "-selection", "clipboard", "-o"], env)
    wayland = b""
    if env.get("WAYLAND_DISPLAY"):
        wayland = _run(run, [WL_PASTE, "-n"], env).stdout
    return x11.stdout, wayland


def spawn_clipboard(spawn, argv, env, data):
    """Hand text to a clipboard tool and return without waiting.

    xclip does not exit. It sits in the background owning the selection
    until something else replaces it. Waiting for it is what made paste
    time out after the text was already on the clipboard, and the key
    press never happened. wl-copy forks for the same reason.
    """
    if data is None:
        data = b""
    proc = spawn(
        argv,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
        start_new_session=True,
    )
    proc.stdin.write(data)
    proc.stdin.close()
    return proc


def write_clipboards(spawn, env, x11, wayland):
    spawn_clipboard(spawn, [XCLIP, "-selection", "clipboard"], env, x11)
    if env.get("WAYLAND_DISPLAY"):
        spawn_clipboard(spawn, [WL_COPY], env, wayland)


def wait_for_clipboard(run, env, expected, sleep, tries=20):
    """True once xclip reads back the bytes we just wrote.

    xclip takes ownership a moment after we close its stdin. Ctrl+V before
    that pastes whatever was there before.
    """
    for _ in range(tries):
        got = _run(run, [XCLIP, "-selection", "clipboard", "-o"], env)
        if got.stdout == expected:
            return True
        sleep(0.05)
    return False


def all_key_codes(ecodes):
    """Linux key codes this virtual keyboard can emit. Not mouse buttons."""
    skip = {"KEY_MAX", "KEY_CNT", "KEY_RESERVED"}
    codes = []
    for name in dir(ecodes):
        if not name.startswith("KEY_") or name in skip:
            continue
        value = getattr(ecodes, name)
        if isinstance(value, int) and 0 < value < 768:
            codes.append(value)
    return sorted(set(codes))


class VirtualKeyboard:
    """A keyboard the compositor already knows about before Ctrl+V is sent.

    Creating the device in the same instant as the key press drops the
    events. The device is opened once and kept for the life of the helper.

    Ctrl and V go out in one report. Sending V in a later report is what
    makes some clients type the letter "v" instead of pasting: they turn
    the key into a character before the modifier is applied.
    """

    def __init__(self):
        self._ui = None
        self._fresh = False

    def ensure(self, log):
        if self._ui is not None:
            return True
        try:
            from evdev import UInput, ecodes
        except ImportError as error:
            log.write(f"paste keyboard unavailable: {error}")
            return False
        # Every key, not just Ctrl and V. When the physical keyboards are
        # grabbed, this device is what the focused window types on.
        keys = all_key_codes(ecodes)
        try:
            self._ui = UInput(
                {ecodes.EV_KEY: keys, ecodes.EV_MSC: [ecodes.MSC_SCAN]},
                name="shoutr paste",
                bustype=0x3,
            )
        except OSError as error:
            log.write(f"paste keyboard unavailable: {error}")
            return False
        self._fresh = True
        log.write("paste keyboard ready")
        return True

    def ctrl_v(self, sleep):
        from evdev import ecodes
        ui = self._ui
        if self._fresh:
            # The compositor needs a moment to add a brand new keyboard.
            sleep(0.4)
            self._fresh = False

        def hit(code, value):
            ui.write(ecodes.EV_MSC, ecodes.MSC_SCAN, code)
            ui.write(ecodes.EV_KEY, code, value)

        try:
            hit(ecodes.KEY_LEFTCTRL, 1)
            hit(ecodes.KEY_V, 1)
            ui.syn()
            sleep(0.08)
            hit(ecodes.KEY_V, 0)
            hit(ecodes.KEY_LEFTCTRL, 0)
            ui.syn()
        except OSError:
            try:
                hit(ecodes.KEY_LEFTCTRL, 0)
                ui.syn()
            except OSError:
                pass
            raise

    def key(self, code, value):
        """One key event and its sync. code is a Linux key code, value 0, 1, or 2."""
        from evdev import ecodes

        ui = self._ui
        if ui is None:
            raise OSError("paste keyboard is not open")
        ui.write(ecodes.EV_MSC, ecodes.MSC_SCAN, code)
        ui.write(ecodes.EV_KEY, code, value)
        ui.syn()


keyboard = VirtualKeyboard()


def send_ctrl_v(sleep, log):
    if not keyboard.ensure(log):
        return False
    try:
        keyboard.ctrl_v(sleep)
    except OSError as error:
        log.write(f"paste key press failed: {error}")
        return False
    return True


def paste_text(text, run, env, log, sleep=time.sleep):
    """Copy text and press Ctrl+V into whichever window has the keyboard.

    text is a str. It is never written to the log. The clipboard keeps the
    text. Returns True when the key press was sent.
    """
    try:
        encoded = text.encode("utf-8")
        write_clipboards(subprocess.Popen, env, encoded, encoded)
        if not wait_for_clipboard(run, env, encoded, sleep):
            log.write("clipboard did not read back")
        if not send_ctrl_v(sleep, log):
            return False
    except subprocess.TimeoutExpired:
        log.write("paste command timed out")
        return False
    return True
