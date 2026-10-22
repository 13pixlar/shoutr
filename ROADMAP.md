# Wispr Flow reverse-engineering roadmap

Personal learning notes for the local sandbox. This records what static analysis has established, where each claim came from, and what to study next. Nothing in this pass was executed.

Date of the investigation: 22 October 2026.

## How to read the claims

- **Observed.** A tool returned this from the file bytes, a manifest, or a decompiler listing.
- **Inferred.** A reasonable reading of those observations. It is not something the tools measured directly.
- **Unknown.** Looked for, and not established. An empty search is not proof of absence when the tool says its inventory is incomplete.

Decompiler text is Ghidra pseudocode. It is not the original C# or JavaScript.

## Goal

Learn how the Wispr Flow Windows distribution is put together, then study the desktop application itself. The stub in the project root is only the downloader. The application to study is Wispr Flow 1.6.1209, the Electron app inside the setup package.

## Artifacts on this machine

| Role | Path | Identity |
| --- | --- | --- |
| Downloader stub | `WisprFlowInstaller.exe` | SHA-256 `f7e114a361af2d6efad2b660e7d13cb7cf7163fbfec168784781954eeca4a8ee`, 6,176,632 bytes |
| Manifest we fetched | `payload/latest.json` | `https://dl.wisprflow.com/wispr-flow/win32/latest.json` |
| Setup named by that manifest | `payload/Wispr Flow Setup-v1.6.1209.exe` | SHA-256 `e8f2796f40dad6de1b1d274da5d877a8d992d8b62132c4b3be54e3522564f5b8`, 333,073,272 bytes. Matches the manifest. |
| Package extracted from the setup | `payload/WisprFlow-1.6.1209-full.nupkg` | SHA-256 `f429ca871d74ed03625526dd4194217ebbfeee73dea9970404c2321d687c9a82`, 332,005,056 bytes. CRC-32 `0xc3a091ef`, matching the zip local header. |
| Application archive | `payload/app/lib/net45/resources/app.asar` | 136,165,471 bytes. `package.json` name `wispr-flow`, version `1.6.1209`. |
| Native addons the archive loads | `payload/app/lib/net45/resources/app.asar.unpacked/` | About 8 MB extracted. |
| Package identity | `payload/app/WisprFlow.nuspec` | id `WisprFlow`, version `1.6.1209`, title Wispr Flow |

The large vendor files stay untracked. Hashes above are the record of which bytes were inspected.

Fallback manifest, fetched and not downloaded: `https://dl.wisprflow.com/wispr-flow/win32/last-known-good.json` names `Wispr Flow Setup-v1.6.531.exe`, SHA-256 `4d19fa3456a834a0fff86ca5368e893d54fe934bc7336795ec8ac28ccd10215e`, size 354,514,304.

## Sources

### Stub analysis

REA opened the stub as a PE32+ x64 executable and analyzed it with Ghidra 12.1.4. The session was closed after the investigation. The PDB named in the binary, `WisprFlowInstaller.pdb` (GUID `ac511740-5028-4737-ad20-d01c7612deae`, age 1), was not present, so procedure names are Ghidra labels.

| Evidence | What it supports |
| --- | --- |
| `ev_1577e2ff098c9f4d3e26ad8521256a96d9f573418b25bdb87f8c3e6adb924118` | Image base `0x140000000`, 18,980 procedures, 6,783 defined strings, section layout |
| `ev_39f7a5de7c24973a7e5fb75758e852bfa3937c6c0c49aa2e67d03f716451e961` | Resource tree: icons, version info, manifest. 13 resources, coverage complete |
| `ev_35a1b06a53314df50713b8f325c3ec10501939cc0457808628dcd6f553979d75` | Version-resource bytes. File version `1.0.0.0`, product version `1.0.0+c773b475f60bbf93915cef94f70a71b7c25f78c8`, original filename `WisprFlowInstaller.dll` |
| `ev_9412002ac74976e3df4b10963858cff1ba5c237a780eb9c3a68514e156f41721` | Product strings and the embedded application manifest |
| `ev_0e1e566514ce466ca59c215cf0f8da80ff3f74835a5d76b283d0a252c30ed675` | No CLI metadata directory. Parent record `ev_38b303504deb109c5fbf7471d23d0bfe9fe2fd8f116c8dbf56e7bb77fdd7e3ea` |
| `ev_227185d47cd3324c57311c20a3ad9c63e274c955f1ffe21876159b1592169e43` | No Rust `.dep-v0` section and no `/rustc/` path |
| `ev_f0a9926a21814d78d7b63075a9adca62e103ea77f7c3de6fb052bbf2ed83ae90` | No Go build-info record |
| `ev_6ed4714d10a1e5dad1ebb4c704389f3c556c106849393a9e1699066ef7bcf8fd` | HTTPS URLs, including the two manifest URLs and the NativeAOT compatibility messages |
| `ev_5ebd9044860d37d2f8f45db1ebc7ed722e1d65d474661ed8963c9eb970f12813` | Payload, manifest, SHA-256, and signature failure strings |
| `ev_24a6589de548175bdcbcce423ce6f09f4907533d8b9e70e7efa056f0443b285a` | Entry point `0x1402f8614` |
| `ev_9b5a94423c50ee5b287066cfe393aa066f1e68992c4b1732d2f40303eb24069b` | State machine `FUN_1401e5370` that tries `latest.json`, then `last-known-good.json` |
| `ev_fa9457decda0f8853f534496811dbde0d4472a40bbf89a0917a89fab93981e95` | `FUN_1401e4f10`, which passes the constant `150000000` onward |
| `ev_85ec1bb7b4a7dd6ba244e85b63882381a299b1ddf8eba9ae4ef6ca03b242266f` | `FUN_1401e3120`, which builds the PostHog capture request |

