# Where the helper loads evdev from.
#
# The distro package matches this machine's Python. Use it when `import evdev`
# succeeds with an empty PYTHONPATH. The tree under vendor/python3-dist is a
# fallback, and only when that copy itself imports. An Ubuntu 22 build of the
# module does not load on a newer Python, so it must not be prepended first.
#
# bin/shoutr installs python3-evdev on Debian, Ubuntu, and apt derivatives
# when neither copy imports. The helper does not: Electron starts it with no
# terminal and no PATH.

shoutr_os_release_file() {
  printf '%s\n' "${SHOUTR_OS_RELEASE:-/etc/os-release}"
}

shoutr_python() {
  printf '%s\n' "${SHOUTR_PYTHON:-/usr/bin/python3}"
}

# Debian, Ubuntu, and the derivatives that install packages with apt.
shoutr_apt_family() {
  local file id like
  file=$(shoutr_os_release_file)
  [[ -r $file ]] || return 1
  id=$(. "$file" && printf '%s' "${ID:-}")
  like=$(. "$file" && printf '%s' "${ID_LIKE:-}")
  case $id in
    ubuntu | debian | linuxmint | pop | elementary | zorin | neon) return 0 ;;
  esac
  case $like in
    *debian* | *ubuntu*) return 0 ;;
  esac
  return 1
}

# pythonpath is prepended for this one process. Empty means the system module.
shoutr_evdev_imports() {
  local pythonpath=$1
  PYTHONPATH=$pythonpath "$(shoutr_python)" -c 'import evdev' >/dev/null 2>&1
}

shoutr_vendor_evdev() {
  printf '%s\n' "$1/vendor/python3-dist/usr/lib/python3/dist-packages"
}

# Set PYTHONPATH for the helper's Python, or leave it unset when the system
# module loads. Returns 1 when neither copy imports.
shoutr_export_evdev_path() {
  local root=$1
  local vendor
  vendor=$(shoutr_vendor_evdev "$root")
  if shoutr_evdev_imports ""; then
    unset PYTHONPATH
    return 0
  fi
  if [[ -d $vendor ]] && shoutr_evdev_imports "$vendor"; then
    export PYTHONPATH=$vendor
    return 0
  fi
  unset PYTHONPATH
  return 1
}

# Called from bin/shoutr, which still has a terminal. The helper process
# Electron spawns does not, so apt belongs here.
shoutr_ensure_system_evdev() {
  local root=$1
  local vendor
  vendor=$(shoutr_vendor_evdev "$root")
  if shoutr_evdev_imports ""; then
    return 0
  fi
  if [[ -d $vendor ]] && shoutr_evdev_imports "$vendor"; then
    return 0
  fi
  if ! shoutr_apt_family; then
    printf 'shoutr: python3-evdev does not import for %s\n' "$("$(shoutr_python)" -V 2>&1)" >&2
    printf 'shoutr: install the distro package that provides the evdev module.\n' >&2
    return 1
  fi
  local pretty
  pretty=$(. "$(shoutr_os_release_file)" && printf '%s' "${PRETTY_NAME:-this system}")
  printf 'shoutr: installing python3-evdev for %s\n' "$pretty" >&2
  if ! sudo apt-get install -y python3-evdev; then
    printf 'shoutr: install it with: sudo apt-get install python3-evdev\n' >&2
    return 1
  fi
  shoutr_evdev_imports ""
}
