# Shouter - Wispr Flow for Linux

<img src="img/shouter-sidebar-wispr-hug.png" width="200" align="right" alt="Shouter holding a phone">

[Wispr Flow](https://wisprflow.com) is a great dictation app. You hold a key, talk, and it types into the window in front of you. It ships for macOS and Windows, and it lacks Linux support.

Shoutr is a Linux client for that same dictation, for GNOME, including Wayland. It is a project made in good faith. You sign in with your own Wispr account, and the speech still runs on Wispr's servers. Any money you pay still goes to Wispr Flow.

Push-to-talk types into the focused window.

<br clear="right">

## Use it

Debian, Ubuntu, or another apt system such as Linux Mint or Pop!_OS. x86_64, from the account you dictate with. Clone the repository, then:

```bash
./install.sh
```

Quit Shoutr if it is already open. The script asks for sudo. It installs the packages, the input-device rule, the GNOME window bridge, and the app. The panel can flicker once while GNOME reads the new extension. Open Shoutr from the app grid, or run `shoutr`.

Quit the official Wispr Flow app first if it is installed. Both use `~/.config/Wispr Flow`.

If paste or the shortcut does not work, run `shoutr --doctor`. When it says `/dev/uinput` is not writable, log out and back in once.

To remove the app and leave the dictation profile in place:

```bash
./install.sh --uninstall
```

## Contribute

Please test Shoutr, add support for more systems, and send fixes. All pull requests will be considered.

The Wispr application is not in this repository. `./install.sh` downloads the Windows build named in `packaging/vendor.json` (1.6.1209), checks its SHA-256, and applies the Linux patches in `patches/`. Those patches match that build. A newer Wispr release is not picked up automatically.

The usual launch keeps the window on XWayland, which is the path the window patches were tried with. Paste and the shortcut use a virtual keyboard, so they still reach Wayland windows. `SHOUTR_USE_WAYLAND=1 shoutr` asks Electron for a native Wayland window.

Shoutr uses the distro `python3-evdev` when that import works. The copy under `vendor/python3-dist` is used only when that copy itself imports, so an Ubuntu 22 build is not forced onto a newer Python. On Debian, Ubuntu, and other apt systems, a terminal launch installs `python3-evdev` when neither copy imports. Fedora, Arch, and openSUSE do not get that install. Support for those starts in `helper/evdev_setup.sh` and `install.sh`.

`shoutr --doctor` checks the display, input devices, clipboard tools, evdev, AT-SPI, and the GNOME bridge. `ROADMAP.md` is the record of how the Linux port was worked out. `bash helper/test_evdev_setup.sh`, `python3 tools/test_extract_vendor.py`, and `python3 gnome/test_window_bridge.py` cover the installer pieces.
