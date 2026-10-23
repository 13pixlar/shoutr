#!/usr/bin/python3
"""Helper for Wispr Flow on Linux.

Electron spawns this process and replaces its environment, so HOME and PATH
are not set. It writes one JSON message at a time to this process's standard
input, and it reads replies from file descriptor 3. Key events travel the
other way: this process writes HelperAPIRequest messages to fd 3.

Framing, matching the app's escapeMessage and pushData:

    +  is written as +1
    |  is written as +2
    messages end with |

Unescape +2 before +1. Escaping the other way would turn the characters "+2"
into the escape for "|".

Pass 2 answers the ready check, reports key presses, and pastes dictated
text. Every other request still gets HelperAPIError. Values are never
logged: a PasteText payload contains whatever the user dictated, and key
codes would reconstruct what they typed.
"""

import json
import os
import pwd
import select
import signal
import stat
import subprocess
import sys
import time
import uuid
from codecs import getincrementaldecoder

from evdev import ecodes

import keycodes
import paste

# Epoch milliseconds, captured at import so it is the process start and not
# the moment a reply happens to be written. The app only uses it for timing.
STARTED_MS = int(time.time() * 1000)

# Keys the app does not treat as a message kind.
METADATA = ("uuid", "sentryTrace", "sentryBaggage")

# The only value the app's error enum accepts. Anything else fails to parse,
# and the request then waits out its timeout instead of taking the error path.
ERROR_TYPE = "SOME_ERROR_TYPES"
NO_HANDLER = "NO_HANDLER_REGISTERED"


def unescape(text):
    """Reverse the app's escapeMessage. +2 first, then +1."""
    return text.replace("+2", "|").replace("+1", "+")


def encode(text):
    """escapeMessage, then the trailing delimiter pushData splits on."""
    return text.replace("+", "+1").replace("|", "+2") + "|"


class Framer:
    """Turn a stream of bytes into unescaped message strings.

    A message can be split across reads, and so can a multi-byte character.
    The incremental decoder holds an incomplete UTF-8 sequence until the
    next read finishes it. Text is held until a "|" arrives.
    """

    def __init__(self):
        self._decoder = getincrementaldecoder("utf-8")(errors="replace")
        self._pending = ""

    def feed(self, data):
        self._pending += self._decoder.decode(data)
        messages = []
        while True:
            end = self._pending.find("|")
            if end < 0:
                break
            messages.append(unescape(self._pending[:end]))
            self._pending = self._pending[end + 1 :]
        return messages


def state_log_path():
    """Log file for unhandled requests.

    The passwd database is used instead of HOME, because the environment
    Electron builds for this process does not include HOME. XDG_STATE_HOME
    is missing for the same reason, so this is always ~/.local/state.
    """
    home = pwd.getpwuid(os.getuid()).pw_dir
    return os.path.join(home, ".local", "state", "Wispr Flow", "logs", "helper.log")


class Log:
    def __init__(self, path):
        directory = os.path.dirname(path)
        os.makedirs(directory, exist_ok=True)
        # File descriptor 3 belongs to Electron. Opening the log must not
        # take it: a reply written there would land in this file, and the
        # app would never see it.
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
        if fd == 3:
            moved = os.dup(fd)
            os.close(fd)
            fd = moved
        self._file = os.fdopen(fd, "a", encoding="utf-8")

    def write(self, line):
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self._file.write(f"{stamp} {line}\n")
        self._file.flush()


def message_kind(body):
    """First key that carries a value and is not metadata. Same rule as the app."""
    for key, value in body.items():
        if key not in METADATA and value is not None:
            return key, value
    return None, None


def payload_fields(value):
    """Names of the fields inside a request payload. Never the field values."""
    if not isinstance(value, dict):
        return []
    payload = value.get("payload")
    if isinstance(payload, dict):
        return sorted(payload)
    return sorted(value)


def write_all(fd, data):
    view = memoryview(data)
    while view:
        written = os.write(fd, view)
        if written == 0:
            raise OSError("write to fd 3 wrote nothing")
        view = view[written:]


def send(fd, response):
    # Compact JSON parses the same as the pretty JSON Electron sends.
    body = json.dumps({"HelperAPIResponse": response}, separators=(",", ":"))
    write_all(fd, encode(body).encode("utf-8"))


def ready_response(uuid):
    # ACK is first so the app's kind detector reports ACK. It also accepts
    # the reply as ready as long as ACK is present, whatever the order.
    return {
        "uuid": uuid,
        "ACK": True,
        "HelperLaunchTiming": {"helperMainEntryMs": STARTED_MS},
    }


def ack_response(uuid):
    return {"uuid": uuid, "ACK": True}


