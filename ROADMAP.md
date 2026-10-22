# Wispr Flow reverse-engineering roadmap

Personal learning notes for the local sandbox. This records what static analysis has established, where each claim came from, and what to study next. Up to this revision nothing from the vendor package has been executed.

Date of the investigation: 22 October 2026. Revised the same day when the mission became a Linux port.

## How to read the claims

- **Observed.** A tool returned this from the file bytes, a manifest, or a decompiler listing.
- **Inferred.** A reasonable reading of those observations. It is not something the tools measured directly.
- **Unknown.** Looked for, and not established. An empty search is not proof of absence when the tool says its inventory is incomplete.

Decompiler text is Ghidra pseudocode. It is not the original C# or JavaScript.

## Goal

Make Wispr Flow 1.6.1209 run on this Linux machine, and learn its codebase well enough to change it. Wispr ships macOS and Windows builds only. The application is the Electron app inside the Windows setup package. The stub in the project root is only the downloader.

The port is for personal use on this machine, signed in with our own Wispr account. Dictation still runs on Wispr's servers under that account.

Target machine: Ubuntu 22.04.5, GNOME on Wayland (XWayland on `:0`). The user is in the `input` group. `ydotool`, `wl-copy`, `xclip`, and Python `evdev` are installed. `ydotoold` was not running when checked.

## Artifacts on this machine

| Role | Path | Identity |
| --- | --- | --- |
| Downloader stub | `WisprFlowInstaller.exe` | SHA-256 `f7e114a361af2d6efad2b660e7d13cb7cf7163fbfec168784781954eeca4a8ee`, 6,176,632 bytes |
| Manifest we fetched | `payload/latest.json` | `https://dl.wisprflow.com/wispr-flow/win32/latest.json` |
| Setup named by that manifest | `payload/Wispr Flow Setup-v1.6.1209.exe` | SHA-256 `e8f2796f40dad6de1b1d274da5d877a8d992d8b62132c4b3be54e3522564f5b8`, 333,073,272 bytes. Matches the manifest. |
| Package extracted from the setup | `payload/WisprFlow-1.6.1209-full.nupkg` | SHA-256 `f429ca871d74ed03625526dd4194217ebbfeee73dea9970404c2321d687c9a82`, 332,005,056 bytes. CRC-32 `0xc3a091ef`, matching the zip local header. |
| Application archive | `payload/app/lib/net45/resources/app.asar` | SHA-256 `b814349545384185c78db695a2c4d0bc5fd9b3db7743a6ea61c64a7ab90224b3`, 136,165,471 bytes. `package.json` name `wispr-flow`, version `1.6.1209`. |
| Main-process bundle, extracted | `work/asar/.webpack/main/index.js` | SHA-256 `e3cba756b4d6d2eb0319344e29f62bf1de7cd55cde49529780b8df5d72a4c2a8`, 9,991,241 bytes |
| `package.json`, extracted | `work/asar/package.json` | SHA-256 `d1cd9a5fc0691a221dbd185a3ab0f18c490b86aa1173ed12a96fb0835af52371` |
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

The setup was downloaded from the URL in `latest.json` and checked with `sha256sum` against that manifest. The embedded nupkg was inflated with zlib (zip method 8, raw deflate) from the local header at file offset `0x110e90`. Its CRC-32 matches that header. `app.asar` and `app.asar.unpacked` were extracted from the nupkg with Python's `zipfile`.

Second pass. The full asar header was parsed with Python (16-byte pickle prefix, then JSON), and four files were copied out to `work/asar/`: `package.json`, `.webpack/main/index.js`, `.webpack/main/native_modules/daemon.js`, and `.webpack/main/agentToolBridge.js`. The main bundle was read by locating webpack module bodies by ID (for example `8460(e,t,n){`) and matching braces. Minified names below, such as `tD` or `$e`, are webpack's and change between builds. `file` and `strings` were run on the unpacked native files. Byte counts of names such as `getUserMedia` and URL lists came from `grep -a` over the raw asar.

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

The asar root contains `.webpack`, an empty `node_modules`, and `package.json`. Dependencies named in that file include `@supabase/supabase-js`, `@sentry/electron`, `@workos-inc/node`, `electron-squirrel-startup`, `electron-store`, and `@gnaudio/jabra-js`. Those names say which libraries were bundled. They do not, by themselves, say which code paths run.

