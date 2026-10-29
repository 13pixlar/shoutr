"""Install the Shoutr menu launcher for this project tree.

Copies the embossed mark into the user icon theme and writes
~/.local/share/applications/shoutr.desktop with absolute paths so GNOME
can start bin/shoutr. Electron already calls setDesktopName("shoutr.desktop").

    python3 desktop/install_launcher.py

The profile path stays ~/.config/Wispr Flow; this only registers the shell
launcher.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

UUID = "shoutr"
TEMPLATE = Path(__file__).resolve().parent / "shoutr.desktop"
ICON_SOURCE = Path(__file__).resolve().parent.parent / "img" / "app_icon_embossed.png"
LAUNCHER = Path(__file__).resolve().parent.parent / "bin" / "shoutr"


def data_home() -> Path:
    return Path(os.environ.get("XDG_DATA_HOME") or Path.home() / ".local" / "share")


def install_icon(dest_root: Path) -> Path:
    icon_dir = dest_root / "icons" / "hicolor" / "512x512" / "apps"
    icon_dir.mkdir(parents=True, exist_ok=True)
    dest = icon_dir / f"{UUID}.png"
    shutil.copy2(ICON_SOURCE, dest)
    return dest


def install_desktop(applications_dir: Path, exec_path: Path) -> Path:
    applications_dir.mkdir(parents=True, exist_ok=True)
    text = TEMPLATE.read_text()
    if "@EXEC@" not in text:
        raise RuntimeError(f"{TEMPLATE} is missing @EXEC@ placeholder")
    body = text.replace("@EXEC@", str(exec_path))
    dest = applications_dir / f"{UUID}.desktop"
    dest.write_text(body)
    dest.chmod(0o644)
    return dest


def update_caches(data: Path) -> None:
    hicolor = data / "icons" / "hicolor"
    if hicolor.is_dir():
        try:
            subprocess.run(
                ["gtk-update-icon-cache", "-f", "-t", str(hicolor)],
                check=False,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            pass
    apps = data / "applications"
    if apps.is_dir():
        try:
            subprocess.run(
                ["update-desktop-database", str(apps)],
                check=False,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError:
            pass


def validate(desktop_file: Path) -> None:
    try:
        proc = subprocess.run(
            ["desktop-file-validate", str(desktop_file)],
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"desktop-file-validate failed: {detail}")


def main() -> int:
    if not TEMPLATE.is_file():
        print(f"shoutr: missing template {TEMPLATE}", file=sys.stderr)
        return 1
    if not ICON_SOURCE.is_file():
        print(f"shoutr: missing icon {ICON_SOURCE}", file=sys.stderr)
        return 1
    if not LAUNCHER.is_file():
        print(f"shoutr: missing launcher {LAUNCHER}", file=sys.stderr)
        return 1

    exec_path = LAUNCHER.resolve()
    if not os.access(exec_path, os.X_OK):
        print(f"shoutr: launcher is not executable ({exec_path})", file=sys.stderr)
        return 1

    data = data_home()
    icon_path = install_icon(data)
    desktop_path = install_desktop(data / "applications", exec_path)
    validate(desktop_path)
    update_caches(data)

    print(f"Installed {desktop_path}")
    print(f"Icon {icon_path}")
    print(f"Exec {exec_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
