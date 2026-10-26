#!/bin/bash
# Copy a finished build onto the system. ./install.sh runs this through sudo.
#
#   sudo bash packaging/install-system.sh install <user> <repo>
#   sudo bash packaging/install-system.sh uninstall <user>
#
# chrome-sandbox is setuid only after the files are owned by root. A setuid
# bit on the checkout copy would be a root shell for anyone who can edit it.

set -euo pipefail

if [[ $(id -u) -ne 0 ]]; then
	echo "install-system.sh must run as root, via sudo from ./install.sh." >&2
	exit 1
fi

action=${1:-}
user=${2:-}
repo=${3:-}

if [[ -z $user ]] || ! id "$user" >/dev/null 2>&1; then
	echo "Need the desktop user's name." >&2
	exit 1
fi

app_dir=/usr/lib/shoutr
rule_dst=/usr/lib/udev/rules.d/70-shoutr-uinput.rules
modules_dst=/etc/modules-load.d/shoutr-uinput.conf
desktop_dst=/usr/share/applications/shoutr.desktop

quit_if_running() {
	if pgrep -x shoutr >/dev/null 2>&1; then
		echo "Quit Shoutr first. The application binary is in use." >&2
		exit 1
	fi
}

install_rules() {
	install -D -m 0644 "$repo/packaging/70-shoutr-uinput.rules" "$rule_dst"
	install -D -m 0644 "$repo/packaging/shoutr-uinput.conf" "$modules_dst"
	if [[ ! -e /dev/uinput ]]; then
		modprobe uinput || true
	fi
	if command -v udevadm >/dev/null 2>&1; then
		udevadm control --reload-rules || true
		udevadm trigger --subsystem-match=misc --sysname-match=uinput || true
		udevadm trigger --subsystem-match=input || true
	fi
	if getent group input >/dev/null 2>&1; then
		if ! id -nG "$user" | tr ' ' '\n' | grep -qx input; then
			usermod -aG input "$user"
			echo "Added $user to the input group. This login picks that up after a logout."
		fi
	fi
	# The group change does not apply to the current login. An ACL does,
	# so paste and the shortcut work without waiting for that logout.
	if command -v setfacl >/dev/null 2>&1; then
		[[ -e /dev/uinput ]] && setfacl -m "u:${user}:rw" /dev/uinput || true
		shopt -s nullglob
		local dev
		for dev in /dev/input/event*; do
			setfacl -m "u:${user}:rw" "$dev" || true
		done
		shopt -u nullglob
	fi
}

install_app() {
	[[ -x $repo/build/shoutr ]] || {
		echo "Missing $repo/build/shoutr" >&2
		exit 1
	}
	[[ -f $repo/build/resources/app.asar ]] || {
		echo "Missing the repacked app.asar" >&2
		exit 1
	}
	quit_if_running
	rm -rf "$app_dir"
	mkdir -p "$app_dir"
	# build/native is the sqlite compile tree, not part of the app.
	tar -C "$repo/build" --exclude=native -cf - . | tar -C "$app_dir" -xf -
	mkdir -p "$app_dir/helper"
	install -m 0755 "$repo/helper/shoutr_helper_launcher.sh" "$app_dir/helper/shoutr_helper_launcher.sh"
	install -m 0644 \
		"$repo/helper/evdev_setup.sh" \
		"$repo/helper/shoutr_helper.py" \
		"$repo/helper/apps.py" \
		"$repo/helper/keycodes.py" \
		"$repo/helper/paste.py" \
		"$repo/helper/textbox.py" \
		"$app_dir/helper/"
	# Ubuntu 22's helper imports evdev from this tree. It is Python-version
	# specific, so it is copied only when the build machine produced it.
	if [[ -d $repo/vendor/python3-dist ]]; then
		mkdir -p "$app_dir/vendor"
		cp -a "$repo/vendor/python3-dist" "$app_dir/vendor/"
	fi
	install -m 0644 "$repo/packaging/paths.sh" "$app_dir/paths.sh"
	install -m 0755 "$repo/packaging/doctor.sh" "$app_dir/doctor.sh"
	install -m 0755 "$repo/bin/shoutr" /usr/bin/shoutr
	install -m 0644 "$repo/packaging/shoutr.desktop" "$desktop_dst"
	mkdir -p /usr/share/icons/hicolor
	cp -a "$repo/packaging/icons/hicolor/." /usr/share/icons/hicolor/
	chown -R root:root "$app_dir"
	chmod 4755 "$app_dir/chrome-sandbox"
	install_rules
	update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
	if command -v gtk-update-icon-cache >/dev/null 2>&1; then
		gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || true
	fi
}

uninstall_app() {
	quit_if_running
	rm -rf "$app_dir"
	rm -f /usr/bin/shoutr "$desktop_dst" "$rule_dst" "$modules_dst"
	rm -f \
		/usr/share/icons/hicolor/48x48/apps/shoutr.png \
		/usr/share/icons/hicolor/128x128/apps/shoutr.png \
		/usr/share/icons/hicolor/256x256/apps/shoutr.png \
		/usr/share/icons/hicolor/512x512/apps/shoutr.png
	if command -v udevadm >/dev/null 2>&1; then
		udevadm control --reload-rules || true
	fi
	update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
	if command -v gtk-update-icon-cache >/dev/null 2>&1; then
		gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || true
	fi
	echo "Removed Shoutr from /usr. The dictation profile was left in place."
}

case $action in
install)
	[[ -n $repo && -d $repo ]] || {
		echo "Need the repository path." >&2
		exit 1
	}
	install_app
	;;
uninstall) uninstall_app ;;
*)
	echo "Usage: install-system.sh install <user> <repo> | uninstall <user>" >&2
	exit 1
	;;
esac