The unpacked tree next to the asar contains native modules, including `node_sqlite3.node` and a Jabra device connector. The nupkg also contains `lib/net45/resources/Release/Wispr Flow Helper.exe` (20,428,664 bytes), which has not been opened.

### Build tooling and Electron version

Observed. `devDependencies` pins `electron` `42.11.2` and uses Electron Forge 7.11.2 with webpack. Forge makers for `deb` and `rpm` are listed next to `dmg`, `squirrel`, `wix`, and `zip`. No Linux build was found on `dl.wisprflow.com` in this investigation, and none was looked for beyond the win32 manifests.

Observed. The asar has no `node_modules` contents. Dependencies are bundled by webpack into `.webpack/main/index.js` (main process, about 10 MB) and numbered chunks under `.webpack/renderer/`. Named renderer entries include `hub`, `overlay`, `status`, `scratchpad`, `contextMenu`, `meeting_recorder`, `meeting_ax_inspector`, `feature_tour`, and `accessibility_drop`.

### Most OS work happens in a separate native helper

Observed. `package.json` scripts generate one helper IPC contract (`src/api/helper/schema.json`) into TypeScript, Swift (`swift-helper-app/`), and C# (`windows-helper-app/`) with quicktype. The macOS helper is a Swift app. The Windows helper is the `Wispr Flow Helper.exe` above. One script mentions `publish-aot.cmd`, so it is built with .NET NativeAOT like the stub.

Observed. The helper-path function, export `j` of webpack module `20844`, returns the Swift app when `tD` is true, and otherwise returns a Windows path (`<resources>\Release\Wispr Flow Helper.exe`). `tD` is `process.platform === "darwin"` (module `81609`). There is no Linux branch.

Observed. Module `8460` spawns the helper with `child_process.spawn(path, {stdio: ["pipe","pipe","pipe","pipe"], env})`. The environment carries the Sentry DSN, environment name, Segment and PostHog keys, and a logging flag. Electron writes requests to the helper's stdin. The helper writes its messages to **fd 3**. Its stdout is logged as "non-IPC" noise, and stderr is logged as errors. After spawn, Electron polls `checkIfHelperServiceIsReady` up to six times (1 s, then 10 s each). It restarts the helper with backoff `0, 1, 2, 4, 8, 16` seconds and then shows a persistent failure notification. A log line in the same module says global shortcuts and dictation will not work without the helper.

Observed. Message framing, from `escapeMessage` and `pushData`: each message is one JSON object, either `{"HelperAPIRequest": {...}}` or `{"HelperAPIResponse": {...}}`. `+` is escaped as `+1` and `|` as `+2`, and messages are separated by `|`. Messages over 100,000 characters are refused. The message kind is the first key of the inner object that is not metadata (`uuid`, `sentryTrace`, `sentryBaggage`). Requests are matched to responses by `uuid`.

Observed. The quicktype type map in the main bundle (`const U={HelperAPI:...}`) lists 100 request kinds and 28 response kinds, plus metadata keys. Requests go both ways (see the next paragraph for which way). Response kinds include `ACK`, `HelperAPIError`, `AccessibilityStatus`, `ActiveAppInfo`, `TextBoxInfo`, and `TapState`. The map also holds every field type, so it can be exported as a complete schema.

Observed. Electron's `HelperAPIClient` registers handlers for 45 of the 100 request kinds, in a `Map` referenced as `static handlers`. Those are the requests the helper sends, including `KeypressEvent` (`eventType`, `index`, integer `key`, optional `inputType`), `TextBoxInfo`, `AppContextUpdate`, and `PasteOutcome`. Electron sends the other 55, including `IsReady`, `DictationStart`, `DictationStop`, `PasteText` (`pasteId`, `text`, optional `htmlText`), `UpdateShortcuts`, `GetActiveAppInfo`, `GetAccessibilityStatus`, `SimulateKeyPress`, and `HelperAppShutdown`. `DictationStop` and `UpdateShortcuts` carry no payload, only `true`.

The full split, from the handler table:

