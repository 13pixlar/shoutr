# Shoutr

Wispr Flow is a great dictation app. You hold a key, talk, and it types into the window in front of you. It ships for macOS and Windows, and it lacks Linux support.

Shoutr is a Linux client for that same dictation, for GNOME, including Wayland. It is a project made in good faith. You sign in with your own Wispr account, and the speech still runs on Wispr's servers. Any money you pay still goes to Wispr Flow.

Push-to-talk types into the focused window.

The Wispr application is not in this repository. `./install.sh` downloads a pinned Windows build, checks its SHA-256, and applies the Linux patches in `patches/`.

## Install

Debian, Ubuntu, or another apt system such as Linux Mint or Pop!_OS. x86_64, from the account you dictate with. Clone the repository, then:

```bash
./install.sh
```

Quit Shoutr if it is already open. The script asks for sudo. It installs the packages, the input-device rule, the GNOME window bridge, and the app. The panel can flicker once while GNOME reads the new extension. Open Shoutr from the app grid, or run `shoutr`.

Quit the official Wispr Flow app first if it is installed. Both use `~/.config/Wispr Flow`.

If `shoutr --doctor` says `/dev/uinput` is not writable, log out and back in once.

## Check and remove

```bash
shoutr --doctor
./install.sh --uninstall
```

Uninstall leaves the dictation profile in place.

## Build pin

`packaging/vendor.json` names Wispr Flow 1.6.1209. The patches match that build. A newer Wispr release is not picked up automatically.

`SHOUTR_USE_WAYLAND=1 shoutr` opens the window as a native Wayland client. The usual launch keeps the window on XWayland, which is the path the window patches were tried with. Paste and the shortcut use the virtual keyboard either way.

## evdev

Shoutr uses the distro `python3-evdev` when that import works. The copy under `vendor/python3-dist` is used only when that copy itself imports, so an Ubuntu 22 build is not forced onto a newer Python.

`./install.sh` installs the package on Debian, Ubuntu, and other apt systems such as Linux Mint and Pop!_OS. If it is still missing, starting `shoutr` from a terminal runs `sudo apt-get install python3-evdev`. Fedora, Arch, and openSUSE are not installed that way. Install the distro package that provides the `evdev` module, then start Shoutr again.