String searches that supplied user-facing text and event names are `ev_9412002ac74976e3`, `ev_5ebd9044860d37d2`, `ev_6ed4714d10a1e5da`, and `ev_6aaadd144baf4380`. Import names came from a procedure search over `*.DLL::` symbols. Ghidra's defined-string inventory can miss packed or undefined text, so those searches are complete only for that inventory.

### Setup and application

The setup was downloaded from the URL in `latest.json` and checked with `sha256sum` against that manifest. The embedded nupkg was inflated with zlib (zip method 8, raw deflate) from the local header at file offset `0x110e90`. Its CRC-32 matches that header. `app.asar` and `app.asar.unpacked` were extracted from the nupkg with Python's `zipfile`. The asar header was parsed only far enough to read `package.json`.

## Findings

### The stub is a NativeAOT downloader

Observed. The file is a 64-bit PE application, image base `0x140000000`, with `.text`, `.rdata`, `.data`, `.pdata`, `.rsrc`, and `.reloc`. It has no CLI header, so it is not a managed assembly with CIL metadata. Frozen strings include `System.Text.Json` and the runtime text that links to `https://aka.ms/nativeaot-compatibility`. String objects use the .NET layout seen in memory: method table, 32-bit character length, UTF-16 data. The method table for those strings is `0x1403c0280`.

Inferred. This is a .NET NativeAOT publish. The missing CLI directory, the NativeAOT runtime strings, and the string-object layout support that together. It is not established by a NativeAOT metadata parser recovering method names.

The entry point is an 18-byte stub at `0x1402f8614`. It calls `FUN_1402f8f68` and jumps to `FUN_1402f8498`.

The embedded manifest requests Common Controls 6, per-monitor DPI awareness, Windows 10/11, and `asInvoker`. Its comment says this is a per-user Squirrel install and should not ask for elevation. A separate frozen string says "Wispr AI, Inc."

Static imports that matter for behavior: `WS2_32` (Winsock), `CRYPT32`, `NCRYPT`, `BCRYPT`, and `KERNEL32!CreateProcessW`. `USER32.dll` and `COMCTL32.dll` appear as strings and are not in the static import table, so the splash UI is loaded by name. There is no static import of WinHTTP or WinINet.

### It downloads one setup, then launches it

Observed. Initializer `FUN_1401df0f0` stores three strings and the integer `150000000`:

- `dl.wisprflow.com`
- `https://dl.wisprflow.com/wispr-flow/win32/latest.json` at object `0x14052e050`
- `https://dl.wisprflow.com/wispr-flow/win32/last-known-good.json` at object `0x14052dfb8`

`FUN_1401e5370` calls one fetch helper with the `latest.json` slot first. If that result object is null, it calls the same helper with the last-known-good slot. The failure string "could not resolve a payload from either manifest." is in the binary.

The fetched manifest is small JSON, schema version 1, with one x64 URL, SHA-256, and size. The file we downloaded matches that hash. Inside it, one deflated zip member is named `WisprFlow-1.6.1209-full.nupkg`. The package is a Squirrel layout: `lib/net45/` holds the Electron tree, `squirrel.exe`, and `Wispr Flow.exe` (235,431,800 bytes, still inside the nupkg).

Failure strings that describe the stub's checks, before it will start the downloaded file:

- `Payload SHA-256 does not match the manifest.`
- `Payload signature rejected:`
- `Payload exceeded the `
- `Manifest exceeded the size cap.`
- `Failed to launch the verified payload:`
- `The installer downloaded but wouldn't start.`