- **Helper → Electron (45):** AccessibilityTreeHTML, AppContextHTML, AppContextUpdate, AppInfoUpdate, AudioCodecChanged, AudioInterruptionEvent, BLEAudioData, BLEConnectionState, BLEControl, BlePairResult, ClipboardChanged, ConsentChatMessageOutcome, CursorContextUpdate, DictatedTextVerification, DockInfoUpdate, FloatingWebPanelEvent, FocusModeBlocked, GetDictatedTextPosition, GoogleMeetAudioDeviceChanged, GoogleMeetMicrophoneMuteChanged, HardwareInfoUpdate, HolderClickObserved, InputEvent, IsMediaPlayingUpdate, KeypressEvent, MeetingSpeakerChange, MeetingSpeakerSourceReport, MeetingWindowBindReport, MicrophoneHoldersChanged, NativeCallSnapshotCompleted, NativeDropWitnessReport, PasteAnalytics, PasteBlocked, PasteOutcome, PlayDictationStartSound, PlayDictationStopSound, SecureInputStatus, SuggestSelectTextbox, TabStripRowChanged, TapRecoveryEvent, TeamsMeetingAudioChanged, TextBoxInfo, TrackAnalyticsEvent, UpdateEditedText, ZoomMeetingAudioChanged.
- **Electron → helper (55):** ActivateRunningApp, BleSetPairedDevice, BleStartPairing, BrowserLeaveProof, CancelConsentChatMessage, CancelPaste, CheckStaleKeys, DictationStart, DictationStop, EvaluateFloatingWebPanelJS, FireHaptic, FocusStoredAppAndElement, GetAccessibilityStatus, GetActiveAppInfo, GetAppInfo, GetConferenceEndState, GetDeviceInfo, GetHardwareInfo, GetMeetingTabScan, GetMicrophoneHolders, GetMicrophonePrivacyStatus, GetNativeCallSnapshot, GetRunningApps, GetSelectedTextViaCopy, GetSlackHuddleState, GetSystemAudioStatus, GetSystemSettingsWindowBounds, GetTextBoxInfo, HelperAppShutdown, HideFloatingWebPanel, IsReady, PasteText, PositionBrowserWindow, PostConsentChatMessage, RecordingStarted, RequestAccessibilityPermission, RequestSystemAudioPermission, SetAccessibilityGuidance, SetAccessibilityTreeCapture, SetFocusChangeDetectorState, SetFocusMode, SetInputEventCapture, SetMicrophoneHoldersMonitor, SetNativeDropWitness, SetTabStripMonitor, ShowFloatingWebPanel, SimulateKeyPress, StartAccessibilityServices, StartAllIntervals, StartSpeakerPolling, StopAllIntervals, StopSpeakerPolling, StoreFocusedAppAndElement, UpdateFeatureFlags, UpdateShortcuts.

The split is inferred from which kinds Electron handles. It has not been observed on the wire.

Observed. Keepalive: every 500 ms Electron checks when the helper last responded. After 2 s of silence it sends `IsReady`. After 15 s it marks the helper not ready and relaunches it.

Inferred. Key events go to Electron as raw codes, and Electron matches them against shortcuts itself. If so, the Linux helper only needs to forward key presses, not interpret hotkeys. Which key-code space it expects (macOS virtual keys or Windows VK codes) is unknown.

Inferred. A Linux port needs a Linux helper that speaks this protocol. Windows proves that a non-Swift helper is a supported shape. The minimum set for push-to-talk dictation is likely: answer `IsReady`, stream `KeypressEvent`, acknowledge `DictationStart` and `DictationStop`, perform `PasteText` and report `PasteOutcome`. That set is a guess until it is tried.

Unknown. `UpdateShortcuts` carries no payload, so the helper must learn the shortcut bindings some other way. It may read a settings file, or it may not need them if Electron does all the matching. Not yet traced.

### Platform assumptions in the main process

Observed. Module `81609` defines `isMac` and `isWindows` only. Any non-Windows platform gets macOS paths: logs in `~/Library/Logs/Wispr Flow` and data in `~/Library/Application Support/Wispr Flow`. The client type reported by `ut()` is `desktop_mac` for anything that is not Windows.

