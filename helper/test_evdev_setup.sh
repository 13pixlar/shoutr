#!/bin/bash
# The evdev choice is "system import, then a bundle that imports."
#
#   bash helper/test_evdev_setup.sh

set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
# shellcheck disable=SC1091
source "$root/helper/evdev_setup.sh"

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/python" <<'EOF'
#!/bin/bash
if [[ ${SHOUTR_FAKE_SYSTEM_EVDEV:-} == 1 && -z ${PYTHONPATH:-} ]]; then
  exit 0
fi
if [[ -n ${SHOUTR_FAKE_VENDOR_MARK:-} && ${PYTHONPATH:-} == *"$SHOUTR_FAKE_VENDOR_MARK"* ]]; then
  exit 0
fi
if [[ -n ${SHOUTR_EVDEV_INSTALLED:-} && -f $SHOUTR_EVDEV_INSTALLED && -z ${PYTHONPATH:-} ]]; then
  exit 0
fi
exit 1
EOF
chmod +x "$tmp/python"

cat > "$tmp/sudo" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >> "$SHOUTR_SUDO_LOG"
touch "$SHOUTR_EVDEV_INSTALLED"
EOF
chmod +x "$tmp/sudo"

write_os() {
  local id=$1 like=$2
  cat > "$tmp/os-release" <<EOF
ID=$id
ID_LIKE="$like"
PRETTY_NAME="Test $id"
EOF
}

assert_apt() {
  local id=$1 like=$2 expect=$3
  write_os "$id" "$like"
  SHOUTR_OS_RELEASE=$tmp/os-release
  if shoutr_apt_family; then
    [[ $expect == yes ]] || fail "$id / $like was treated as apt"
  else
    [[ $expect == no ]] || fail "$id / $like was not treated as apt"
  fi
}

assert_apt ubuntu debian yes
assert_apt debian "" yes
assert_apt pop "ubuntu debian" yes
assert_apt linuxmint ubuntu yes
assert_apt fedora "" no
assert_apt arch "" no
assert_apt opensuse-tumbleweed "suse opensuse" no
write_os linuxmint ""
# An ID we do not list still counts when ID_LIKE names Debian or Ubuntu.
cat > "$tmp/os-release" <<'EOF'
ID=custom
ID_LIKE="debian"
PRETTY_NAME="Custom"
EOF
SHOUTR_OS_RELEASE=$tmp/os-release
shoutr_apt_family || fail "ID_LIKE=debian was not treated as apt"

export SHOUTR_PYTHON=$tmp/python
vendor_root=$tmp/app
vendor=$vendor_root/vendor/python3-dist/usr/lib/python3/dist-packages/evdev
mkdir -p "$vendor"
export SHOUTR_FAKE_VENDOR_MARK=$vendor_root/vendor

# System module wins, and the bundle is not put on the path.
export SHOUTR_FAKE_SYSTEM_EVDEV=1
(
  unset PYTHONPATH
  shoutr_export_evdev_path "$vendor_root" || fail "system import should succeed"
  [[ -z ${PYTHONPATH:-} ]] || fail "system import still set PYTHONPATH=$PYTHONPATH"
)
unset SHOUTR_FAKE_SYSTEM_EVDEV

# Bundle is used only when it imports and the system module does not.
(
  unset PYTHONPATH
  shoutr_export_evdev_path "$vendor_root" || fail "vendor import should succeed"
  [[ ${PYTHONPATH:-} == "$vendor_root/vendor/python3-dist/usr/lib/python3/dist-packages" ]] \
    || fail "vendor path was ${PYTHONPATH:-empty}"
)

# A bundle that does not import is not prepended.
export SHOUTR_FAKE_VENDOR_MARK=nothing-matches
(
  unset PYTHONPATH
  if shoutr_export_evdev_path "$vendor_root"; then
    fail "both imports failed and export returned success"
  fi
  [[ -z ${PYTHONPATH:-} ]] || fail "failed import left PYTHONPATH=$PYTHONPATH"
)
unset SHOUTR_FAKE_VENDOR_MARK

# apt family installs the package. Another distro does not call sudo.
export PATH="$tmp:$PATH"
export SHOUTR_SUDO_LOG=$tmp/sudo.log
export SHOUTR_EVDEV_INSTALLED=$tmp/installed
write_os ubuntu ""
(
  unset PYTHONPATH
  shoutr_ensure_system_evdev "$vendor_root" || fail "apt install path should succeed"
)
[[ -f $SHOUTR_SUDO_LOG ]] || fail "sudo was not called"
grep -q 'apt-get install -y python3-evdev' "$SHOUTR_SUDO_LOG" || fail "sudo args were $(cat "$SHOUTR_SUDO_LOG")"

rm -f "$SHOUTR_SUDO_LOG" "$SHOUTR_EVDEV_INSTALLED"
write_os fedora ""
(
  unset PYTHONPATH
  if shoutr_ensure_system_evdev "$vendor_root"; then
    fail "Fedora should not pretend the package was installed"
  fi
)
[[ ! -f $SHOUTR_SUDO_LOG ]] || fail "Fedora called sudo"

# A working bundle means no install, including on Fedora.
export SHOUTR_FAKE_VENDOR_MARK=$vendor_root/vendor
write_os fedora ""
rm -f "$SHOUTR_SUDO_LOG"
(
  unset PYTHONPATH
  shoutr_ensure_system_evdev "$vendor_root" || fail "vendor fallback should satisfy Fedora"
)
[[ ! -f $SHOUTR_SUDO_LOG ]] || fail "vendor fallback still called sudo"

printf 'ok\n'