Certificate-related imports include `CryptQueryObject`, `CertGetCertificateChain`, and `CertVerifyCertificateChainPolicy`. Method-name fragments include `VerifyEmbeddedSignature` and `RunWinVerifyTrust`. Launch strings include .NET `ProcessStartInfo`, and `CreateProcessW` is imported. The downloaded file name prefix in the stub is `WisprFlowSetup-`.

Other observed strings: mutex `Global\WisprFlowInstaller`, splash class `WisprFlowInstaller.Splash`, and "Another Wispr Flow installer is already running."

Inferred. The integer `150000000` is a plausible 15-second .NET `TimeSpan` (150,000,000 ticks). `FUN_1401e4f10` passes it to `FUN_1400ea960`, which converts a value through a double and requires the result to fit in a 32-bit range. The division that would turn ticks into milliseconds was not recovered, so the timeout reading stays an inference.

Inferred. The manifest comment is the source for "Squirrel". The package layout confirms a Squirrel nupkg. The stub itself was not shown calling a Squirrel API by name.

Unknown. The exact JSON fields the stub reads besides the URL and hash. `fileName` and `sha256` exist in the string pool. No `.nupkg` string was in the defined-string inventory. The order of the SHA-256 compare versus `WinVerifyTrust` was not recovered as one function.

### The stub can report to PostHog

Observed. `FUN_1401e3120` builds a request whose content type is `application/json` and whose URL object is `https://us.i.posthog.com/capture/`. Strings attached in that function include `wispr-flow-installer`, `windows_installer_stub`, `x64`, and a 47-character project token that starts with `phc_`. The token is not copied into this document. Other names in the string pool: `download_failed`, `integrity_failed`, `launch_failed`, `verification_failed`, `manifest_source`, `stub_version`. The same function passes the constant `50000000` into the request setup.

Unknown. Whether a running stub actually sends the request. This pass did not execute it. The meaning of `50000000` was not recovered. Five seconds of .NET ticks is one possible reading.

### The application is Electron

Observed. `package.json` in `app.asar`:

- name `wispr-flow`
- version `1.6.1209`
- product name Wispr Flow
- description "Voice-typing made perfect"
- main `.webpack/main`
- author Wispr Flow, `support@wisprflow.ai`, `https://wisprflow.ai`

The asar root contains `.webpack`, `node_modules`, and `package.json`. Dependencies named in that file include `@supabase/supabase-js`, `@sentry/electron`, `@workos-inc/node`, `electron-squirrel-startup`, `electron-store`, and `@gnaudio/jabra-js`. Those names say which libraries were bundled. They do not, by themselves, say which code paths run.

The unpacked tree next to the asar contains native modules, including `node_sqlite3.node` and a Jabra device connector. The nupkg also contains `lib/net45/resources/Release/Wispr Flow Helper.exe` (20,428,664 bytes), which has not been opened.

## Roadmap

Work stays static unless a later note says a binary was run. Prefer the asar and unpacked natives over the Chromium shell in `Wispr Flow.exe`.

1. **Stub behavior.** Done. Identity, download URLs, fallback, signature and hash checks, launch, and the PostHog request are documented above.
2. **Obtain the app.** Done for 1.6.1209. The last-known-good setup, 1.6.531, is identified and not downloaded.
3. **Map the Electron app.** Next. Open `app.asar` with a JavaScript application analysis, summary first, and record the main-process entry `.webpack/main`, the renderer entry, and the module graph. Keep the asar SHA-256 with that evidence.
4. **Separate the app from the shell.** Trace startup from `.webpack/main` through window creation, the helper executable, and `electron-squirrel-startup`. Confirm what `Wispr Flow.exe` is (expected: the Electron host) without treating the host as application logic.
5. **Follow one user-facing feature end to end.** Pick dictation or the update check. Trace it from the UI entry, through the main process, to the filesystem and network calls the bundle actually contains. Record endpoints and data files that the code names.
6. **Account and storage.** Read how Supabase, WorkOS, electron-store, and sqlite are referenced. List local paths and tables the code creates. Do not collect live credentials.
7. **Native addons.** Inventory `app.asar.unpacked` and decide which binaries are application code rather than third-party device libraries. Open only the ones the chosen feature calls.
8. **Compare builds only if a behavior is unclear.** Download 1.6.531 from the last-known-good manifest and compare the asar graphs. Until then, one version is enough.

## Out of scope

- Running the stub, the setup, or `Wispr Flow.exe`.
- Bypassing the stub's hash or signature checks.
- Using the embedded analytics token.
- Publishing these notes or the extracted files.
