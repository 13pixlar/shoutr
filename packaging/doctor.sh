#!/usr/bin/env bash
# Report whether this machine can run Shoutr.
#
#   packaging/doctor.sh
#   shoutr --doctor
#
# A failure is something that stops dictation, paste, or the focused-app
# name. A warning is a fallback that is not in force yet. Exit status is 1
# when any failure was printed.

set -uo pipefail

here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=paths.sh
source "$here/paths.sh"

failures=0

ok() { printf '  ok   %s\n' "$*"; }
fail() {
	printf '  FAIL %s\n' "$*"
	failures=$((failures + 1))
}
warn() { printf '  warn %s\n' "$*"; }
info() { printf '       %s\n' "$*"; }

session_bus() {
	[[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] && return 0
	[[ -n ${XDG_RUNTIME_DIR:-} && -S $XDG_RUNTIME_DIR/bus ]]
}

count_event_devices() {
	local dev total=0 openable=0
	shopt -s nullglob
	for dev in /dev/input/event*; do
		total=$((total + 1))
		# python-evdev opens the device read-write so it can grab the shortcut.
		[[ -r $dev && -w $dev ]] && openable=$((openable + 1))
	done
	shopt -u nullglob
	printf '%s %s\n' "$openable" "$total"
}

check_display() {
	local desktop=${XDG_CURRENT_DESKTOP:-}
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		ok "Wayland session ($WAYLAND_DISPLAY)"
		if [[ ${SHOUTR_USE_WAYLAND:-} == 1 && ${SHOUTR_USE_X11:-} != 1 ]]; then
			info "Windows: native Wayland (SHOUTR_USE_WAYLAND=1)"
		else
			info "Windows: XWayland. Paste still uses the virtual keyboard."
		fi
	elif [[ -n ${DISPLAY:-} ]]; then
		ok "X11 session ($DISPLAY)"
	else
		fail "no Wayland or X11 display"
		info "Start Shoutr from the desktop, not from a text console."
	fi
	if [[ -n $desktop ]]; then
		info "Desktop: $desktop"
	fi
}

check_uinput() {
	if [[ ! -e /dev/uinput ]]; then
		fail "/dev/uinput is missing"
		info "The installer loads the uinput module. Run ./install.sh again."
		return
	fi
	if [[ -w /dev/uinput ]]; then
		ok "/dev/uinput is writable"
		return
	fi
	fail "/dev/uinput is not writable, so paste cannot send Ctrl+V"
	info "Run ./install.sh, then log out and back in if this line stays."
}

check_input_group() {
	if ! getent group input >/dev/null 2>&1; then
		info "This system has no input group. The session ACL is the only path."
		return
	fi
	if id -nG | tr ' ' '\n' | grep -qx input; then
		ok "this login is in the input group"
		return
	fi
	if id -nG "$USER" | tr ' ' '\n' | grep -qx input; then
		warn "the account is in the input group, but this login has not picked it up"
		info "Log out and back in. A session ACL can cover /dev/uinput before that."
		return
	fi
	warn "this account is not in the input group"
	info "./install.sh adds it. The udev rule can be enough on its own."
}

check_keyboards() {
	local openable total
	read -r openable total < <(count_event_devices)
	if [[ $total -eq 0 ]]; then
		warn "no /dev/input/event* devices"
		return
	fi
	if [[ $openable -eq 0 ]]; then
		fail "none of the $total input devices can be opened"
		info "Push-to-talk cannot see Ctrl+Space until ./install.sh and a fresh login."
		return
	fi
	ok "$openable of $total input devices can be opened"
}

check_clipboard() {
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		if [[ -x /usr/bin/wl-copy && -x /usr/bin/wl-paste ]]; then
			ok "wl-copy and wl-paste"
		else
			fail "wl-clipboard is not installed"
			info "Wayland paste writes the clipboard with wl-copy."
		fi
		if [[ -x /usr/bin/xclip ]]; then
			ok "xclip"
		else
			fail "xclip is not installed"
			info "The window runs on XWayland, and that clipboard is xclip."
		fi
		return
	fi
	if [[ -x /usr/bin/xclip ]]; then
		ok "xclip"
	else
		fail "xclip is not installed"
	fi
}

check_python() {
	# Same choice the helper uses: the distro module, then a bundle that imports.
	local py=python3
	if [[ -n ${SHOUTR_HELPER:-} && -f $(dirname "$SHOUTR_HELPER")/evdev_setup.sh ]]; then
		# shellcheck disable=SC1091
		source "$(dirname "$SHOUTR_HELPER")/evdev_setup.sh"
		shoutr_export_evdev_path "$(cd "$(dirname "$SHOUTR_HELPER")/.." && pwd)" || true
		py=$(shoutr_python)
	fi
	if "$py" -c 'import evdev' >/dev/null 2>&1; then
		ok "Python evdev imports"
	else
		fail "Python cannot import evdev"
		info "On Debian and Ubuntu, ./install.sh or the next launch installs python3-evdev."
	fi
	if python3 - <<'PY' >/dev/null 2>&1
import gi
gi.require_version("Atspi", "2.0")
from gi.repository import Atspi, Gio
PY
	then
		ok "Python AT-SPI and Gio import"
	else
		fail "Python cannot import AT-SPI"
		info "The installer apt-installs python3-gi and gir1.2-atspi-2.0."
	fi
}

check_gnome() {
	local desktop=${XDG_CURRENT_DESKTOP:-}
	desktop=${desktop,,}
	local gnome=false
	if [[ $desktop == *gnome* ]]; then
		gnome=true
	elif [[ -z $desktop ]] && command -v gnome-shell >/dev/null 2>&1; then
		gnome=true
	fi
	if [[ $gnome != true ]]; then
		if [[ -n ${XDG_CURRENT_DESKTOP:-} ]]; then
			info "Focused-app names need GNOME. Paste and the shortcut still work."
		fi
		return
	fi
	local data=${XDG_DATA_HOME:-$HOME/.local/share}
	local ext=$data/gnome-shell/extensions/wispr-flow-window-bridge@wispr.flow
	if [[ ! -f $ext/extension.js ]]; then
		fail "GNOME window bridge is not installed"
		info "Run ./install.sh. Without it the focused app has no name."
		return
	fi
	if ! session_bus || ! command -v gnome-extensions >/dev/null 2>&1; then
		ok "GNOME window bridge is on disk"
		info "Its running state was not checked. From the desktop: shoutr --doctor"
		return
	fi
	local state
	state=$(
		gnome-extensions info wispr-flow-window-bridge@wispr.flow 2>/dev/null |
			awk -F': ' '/^  State:/ {print $2; exit}'
	) || true
	case $state in
	ACTIVE | ENABLED) ok "GNOME window bridge is $state" ;;
	"")
		warn "GNOME window bridge is installed but this session did not report it"
		info "From the desktop: python3 gnome/install_window_bridge.py --enable"
		;;
	*)
		fail "GNOME window bridge state is $state"
		info "python3 gnome/install_window_bridge.py --enable"
		;;
	esac
}

