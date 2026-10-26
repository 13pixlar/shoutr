"""Pull the pinned Wispr application out of the Windows setup.

Wispr ships one Windows setup executable. The file we need is a zip member
named WisprFlow-<version>-full.nupkg, stored inside that executable as a
deflated local-file header (the Squirrel layout). This reads that member,
checks it against packaging/vendor.json, and writes the two trees the
repack step already uses:

    payload/WisprFlow-<version>-full.nupkg
    payload/app/lib/net45/resources/app.asar
    payload/app/lib/net45/resources/app.asar.unpacked/

The Windows helper and Wispr Flow.exe stay inside the nupkg. Repack reads
migrations and icons from the nupkg and does not need those executables
unpacked.

    python3 tools/extract_vendor.py
    python3 tools/extract_vendor.py --check
    python3 tools/extract_vendor.py --force
"""

import argparse
import hashlib
import io
import json
import mmap
import os
import shutil
import struct
import sys
import zipfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "packaging" / "vendor.json"
PAYLOAD = ROOT / "payload"
RESOURCE_PREFIX = "lib/net45/resources/"
LOCAL_HEADER = struct.Struct("<4sHHHHHIIIHH")


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest():
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def unsafe_zip_name(name):
    if name.startswith("/") or "\\" in name:
        return True
    return ".." in Path(name).parts


def wanted(name):
    if name == RESOURCE_PREFIX + "app.asar":
        return True
    return name.startswith(RESOURCE_PREFIX + "app.asar.unpacked/")


def find_nupkg(blob):
    """Return (member name, uncompressed nupkg bytes) from a setup image.

    blob is anything that supports len, find, and slicing. A real setup is
    passed as an mmap so the 300 MB file is not copied up front. Other zip
    headers in the executable are skipped. The first member whose name ends
    in -full.nupkg and whose CRC matches is the package.
    """
    start = 0
    limit = len(blob)
    while start < limit:
        offset = blob.find(b"PK\x03\x04", start)
        if offset < 0 or offset + LOCAL_HEADER.size > limit:
            break
        start = offset + 4
        (
            _signature,
            _version,
            flag,
            method,
            _time,
            _date,
            crc,
            compressed_size,
            uncompressed_size,
            name_length,
            extra_length,
        ) = LOCAL_HEADER.unpack_from(blob, offset)
        name_at = offset + LOCAL_HEADER.size
        data_at = name_at + name_length + extra_length
        if data_at > limit:
            continue
        try:
            name = bytes(blob[name_at : name_at + name_length]).decode("utf-8")
        except UnicodeDecodeError:
            continue
        if not name.endswith("-full.nupkg"):
            continue
        if flag & 0x1:
            raise RuntimeError(f"{name} is encrypted")
        if flag & 0x8 or compressed_size == 0 or uncompressed_size == 0:
            raise RuntimeError(f"{name} has no sizes in its local header")
        if data_at + compressed_size > limit:
            raise RuntimeError(f"{name} extends past the end of the setup")
        raw = bytes(blob[data_at : data_at + compressed_size])
        if method == 0:
            body = raw
        elif method == 8:
            body = zlib.decompress(raw, wbits=-15)
        else:
            raise RuntimeError(f"{name} uses zip method {method}")
        if len(body) != uncompressed_size:
            raise RuntimeError(
                f"{name} uncompressed to {len(body)} bytes, header says {uncompressed_size}"
            )
        actual = zlib.crc32(body) & 0xFFFFFFFF
        if actual != crc:
            raise RuntimeError(f"{name} CRC is {actual:#x}, header says {crc:#x}")
        return name, body
    raise RuntimeError("the setup has no embedded WisprFlow full nupkg")


def asar_sha256(nupkg_bytes):
    with zipfile.ZipFile(io.BytesIO(nupkg_bytes)) as archive:
        info = archive.getinfo(RESOURCE_PREFIX + "app.asar")
        digest = hashlib.sha256()
        with archive.open(info) as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()