def error_response(uuid, kind, description=None, code=None):
    return {
        "uuid": uuid,
        "HelperAPIError": {
            "payload": {
                "description": description or "Shoutr stub has no handler for this request",
                "type": ERROR_TYPE,
                "params": {"code": code or NO_HANDLER, "messageType": kind},
            }
        },
    }


def keypress_request(payload):
    return {
        "uuid": str(uuid.uuid4()),
        "KeypressEvent": {"payload": payload},
    }


def send_request(fd, request):
    body = json.dumps({"HelperAPIRequest": request}, separators=(",", ":"))
    write_all(fd, encode(body).encode("utf-8"))


def read_shortcuts():
    """Action names keyed by chord, from the app's config. No other prefs."""
    home = pwd.getpwuid(os.getuid()).pw_dir
    path = os.path.join(home, ".config", "Wispr Flow", "config.json")
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        shortcuts = data.get("prefs", {}).get("user", {}).get("shortcuts", {})
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(shortcuts, dict):
        return None
    return shortcuts


def shortcut_summary():
    """One log line of action=chord. No other prefs."""
    shortcuts = read_shortcuts()
    if shortcuts is None:
        return "could not read shortcuts"
    return ", ".join(f"{action}={chord}" for chord, action in shortcuts.items())


def payload_of(value):
    if isinstance(value, dict) and isinstance(value.get("payload"), dict):
        return value["payload"]
    return {}


# These requests carry no work for this pass. Acknowledging them keeps the
# app from logging a missing handler while it records audio itself.
ACK_ONLY = (
    "DictationStart",
    "DictationStop",
    "StartAllIntervals",
    "StopAllIntervals",
    "HelperAppShutdown",
    "StartAccessibilityServices",
)


def handle(text, fd, log, keys, paste_enabled):
    if not text:
        return
    try:
        message = json.loads(text)
    except json.JSONDecodeError:
        # The body can contain dictated text, so the parse error is not logged.
        log.write("could not parse message (JSON)")
        return
    if not isinstance(message, dict):
        log.write("message was not an object")
        return

    request = message.get("HelperAPIRequest")
    if isinstance(request, dict):
        kind, value = message_kind(request)
        request_uuid = request.get("uuid")
        if not isinstance(request_uuid, str) or not kind:
            log.write(f"request missing uuid or kind (kind={kind})")
            return
        if kind == "IsReady":
            send(fd, ready_response(request_uuid))
            log.write("IsReady -> ACK")
            return
        if kind == "CheckStaleKeys":
            codes = payload_of(value).get("keycodes") or []
            stale = keys.stale(codes)
            send(fd, {
                "uuid": request_uuid,
                "StaleKeysResponse": {"payload": {"staleKeys": stale}},
            })
            log.write(f"CheckStaleKeys -> {len(stale)} stale of {len(codes)}")
            return
        if kind == "UpdateShortcuts":
            log.write("UpdateShortcuts -> " + shortcut_summary())
            send(fd, ack_response(request_uuid))
            return
        if kind == "PasteText":
            body = payload_of(value)
            text_value = body.get("text") if isinstance(body.get("text"), str) else ""
            paste_id = body.get("pasteId") if isinstance(body.get("pasteId"), str) else ""
            note = f"PasteText pasteId={paste_id} chars={len(text_value)}"
            if not paste_enabled:
                send(fd, ack_response(request_uuid))
                log.write(note + " (paste disabled)")
                return
            home = pwd.getpwuid(os.getuid()).pw_dir
            env = paste.session_env(
                paste.read_process_cmdlines(),
                f"/run/user/{os.getuid()}",
                home,
            )
            if paste.paste_text(text_value, subprocess.run, env, log):
                send(fd, ack_response(request_uuid))
                log.write(note)
            else:
                send(fd, error_response(request_uuid, kind, "paste failed", "PASTE_FAILED"))
                log.write(note + " failed")
            return
        if kind in ACK_ONLY:
            log.write(f"{kind} -> ACK")
            send(fd, ack_response(request_uuid))
            return
        fields = payload_fields(value)
        detail = "no payload" if not fields else "payload fields: " + ", ".join(fields)
        log.write(f"unhandled {kind} ({detail})")
        send(fd, error_response(request_uuid, kind))
        return

    response = message.get("HelperAPIResponse")
    if isinstance(response, dict):
        # Electron answers our KeypressEvent with ACK. Logging each one
        # would record the pace of typing.
        kind, _value = message_kind(response)
        if kind != "ACK":
            log.write(f"ignored HelperAPIResponse ({kind})")
        return
    log.write("message had neither HelperAPIRequest nor HelperAPIResponse")


