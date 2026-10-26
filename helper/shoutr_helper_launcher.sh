#!/bin/bash
# Electron spawns this file with an environment that has no PATH.
# /usr/bin/env would have to search PATH for bash, so the shebang is absolute.
# evdev comes from the distro package when that import works, and from
# vendor/python3-dist only when the bundled copy itself imports.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
# shellcheck disable=SC1091
source "$root/helper/evdev_setup.sh"
if ! shoutr_export_evdev_path "$root"; then
  printf 'shoutr: python3-evdev does not import for %s\n' "$(/usr/bin/python3 -V 2>&1)" >&2
  if shoutr_apt_family; then
    printf 'shoutr: start Shoutr from a terminal so it can install the package,\n' >&2
    printf 'shoutr: or run: sudo apt-get install python3-evdev\n' >&2
  else
    printf 'shoutr: install the distro package that provides the evdev module.\n' >&2
  fi
  exit 1
fi
exec /usr/bin/python3 "$root/helper/shoutr_helper.py" "$@"