def extract_members(nupkg_bytes, dest):
    """Write app.asar and app.asar.unpacked under dest. Return the file count."""
    count = 0
    with zipfile.ZipFile(io.BytesIO(nupkg_bytes)) as archive:
        for info in archive.infolist():
            name = info.filename
            if name.endswith("/") or not wanted(name):
                continue
            if unsafe_zip_name(name):
                raise RuntimeError(f"unsafe path in package: {name}")
            target = dest / name
            if not target.resolve().is_relative_to(dest.resolve()):
                raise RuntimeError(f"unsafe path in package: {name}")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as src, open(target, "wb") as dst:
                shutil.copyfileobj(src, dst)
            mode = (info.external_attr >> 16) & 0o777
            if mode:
                os.chmod(target, mode)
            count += 1
    asar = dest / RESOURCE_PREFIX / "app.asar"
    if not asar.is_file():
        raise RuntimeError("the package has no app.asar")
    return count


def already_extracted(manifest):
    nupkg = PAYLOAD / manifest["nupkgName"]
    asar = PAYLOAD / "app" / RESOURCE_PREFIX / "app.asar"
    unpacked = PAYLOAD / "app" / RESOURCE_PREFIX / "app.asar.unpacked"
    if not nupkg.is_file() or not asar.is_file() or not unpacked.is_dir():
        return False
    if sha256_file(nupkg) != manifest["nupkgSha256"]:
        return False
    return sha256_file(asar) == manifest["asarSha256"]


def read_nupkg(setup, manifest):
    print(f"Reading {setup.name}", file=sys.stderr)
    with setup.open("rb") as handle:
        blob = mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ)
        try:
            name, body = find_nupkg(blob)
        finally:
            blob.close()
    if name != manifest["nupkgName"]:
        raise RuntimeError(f"embedded {name}, pinned name is {manifest['nupkgName']}")
    digest = hashlib.sha256(body).hexdigest()
    if digest != manifest["nupkgSha256"]:
        raise RuntimeError(f"nupkg hash is {digest}, pinned hash is {manifest['nupkgSha256']}")
    asar_digest = asar_sha256(body)
    if asar_digest != manifest["asarSha256"]:
        raise RuntimeError(
            f"app.asar hash is {asar_digest}, pinned hash is {manifest['asarSha256']}"
        )
    return name, body


def write_tree(name, body):
    partial = PAYLOAD / f"{name}.partial"
    staging = PAYLOAD / "app.tmp"
    app_dir = PAYLOAD / "app"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    try:
        partial.write_bytes(body)
        count = extract_members(body, staging)
        if app_dir.exists():
            shutil.rmtree(app_dir)
        staging.rename(app_dir)
        partial.replace(PAYLOAD / name)
    except Exception:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
        partial.unlink(missing_ok=True)
        raise
    print(f"Extracted {name} and {count} application files", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify the pinned hashes and do not write files",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="extract again even when the pinned archive is already on disk",
    )
    args = parser.parse_args()
    manifest = load_manifest()
    setup = PAYLOAD / manifest["setupName"]
    if not setup.is_file():
        raise SystemExit(f"Missing {setup}. Run ./install.sh")
    got = sha256_file(setup)
    if got != manifest["sha256"]:
        raise SystemExit(f"Setup hash is {got}, pinned hash is {manifest['sha256']}")
    if args.check:
        read_nupkg(setup, manifest)
        print(f"Pinned Wispr Flow {manifest['version']} matches.")
        return 0
    if args.force or not already_extracted(manifest):
        name, body = read_nupkg(setup, manifest)
        write_tree(name, body)
    else:
        print(f"Pinned Wispr Flow {manifest['version']} is already extracted.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, RuntimeError, zipfile.BadZipFile, KeyError) as error:
        raise SystemExit(str(error)) from None
