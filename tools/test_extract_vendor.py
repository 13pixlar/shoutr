"""The setup extractor finds one nupkg and ignores the rest of the executable.

    python3 tools/test_extract_vendor.py
"""

import io
import struct
import sys
import tempfile
import unittest
import zipfile
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import extract_vendor


def local_file(name, payload, method=0):
    name_bytes = name.encode("utf-8")
    if method == 0:
        stored = payload
    elif method == 8:
        compressor = zlib.compressobj(wbits=-15)
        stored = compressor.compress(payload) + compressor.flush()
    else:
        raise AssertionError(method)
    header = struct.pack(
        "<4sHHHHHIIIHH",
        b"PK\x03\x04",
        20,
        0,
        method,
        0,
        0,
        zlib.crc32(payload) & 0xFFFFFFFF,
        len(stored),
        len(payload),
        len(name_bytes),
        0,
    )
    return header + name_bytes + stored


def sample_nupkg():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("lib/net45/resources/app.asar", b"asar-bytes")
        archive.writestr("lib/net45/resources/app.asar.unpacked/demo.txt", b"hi")
        archive.writestr("lib/net45/Wispr Flow.exe", b"not-extracted")
    return buffer.getvalue()


class ExtractVendorTest(unittest.TestCase):
    def test_skips_unrelated_zip_headers_and_inflates_the_nupkg(self):
        nupkg = sample_nupkg()
        blob = (
            b"MZ-not-a-zip"
            + local_file("readme.txt", b"hello")
            + local_file("WisprFlow-1.6.1209-full.nupkg", nupkg, method=8)
            + b"PK\x03\x04 trailer"
        )
        name, body = extract_vendor.find_nupkg(blob)
        self.assertEqual(name, "WisprFlow-1.6.1209-full.nupkg")
        self.assertEqual(body, nupkg)

    def test_extracts_the_archive_and_leaves_the_windows_executable(self):
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            count = extract_vendor.extract_members(sample_nupkg(), dest)
            self.assertEqual(count, 2)
            self.assertEqual(
                (dest / "lib/net45/resources/app.asar").read_bytes(),
                b"asar-bytes",
            )
            self.assertEqual(
                (dest / "lib/net45/resources/app.asar.unpacked/demo.txt").read_bytes(),
                b"hi",
            )
            self.assertFalse((dest / "lib/net45/Wispr Flow.exe").exists())

    def test_rejects_a_path_that_would_leave_the_destination(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("lib/net45/resources/app.asar", b"asar")
            archive.writestr("lib/net45/resources/app.asar.unpacked/../../etc/passwd", b"no")
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(RuntimeError):
                extract_vendor.extract_members(buffer.getvalue(), Path(tmp))

    def test_manifest_names_the_build_the_patches_were_written_for(self):
        manifest = extract_vendor.load_manifest()
        self.assertEqual(manifest["version"], "1.6.1209")
        self.assertEqual(len(manifest["sha256"]), 64)
        self.assertEqual(len(manifest["nupkgSha256"]), 64)
        self.assertEqual(len(manifest["asarSha256"]), 64)
        self.assertTrue(manifest["setupName"].endswith(".exe"))
        self.assertTrue(manifest["nupkgName"].endswith("-full.nupkg"))


if __name__ == "__main__":
    unittest.main()
