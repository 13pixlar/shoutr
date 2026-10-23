"""Linux evdev codes translated into the key numbers Wispr matches.

Module 28889 in the app picks a key table from process.platform. Darwin
gets macOS key codes. Everything else, including Linux, gets Windows
virtual-key codes. The shortcuts stored in this profile use that second
table: push-to-talk is 162 (left Ctrl) plus 32 (Space).

The numbers below are those Windows codes. The names on the left are
Linux input event codes, which is what /dev/input reports.
"""

from evdev import ecodes

# Letters are not a contiguous range in the Linux table (KEY_A is 30,
# KEY_B is 48), so each one is listed.
_LETTERS = {
    ecodes.KEY_A: 65,
    ecodes.KEY_B: 66,
    ecodes.KEY_C: 67,
    ecodes.KEY_D: 68,
    ecodes.KEY_E: 69,
    ecodes.KEY_F: 70,
    ecodes.KEY_G: 71,
    ecodes.KEY_H: 72,
    ecodes.KEY_I: 73,
    ecodes.KEY_J: 74,
    ecodes.KEY_K: 75,
    ecodes.KEY_L: 76,
    ecodes.KEY_M: 77,
    ecodes.KEY_N: 78,
    ecodes.KEY_O: 79,
    ecodes.KEY_P: 80,
    ecodes.KEY_Q: 81,
    ecodes.KEY_R: 82,
    ecodes.KEY_S: 83,
    ecodes.KEY_T: 84,
    ecodes.KEY_U: 85,
    ecodes.KEY_V: 86,
    ecodes.KEY_W: 87,
    ecodes.KEY_X: 88,
    ecodes.KEY_Y: 89,
    ecodes.KEY_Z: 90,
}

# The top digit row. Linux lists KEY_1 first and KEY_0 last.
_DIGITS = {
    ecodes.KEY_1: 49,
    ecodes.KEY_2: 50,
    ecodes.KEY_3: 51,
    ecodes.KEY_4: 52,
    ecodes.KEY_5: 53,
    ecodes.KEY_6: 54,
    ecodes.KEY_7: 55,
    ecodes.KEY_8: 56,
    ecodes.KEY_9: 57,
    ecodes.KEY_0: 48,
}

_FUNCTIONS = {getattr(ecodes, f"KEY_F{n}"): 111 + n for n in range(1, 13)}

EVDEV_TO_VK = {
    ecodes.KEY_LEFTCTRL: 162,
    ecodes.KEY_RIGHTCTRL: 163,
    ecodes.KEY_LEFTALT: 164,
    ecodes.KEY_RIGHTALT: 165,
    ecodes.KEY_LEFTSHIFT: 160,
    ecodes.KEY_RIGHTSHIFT: 161,
    ecodes.KEY_LEFTMETA: 91,
    ecodes.KEY_RIGHTMETA: 92,
    ecodes.KEY_SPACE: 32,
    ecodes.KEY_ESC: 27,
    ecodes.KEY_ENTER: 13,
    ecodes.KEY_TAB: 9,
    ecodes.KEY_BACKSPACE: 8,
    ecodes.KEY_CAPSLOCK: 20,
    ecodes.KEY_UP: 38,
    ecodes.KEY_DOWN: 40,
    ecodes.KEY_LEFT: 37,
    ecodes.KEY_RIGHT: 39,
    ecodes.KEY_HOME: 36,
    ecodes.KEY_END: 35,
    ecodes.KEY_PAGEUP: 33,
    ecodes.KEY_PAGEDOWN: 34,
    ecodes.KEY_INSERT: 45,
    ecodes.KEY_DELETE: 46,
    ecodes.KEY_MINUS: 189,
    ecodes.KEY_EQUAL: 187,
    ecodes.KEY_LEFTBRACE: 219,
    ecodes.KEY_RIGHTBRACE: 221,
    ecodes.KEY_BACKSLASH: 220,
    ecodes.KEY_SEMICOLON: 186,
    ecodes.KEY_APOSTROPHE: 222,
    ecodes.KEY_COMMA: 188,
    ecodes.KEY_DOT: 190,
    ecodes.KEY_SLASH: 191,
    ecodes.KEY_GRAVE: 192,
}
EVDEV_TO_VK.update(_LETTERS)
EVDEV_TO_VK.update(_DIGITS)
EVDEV_TO_VK.update(_FUNCTIONS)
VK_TO_EVDEV = {vk: code for code, vk in EVDEV_TO_VK.items()}

PRESS = "key_event_press"
RELEASE = "key_event_release"


def vk_for(evdev_code):
    """Windows virtual-key code for a Linux key, or None if we do not send it."""
    return EVDEV_TO_VK.get(evdev_code)


class KeyTracker:
    """Held keys, and the 1-based event index Electron expects.

    A press for a key that is already held is dropped. Two interfaces of
    the same keyboard would otherwise release the shortcut twice. The
    index only advances for events we actually send, because Electron
    warns when the sequence skips.
    """

    def __init__(self):
        self.held = set()
        self.index = 0

    def event(self, evdev_code, value):
        """value 1 is press, 0 is release, 2 is the kernel's auto-repeat."""
        if value == 2:
            return None
        vk = vk_for(evdev_code)
        if vk is None:
            return None
        if value == 1:
            if vk in self.held:
                return None
            self.held.add(vk)
            event_type = PRESS
        elif value == 0:
            if vk not in self.held:
                return None
            self.held.discard(vk)
            event_type = RELEASE
        else:
            return None
        self.index += 1
        return {"eventType": event_type, "index": self.index, "key": vk}

    def stale(self, keycodes):
        """Codes from CheckStaleKeys that are not held right now."""
        return [code for code in keycodes if code not in self.held]