Observed. Microphone capture uses Chromium APIs: the asar contains `getUserMedia` 55 times and `AudioWorklet` 33 times. Opus encoding runs in bundled WebAssembly workers (`opusEncoder.worker.js`, `incrementalOpusEncoder.worker.js`, `opusscript_native_wasm.wasm`). Electron's `globalShortcut` is referenced 8 times.

Observed. Backend URLs in the bundle include `https://api.wisprflow.ai`, `wss://api.wisprflow.ai/`, `https://cloud.wisprflow.ai`, `https://admin.wisprflow.ai`, and `https://cdn.wisprflow.com`.

Inferred. Audio capture and streaming to the backend should work on Linux without changes, because they run in Chromium and JavaScript.

### Native modules and their Linux status

| File | What it is | Linux status |
| --- | --- | --- |
| `native_modules/build/Release/node_sqlite3.node` | `sqlite3` addon, PE32+ DLL | Windows-only build. Needs a Linux build for the Electron 42 ABI. |
| `native_modules/lib/crypt32-x64.node`, `crypt32-ia32.node` | `win-ca` reads the Windows certificate store | Windows-only. Must be guarded off on Linux. |
| `42d0061f….node`, `c085ca98….node` | Not binaries. 90-byte JavaScript shims that `require` the crypt32 addons | Harmless if never required |
| `jabra-device-connector/linux/jabra-device-connector` | Jabra headset connector, ELF x86-64, not stripped | Ships ready for Linux |
| `native_modules/roots.exe` | Packaged as a file. Name suggests `win-ca`'s root fetcher. | Not opened. Unused on Linux, inferred. |

## Roadmap

Static work (steps 1–4) is done. Steps 5 onward run the app on this machine. Each step should end with a note here that says what was run and what was observed.

1. **Stub behavior.** Done. Identity, download URLs, fallback, signature and hash checks, launch, and the PostHog request are documented above.
2. **Obtain the app.** Done for 1.6.1209. The last-known-good setup, 1.6.531, is identified and not downloaded.
3. **Map the Electron app.** Done at the level above: Electron version, bundle layout, renderer entries, backend hosts.
4. **Separate the app from the shell.** Done for the part that matters to the port. The helper is the platform layer. `Wispr Flow.exe` is the Electron host and is not needed on Linux.
5. **Pass 1: launch on Linux.** Next. Repack the asar with a small set of patches, run it under stock Electron 42.11.2, and reach a signed-in hub window with a stub helper that passes the ready handshake. See the plan below.
6. **Pass 2: dictation.** Grow the helper until push-to-talk works: global hotkey in, dictation start and stop, text pasted into the focused app.
7. **Pass 3: context features.** Active-app info, selected text, and text-box context through AT-SPI and GNOME, where Wayland allows it.
8. **Pass 4: our own changes.** With a working build, make deliberate changes to the app, such as Linux paths, telemetry settings, or UI tweaks, and keep each as a named patch.
9. **Compare builds only if a behavior is unclear.** Download 1.6.531 and compare. Until then, one version is enough.

## Pass 1 plan: launch on Linux

Work happens in the project tree. Vendor files stay under ignored paths (`payload/`, `work/`). Our code and patches are tracked.

1. **Repack pipeline.** Add `tools/repack.mjs` (Node 24). It extracts `app.asar` and `app.asar.unpacked` into `work/app/`, applies patches from `patches/`, and repacks to `build/resources/app.asar` with `@electron/asar`. Each patch is a small find-and-replace script with an assertion that the original text exists exactly once. A new Wispr build then fails loudly instead of being patched in the wrong place.
2. **Electron runtime.** Install `electron@42.11.2` as a dev dependency in our own `package.json`. Add a launcher, `bin/shoutr`, that runs it against `build/resources/app.asar` with logging on and a separate user-data directory.
3. **Schema export.** Add `tools/export-helper-schema.mjs`. It evaluates only the quicktype type map from the bundle and writes `work/helper-schema.json` plus a readable Markdown summary of all 128 message kinds. This is our reference for the helper.
4. **Platform patch.** Patch module `81609` so Linux has its own branch: data in `~/.config/Wispr Flow` and logs in `~/.local/state/Wispr Flow/logs`. Patch the helper-path function (module `20844`) to return our Linux helper. Keep the reported client type as the stock app would send it on Linux (`desktop_mac`) unless the backend rejects it.
5. **Native modules.** Rebuild `sqlite3` for Electron 42 on Linux x64 (`@electron/rebuild`), and put it at the path the bundle requires. Confirm that `win-ca` and `crypt32` are only loaded on Windows, and patch the guard if they are not.
6. **Stub helper.** Write `helper/` as a small program that reads `|`-framed JSON from stdin, writes replies to fd 3, answers the ready handshake, and returns `HelperAPIError` for every other request while logging it. The log of unhandled requests becomes the to-do list for Pass 2.
7. **First run.** Launch, record the logs, sign in with our own account, and note what breaks. Success for Pass 1: the hub window renders, sign-in completes, the helper shows ready, and no crash loop happens.