def forward_keys(devices, watched, keys, fd, log, relay, grabbed):
    """Read pending evdev events and send one KeypressEvent per edge.

    relay is a KeyForwarder, or None when the keyboards were not grabbed.
    Grabbed keys are written back out, except the push-to-talk trigger.
    If the virtual keyboard fails, the grabs are released so typing still works.
    """
    for device in list(devices):
        try:
            events = list(device.read())
        except BlockingIOError:
            continue
        except OSError as error:
            log.write(f"keyboard closed {device.path}: {error}")
            devices.remove(device)
            if device.fd in watched:
                watched.remove(device.fd)
            continue
        for event in events:
            if event.type != ecodes.EV_KEY:
                continue
            held = set(keys.held)
            if relay is not None and not relay.disabled:
                try:
                    relay.handle(device.path, event.code, event.value, held)
                except OSError as error:
                    log.write(f"key relay failed: {error}")
                    relay.disabled = True
                    relay.release_all()
                    for grabbed_device in grabbed:
                        keycodes.ungrab(grabbed_device)
                    grabbed.clear()
            payload = keys.event(event.code, event.value)
            if payload is None:
                continue
            send_request(fd, keypress_request(payload))


def main():
    # Check the reply pipe before opening the log. If fd 3 is free, the log
    # file would be assigned that number and the replies would be logged
    # instead of delivered.
    try:
        info = os.fstat(3)
    except OSError:
        sys.stderr.write("shoutr helper: file descriptor 3 is not open\n")
        return 1
    # Node's spawn() gives the extra stdio slot a socket, not a FIFO pipe.
    # A regular file here means the log stole fd 3 and replies would be lost.
    if not (stat.S_ISFIFO(info.st_mode) or stat.S_ISSOCK(info.st_mode)):
        sys.stderr.write("shoutr helper: file descriptor 3 is not a pipe or socket\n")
        return 1
    log = Log(state_log_path())
    log.write("helper started")
    log.write("shortcuts " + shortcut_summary())

    def stop(signum, _frame):
        log.write(f"signal {signum}, exiting")
        raise SystemExit(0)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)

    keys = keycodes.KeyTracker()
    devices = []
    if os.environ.get("SHOUTR_DISABLE_KEYS") != "1":
        try:
            devices = keycodes.open_keyboards()
        except OSError as error:
            log.write(f"keyboard open failed: {error}")
        if devices:
            names = ", ".join(f"{device.path} ({device.name})" for device in devices)
            log.write(f"listening to {len(devices)} keyboard(s): {names}")
        else:
            log.write("no keyboard devices opened")
    paste_enabled = os.environ.get("SHOUTR_DISABLE_PASTE") != "1"
    if paste_enabled:
        paste.keyboard.ensure(log)
    relay, grabbed = start_swallow(devices, log, paste_enabled)

    framer = Framer()
    watched = [0] + [device.fd for device in devices]
    try:
        while True:
            try:
                readable, _unused, _also = select.select(watched, [], [])
            except InterruptedError:
                continue
            if 0 in readable:
                try:
                    chunk = os.read(0, 65536)
                except InterruptedError:
                    continue
                if not chunk:
                    break
                try:
                    for text in framer.feed(chunk):
                        handle(text, 3, log, keys, paste_enabled)
                except BrokenPipeError:
                    log.write("fd 3 closed, exiting")
                    return 0
            if any(device.fd in readable for device in devices):
                try:
                    forward_keys(devices, watched, keys, 3, log, relay, grabbed)
                except BrokenPipeError:
                    log.write("fd 3 closed, exiting")
                    return 0
    finally:
        if relay is not None and not relay.disabled:
            relay.release_all()
        for device in grabbed:
            keycodes.ungrab(device)
    log.write("stdin closed, exiting")
    return 0


def start_swallow(devices, log, paste_enabled):
    """Grab the keyboards and re-inject every key except push-to-talk.

    Returns (forwarder or None, grabbed devices). If any grab fails, every
    grab is released and keys keep their normal path, so a half-grabbed
    keyboard cannot type twice.
    """
    if not devices or not paste_enabled or paste.keyboard._ui is None:
        return None, []
    chords = keycodes.ptt_chords(read_shortcuts())
    if not chords:
        log.write("push-to-talk chord was not found; Space will also reach the focused window")
        return None, []
    if paste.keyboard._fresh:
        # Mutter drops keys from a keyboard it has not seated yet.
        time.sleep(0.4)
        paste.keyboard._fresh = False
    grabbed = []
    try:
        for device in devices:
            keycodes.grab(device)
            grabbed.append(device)
    except OSError as error:
        log.write(f"could not grab keyboards: {error}")
        for device in grabbed:
            keycodes.ungrab(device)
        return None, []
    log.write(f"swallowing push-to-talk on {len(grabbed)} keyboard(s)")
    return keycodes.KeyForwarder(chords, paste.keyboard.key), grabbed


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