# _IOW('E', 0x90, int) from linux/input.h. 1 takes the device, 0 gives it back.
# While the grab is held, the kernel does not deliver that keyboard to the
# focused window. The helper re-injects every key except the push-to-talk
# trigger, so Space from Ctrl+Space does not land in the text box.
EVIOCGRAB = 0x40044590

# Windows virtual-key codes for the modifiers stored in the shortcut config.
_MODIFIER_VKS = {162, 163, 160, 161, 164, 165, 91, 92}


def grab(device):
    """Stop this keyboard from reaching the focused window."""
    import fcntl

    fcntl.ioctl(device.fd, EVIOCGRAB, 1)


def ungrab(device):
    """Give a grabbed keyboard back. A closed process releases it too."""
    import fcntl

    try:
        fcntl.ioctl(device.fd, EVIOCGRAB, 0)
    except OSError:
        pass


def ptt_chords(shortcuts):
    """Push-to-talk chords as (modifier evdev codes, trigger evdev codes).

    shortcuts maps a chord string such as "162+32" to an action name.
    Only the action "ptt" is returned. A single key, and a chord Wispr
    uses for something else (Ctrl+V pastes), is left alone so it still
    reaches the focused window. -1 is the non-mac option code and is skipped.
    """
    chords = []
    if not isinstance(shortcuts, dict):
        return chords
    for chord, action in shortcuts.items():
        if action != "ptt":
            continue
        modifiers = set()
        triggers = set()
        for part in str(chord).split("+"):
            if part == "-1":
                continue
            try:
                vk = int(part)
            except ValueError:
                continue
            evdev_code = VK_TO_EVDEV.get(vk)
            if evdev_code is None:
                continue
            if vk in _MODIFIER_VKS:
                modifiers.add(evdev_code)
            else:
                triggers.add(evdev_code)
        if modifiers and triggers:
            chords.append((frozenset(modifiers), frozenset(triggers)))
    return chords


def swallows(evdev_code, held_vks, chords):
    """True when this key is a push-to-talk trigger and its modifiers are held.

    held_vks is the Windows codes already down, not including evdev_code.
    Modifiers themselves are never swallowed, so Ctrl still reaches the
    focused window for every other shortcut.
    """
    for modifiers, triggers in chords:
        if evdev_code not in triggers:
            continue
        if {vk_for(code) for code in modifiers} <= held_vks:
            return True
    return False


class KeyForwarder:
    """Re-inject physical keys, except a push-to-talk trigger.

    Two event nodes of one keyboard both report the same press. The first
    one owns the key. Repeats and the release have to come from that same
    node, or a second node would type the key again.
    """

    def __init__(self, chords, write):
        self.chords = chords
        self.write = write
        self.owner = {}
        self.disabled = False

    def handle(self, device_id, evdev_code, value, held_vks):
        """value 1 press, 0 release, 2 auto-repeat. held_vks is before this event."""
        if self.disabled:
            return False
        if value == 1:
            if evdev_code in self.owner:
                return False
            if swallows(evdev_code, held_vks, self.chords):
                return False
            self.owner[evdev_code] = device_id
            self.write(evdev_code, 1)
            return True
        if value == 2:
            if self.owner.get(evdev_code) != device_id:
                return False
            self.write(evdev_code, 2)
            return True
        if value == 0:
            if self.owner.get(evdev_code) != device_id:
                return False
            del self.owner[evdev_code]
            self.write(evdev_code, 0)
            return True
        return False

    def release_all(self):
        """Key-up for anything we are still holding down on the virtual keyboard."""
        for code in list(self.owner):
            self.owner.pop(code, None)
            try:
                self.write(code, 0)
            except OSError:
                pass


def open_keyboards():
    """Open every real keyboard. The caller decides whether to grab.

    Returns a list of evdev InputDevice, non-blocking. The helper's own
    virtual keyboard is skipped so injected keys are not read back.
    """
    import os

    import evdev

    opened = []
    for path in evdev.list_devices():
        try:
            device = evdev.InputDevice(path)
        except OSError:
            continue
        if device.phys == "py-evdev-uinput" or device.name.startswith("shoutr"):
            device.close()
            continue
        try:
            usable = is_keyboard(device.capabilities())
        except OSError:
            device.close()
            continue
        if usable:
            os.set_blocking(device.fd, False)
            opened.append(device)
        else:
            device.close()
    return opened


def is_keyboard(capabilities):
    """True for a device that has the keys a shortcut needs.

    capabilities is the evdev map of event type to a list of codes.
    Mice and the virtual pointer do not advertise Space, A, and left Ctrl
    together, so they are left out.
    """
    keys = set(capabilities.get(ecodes.EV_KEY, []))
    needed = {ecodes.KEY_SPACE, ecodes.KEY_A, ecodes.KEY_LEFTCTRL}
    return needed <= keys