### Pass 1 progress

- **Step 1, repack pipeline. Done.** `npm run repack` runs `tools/repack.mjs` with `@electron/asar` 4.3.1 and takes about a second. With no patches, the repacked archive has the same 877 files, and every packed file has the same integrity hash. It is 575,036 bytes smaller, because `@electron/asar` stores 7 groups of identical files once (575,028 bytes), plus 8 fewer header bytes. The three unpacked Windows addons are 15,736 bytes larger on disk than the header records. That is consistent with Authenticode signatures added after packing, and does not matter on Linux. The original header has no executable flags, so the script marks the Linux Jabra connector executable. A self-test patch with missing search text stopped the build as intended.
- **Step 3, schema export. Done.** `npm run schema` writes `work/helper-schema.json` (297 types) and `work/helper-protocol.md`. Only the quicktype constructors and the type-map literal run, inside an empty `vm` context.
- Steps 2, 4, 5, 6, and 7 are next.

Decisions, 22 October 2026: the helper is written in Python, because `evdev` and AT-SPI bindings are available and the code stays readable. Pass 2 runs the app under XWayland first and moves to native Wayland later.

### Working with the tools

- `npm install` installs our only dependency so far, `@electron/asar`.
- `npm run repack` rebuilds `build/resources/app.asar` from the vendor archive and `patches/*.mjs`. It always starts from a fresh extraction, so `work/app/` can be read freely but should never be edited by hand.
- `npm run schema` regenerates `work/helper-schema.json` and `work/helper-protocol.md`. Read the Markdown file before writing any helper handler.
- To locate code in the 10 MB single-line bundle, use Python or Node string searches on `work/app/.webpack/main/index.js`. Regex `grep` across the whole line is too slow. Webpack modules start with `<id>(e,t,n){`.

### Open questions for the next steps

- **Ready handshake.** What `checkIfHelperServiceIsReady` sends and what reply it accepts. It probably sends `IsReady` and expects `ACK` or `HelperLaunchTiming` with `helperMainEntryMs`. Read it before writing the stub.
- **Response shape.** Whether a response echoes the request `uuid` at the top of `HelperAPIResponse`, and whether a reply is required for every request or only for `Get*` kinds.
- **Key codes.** Which key-code space `KeypressEvent.key` uses, and what `eventType`, `index`, and `inputType` mean.
- **Shortcuts.** Where the helper gets bindings, given that `UpdateShortcuts` has no payload.
- **sqlite3 path.** How the bundle `require`s `node_sqlite3.node` (the `__webpack_require__.ab` base path), and which `sqlite3` version to rebuild.
- **win-ca.** Whether `win-ca`/`crypt32` load at startup on non-Windows platforms.
- **Other Windows-only startup code.** `electron-squirrel-startup`, `Update.exe` (`Fm` in module `81609`), and anything keyed on `process.execPath`.

## Out of scope

- Bypassing sign-in, subscription limits, paywalls, or any server-side check. The port uses our own account as Wispr's servers see fit.
- Using the embedded analytics tokens or keys outside the app.
- Running the Windows stub, the setup, or `Wispr Flow.exe`. The Linux port only needs the asar.
- Bypassing the stub's hash or signature checks.
- Publishing or redistributing these notes, the extracted files, the patches applied to them, or a repacked build.
