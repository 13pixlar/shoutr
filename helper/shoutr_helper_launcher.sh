#!/usr/bin/env bash
# Electron spawns SHOUTR_HELPER with a stripped environment (no PATH extras).
# Bundle evdev here when the system package is not installed.
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
export PYTHONPATH="$root/vendor/python3-dist/usr/lib/python3/dist-packages${PYTHONPATH:+:$PYTHONPATH}"
exec /usr/bin/python3 "$root/helper/shoutr_helper.py" "$@"
