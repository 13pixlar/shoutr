#!/bin/bash
# Install Shoutr for the desktop user who runs this script.
#
#   ./install.sh
#   ./install.sh --doctor
#   ./install.sh --uninstall
#
# Wispr's application is not in the git repository. This downloads the pinned
# Windows setup, checks its SHA-256, and builds the Linux app from it.
# sudo covers packages, the udev rule, and the copy into /usr. A long build
# can ask again. The GNOME extension is installed for this user only.
#
# Run it as yourself, not as root. It asks for sudo when it needs root, and
# the extension has to land in your home directory.

set -euo pipefail

root=$(cd "$(dirname "$0")" && pwd)
cd "$root"

tmp_files=()
cleanup() {
	local path
	[[ ${#tmp_files[@]} -eq 0 ]] && return 0
	for path in "${tmp_files[@]}"; do
		rm -rf "$path"
	done
}
trap cleanup EXIT

die() {
	printf 'install.sh: %s\n' "$1" >&2
	exit 1
}

step() {
	printf '\n== %s\n' "$1"
}

require_user() {
	if [[ $(id -u) -eq 0 ]]; then
		die "Run ./install.sh as the user who will dictate. It asks for sudo itself."
	fi
	command -v sudo >/dev/null 2>&1 || die "sudo is required to install packages and copy Shoutr into /usr."
}

require_system() {
	[[ $(uname -s) == Linux ]] || die "Shoutr runs on Linux."
	case $(uname -m) in
	x86_64 | amd64) ;;
	*) die "The pinned Wispr build is x86_64. This machine is $(uname -m)." ;;
	esac
	# shellcheck disable=SC1091
	source "$root/helper/evdev_setup.sh"
	if [[ -r $(shoutr_os_release_file) ]]; then
		# shellcheck disable=SC1090
		source "$(shoutr_os_release_file)"
	fi
	shoutr_apt_family || die "This installer uses apt. ${PRETTY_NAME:-This system} is not one of those."
}

# Ubuntu 24 renamed several libraries to names that end in t64. Installing
# both the old name and the new one fails when they conflict, so a package
# is skipped when its t64 replacement is also available. The result is the
# global PACKAGES array, filled in this process so a failure can exit.
choose_packages() {
	local -a candidates=(
		python3
		python3-evdev
		python3-gi
		gir1.2-atspi-2.0
		gir1.2-glib-2.0
		wl-clipboard
		xclip
		build-essential
		ca-certificates
		curl
		xz-utils
		xdg-utils
		acl
		libnss3
		libatk1.0-0
		libatk-bridge2.0-0
		libcups2
		libdrm2
		libgtk-3-0
		libgbm1
		libasound2
		libxss1
		libxtst6
		libxshmfence1
		libxkbcommon0
		libsecret-1-0
		libatspi2.0-0
		libnotify4
		libatk1.0-0t64
		libatk-bridge2.0-0t64
		libcups2t64
		libgtk-3-0t64
		libasound2t64
		libatspi2.0-0t64
	)
	local -a known=()
	local name other skip candidate
	for name in "${candidates[@]}"; do
		# apt-cache show succeeds for a package with no installable version.
		# Candidate: (none) is that case, and apt-get install would fail.
		candidate=$(apt-cache policy "$name" 2>/dev/null | awk '/^  Candidate:/ {print $2; exit}')
		if [[ -n $candidate && $candidate != "(none)" ]]; then
			known+=("$name")
		fi
	done
	PACKAGES=()
	for name in "${known[@]}"; do
		skip=false
		for other in "${known[@]}"; do
			[[ $other == "${name}t64" ]] && skip=true
		done
		[[ $skip == true ]] && continue
		PACKAGES+=("$name")
	done
	[[ ${#PACKAGES[@]} -gt 0 ]] || die "apt does not know the packages Shoutr needs."
}

install_packages() {
	step "System packages"
	choose_packages
	sudo DEBIAN_FRONTEND=noninteractive apt-get update
	sudo DEBIAN_FRONTEND=noninteractive apt-get install -y "${PACKAGES[@]}"
}

node_is_new_enough() {
	command -v node >/dev/null 2>&1 || return 1
	node -e 'const p=process.versions.node.split(".").map(Number); process.exit(p[0]>22 || (p[0]===22 && p[1]>=12) ? 0 : 1)'
}

# Electron's toolchain wants Node 22.12 or newer. Ubuntu 22 ships Node 12,
# so a private copy is unpacked under .tools/ when the one on PATH is older.
ensure_node() {
	step "Node.js"
	if node_is_new_enough; then
		echo "Using $(node -v) at $(command -v node)"
		return 0
	fi
	local dest=$root/.tools/node
	local version=v22.23.4
	mkdir -p "$root/.tools"
	if [[ -x $dest/bin/node ]]; then
		export PATH="$dest/bin:$PATH"
		hash -r
		if node_is_new_enough; then
			echo "Using $(node -v) from .tools/node"
			return 0
		fi
	fi
	local base=https://nodejs.org/dist/$version
	local name=node-$version-linux-x64.tar.xz
	# mktemp only replaces X's at the end of the name. tar does not care
	# that the file is not called .tar.xz.
	local tarball sums
	tarball=$(mktemp "$root/.tools/node-tarball.XXXXXX")
	sums=$(mktemp)
	tmp_files+=("$tarball" "$sums")
	echo "Downloading Node $version"
	curl -fL --retry 5 --retry-delay 2 -o "$sums" "$base/SHASUMS256.txt"
	curl -fL --retry 5 --retry-delay 2 -o "$tarball" "$base/$name"
	local want
	want=$(awk -v file="$name" '$2 == file {print $1}' "$sums")
	[[ -n $want ]] || die "Node published no checksum for $name"
	echo "$want  $tarball" | sha256sum -c -
	rm -rf "$dest"
	mkdir -p "$dest"
	tar -xJf "$tarball" -C "$dest" --strip-components=1
	export PATH="$dest/bin:$PATH"
	hash -r
	node_is_new_enough || die "The downloaded Node does not run."
	echo "Using $(node -v) from .tools/node"
}

manifest_field() {
	python3 -c 'import json,sys; print(json.load(open("packaging/vendor.json"))[sys.argv[1]])' "$1"
}

download_setup() {
	step "Wispr Flow"
	local url sha name dest
	url=$(manifest_field url)
	sha=$(manifest_field sha256)
	name=$(manifest_field setupName)
	dest=$root/payload/$name
	mkdir -p "$root/payload"
	if [[ -f $dest ]] && echo "$sha  $dest" | sha256sum -c --status; then
		echo "Pinned setup is already downloaded."
		return 0
	fi
	local free_kb
	free_kb=$(df -Pk "$root" | awk 'NR==2 {print $4}')
	if [[ ${free_kb:-0} -lt 4000000 ]]; then
		die "Need about 4 GB free to download and build. About ${free_kb} KB is free."
	fi
	local tmp
	tmp=$(mktemp "$root/payload/.setup.XXXXXX")
	tmp_files+=("$tmp")
	echo "Downloading the pinned Wispr Flow setup."
	curl -fL --retry 5 --retry-delay 2 -o "$tmp" "$url"
	echo "$sha  $tmp" | sha256sum -c -
	mv "$tmp" "$dest"
}

# The distro package is installed with the rest of the apt packages. This
# tree is only the fallback for a Python that still cannot import it, and
# the deb is this machine's so the extension matches that Python.
ensure_vendored_evdev() {
	# shellcheck disable=SC1091
	source "$root/helper/evdev_setup.sh"
	if shoutr_evdev_imports ""; then
		return 0
	fi
	local dest=$root/vendor/python3-dist
	local vendor=$dest/usr/lib/python3/dist-packages
	if [[ -d $vendor/evdev ]] && shoutr_evdev_imports "$vendor"; then
		return 0
	fi
	shoutr_apt_family || return 0
	step "Bundled evdev"
	local work
	work=$(mktemp -d)
	tmp_files+=("$work")
	(
		cd "$work"
		apt-get download python3-evdev
		mkdir -p "$dest"
		dpkg-deb -x python3-evdev_*.deb "$dest"
	)
	shoutr_evdev_imports "$vendor" || die "The unpacked python3-evdev does not import."
}

build_app() {
	step "JavaScript dependencies"
	npm ci --no-audit --no-fund
	if [[ ! -x node_modules/electron/dist/electron ]]; then
		node node_modules/electron/install.js
	fi
	step "Stage Electron"
	npm run stage
	step "Build sqlite"
	npm run native
	step "Repack"
	npm run repack
}

quit_if_running() {
	if pgrep -x shoutr >/dev/null 2>&1; then
		die "Quit Shoutr first, then run ./install.sh again."
	fi
}

uninstall() {
	require_user
	quit_if_running
	sudo bash "$root/packaging/install-system.sh" uninstall "$USER"
	if command -v gnome-shell >/dev/null 2>&1; then
		python3 gnome/install_window_bridge.py --remove || true
	fi
	echo "The dictation profile in ~/.config/Wispr Flow was kept."
}

install_all() {
	require_user
	require_system
	quit_if_running
	if pgrep -x wispr-flow >/dev/null 2>&1; then
		echo "wispr-flow is running. Quit it before opening Shoutr. They share one profile."
	fi
	sudo -v
	install_packages
	ensure_node
	command -v npm >/dev/null 2>&1 || die "npm is not on PATH next to node."
	download_setup
	python3 tools/extract_vendor.py
	ensure_vendored_evdev
	build_app
	step "Install into /usr"
	sudo -v
	sudo bash "$root/packaging/install-system.sh" install "$USER" "$root"
	local gnome_status=0
	if command -v gnome-shell >/dev/null 2>&1; then
		step "GNOME window bridge"
		python3 gnome/install_window_bridge.py --enable || gnome_status=$?
	else
		echo "GNOME Shell is not installed. Dictation still works. The focused app has no name."
	fi
	step "Check"
	local doctor_status=0
	/usr/bin/shoutr --doctor || doctor_status=$?
	if [[ $gnome_status -ne 0 || $doctor_status -ne 0 ]]; then
		echo
		echo "Shoutr is installed. The check above still has a failure."
		exit 1
	fi
	cat <<'EOF'

Shoutr is installed.
Open it from the app grid, or run: shoutr

Sign in with your own Wispr account. Dictation runs on Wispr's servers.
Quit the official Wispr Flow app first if it is open. They share one profile.
EOF
}

case ${1:-} in
"") install_all ;;
--doctor) exec bash "$root/packaging/doctor.sh" ;;
--uninstall) uninstall ;;
*) die "Usage: ./install.sh [--doctor | --uninstall]" ;;
esac