check_app() {
	if ! resolve_shoutr_paths "${BASH_SOURCE[0]}"; then
		fail "Shoutr is not built and not installed under /usr"
		info "From the repository: ./install.sh"
		return
	fi
	info "Layout: $SHOUTR_LAYOUT ($SHOUTR_BINARY)"
	if [[ ! -x $SHOUTR_BINARY ]]; then
		fail "application binary is missing"
	elif missing=$(ldd "$SHOUTR_BINARY" 2>/dev/null | awk '/not found/ {print $1}') && [[ -n $missing ]]; then
		fail "libraries missing: ${missing//$'\n'/ }"
		info "Run ./install.sh so the Electron libraries are installed."
	else
		ok "application binary and libraries"
	fi
	if [[ ! -f $SHOUTR_ARCHIVE ]]; then
		fail "app.asar is missing"
	else
		ok "app.asar"
	fi
	if [[ ! -x $SHOUTR_HELPER ]]; then
		fail "helper launcher is missing"
	else
		ok "helper launcher"
	fi
	if [[ ! -f $SHOUTR_SQLITE ]]; then
		fail "Linux sqlite addon is missing"
	else
		local magic
		magic=$(od -An -t x1 -N 4 -- "$SHOUTR_SQLITE" | tr -d ' \n')
		if [[ $magic == 7f454c46 ]]; then
			ok "sqlite addon is a Linux ELF"
		else
			fail "sqlite addon is not a Linux ELF"
		fi
	fi
	local sandbox
	sandbox=$(dirname "$SHOUTR_BINARY")/chrome-sandbox
	if [[ $SHOUTR_LAYOUT == system ]]; then
		local perms owner
		perms=$(stat -c '%a' "$sandbox" 2>/dev/null || echo missing)
		owner=$(stat -c '%U' "$sandbox" 2>/dev/null || echo missing)
		if [[ $perms == 4755 && $owner == root ]]; then
			ok "chrome-sandbox is setuid root"
		else
			fail "chrome-sandbox is $perms $owner, need 4755 root"
			info "Run ./install.sh. The bit is set only on the /usr copy."
		fi
	else
		info "Checkout build. ./install.sh sets the sandbox bit on /usr/lib/shoutr."
	fi
}

check_profile_lock() {
	local config=${XDG_CONFIG_HOME:-$HOME/.config}
	local lock="$config/Wispr Flow/SingletonLock"
	[[ -L $lock ]] || return 0
	local target pid
	target=$(readlink "$lock" 2>/dev/null || true)
	pid=${target##*-}
	if [[ $pid =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
		warn "profile lock is held by pid $pid"
		info "Quit that Shoutr or wispr-flow before starting another one."
		return
	fi
	warn "profile lock is stale"
	info "The launcher removes it on the next start."
}

resolve_shoutr_paths "${BASH_SOURCE[0]}" || true

printf 'Shoutr\n'
check_display
check_uinput
check_input_group
check_keyboards
check_clipboard
check_python
check_gnome
check_app
check_profile_lock
if pgrep -x wispr-flow >/dev/null 2>&1; then
	warn "wispr-flow is running. Quit it before Shoutr. They share one profile."
fi
if command -v node >/dev/null 2>&1; then
	info "node $(node -p process.versions.node) ($(command -v node))"
else
	info "node is not on PATH. ./install.sh downloads Node 22 to build."
fi

echo
if [[ $failures -eq 0 ]]; then
	echo "Nothing is blocking Shoutr."
	exit 0
fi
echo "$failures check(s) failed."
exit 1
