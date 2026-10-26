# Wispr Flow reverse-engineering roadmap

Personal learning notes for the local sandbox. This records what static analysis has established, where each claim came from, and what to study next. The vendor application was first executed on 23 October 2026. See Pass 1 progress.

Date of the investigation: 22 October 2026. Revised the same day when the mission became a Linux port. The vendor application was first launched on 23 October 2026.

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
| `native_modules/build/Release/node_sqlite3.node` | `sqlite3` addon, PE32+ DLL | Replaced at repack time with a Linux ELF built from sqlite3 5.1.7. See the progress notes. |
| `native_modules/lib/crypt32-x64.node`, `crypt32-ia32.node` | `win-ca` reads the Windows certificate store | Windows-only. Not loaded on Linux; see below. No patch. |
| `42d0061f….node`, `c085ca98….node` | Not binaries. 90-byte JavaScript shims that `require` the crypt32 addons | Harmless if never required |
| `jabra-device-connector/linux/jabra-device-connector` | Jabra headset connector, ELF x86-64, not stripped | Ships ready for Linux |
| `native_modules/roots.exe` | Packaged as a file. Name suggests `win-ca`'s root fetcher. | Not opened. Unused on Linux, inferred. |

### The ready handshake

Observed. `checkIfHelperServiceIsReady` (module `26181`) calls the generic request helper with kind `IsReady` and no payload, so the bytes on stdin are `{"HelperAPIRequest":{"uuid":"…","IsReady":true}}` (plus optional `sentryTrace` and `sentryBaggage`), framed as the earlier findings describe. The acceptance test is `if (e.ACK)`. A reply that contains `ACK` counts as ready. The same function reads `HelperLaunchTiming.helperMainEntryMs` and `TapState.payload.tapEnabled` off that reply. Both are optional: the first is only copied into launch-timing spans, and the second only updates a log line.

Observed. The keepalive (module `8674`) is the same request. Every 500 ms, if the last reply is more than 2 s old, Electron sends `IsReady`. Any reply, including one that is not `ACK`, resets that timer. After 15 s of silence it marks the helper not ready and relaunches it.

### Response shape

Observed. A reply is one object, `{"HelperAPIResponse":{…}}`. `handleResponse` looks up `pendingResponses` by `e.uuid`, so the request `uuid` is echoed at the top of `HelperAPIResponse`, next to the response kind. `sendRequest` registers a resolver for every request before writing it, and the resolver rejects on timeout, so a request with no reply fails rather than being ignored. `Get*` and `IsReady` are not special in that respect.

Observed. A response whose kind is `HelperAPIError` is rejected with `payload.description`. When `payload.params.code` is `NO_HANDLER_REGISTERED`, the log line is "Helper has no handler registered for IPC request" and the request helper returns the caller's default value. That path does not relaunch the helper.

Observed. Both directions pass through the quicktype converter `D` (`toHelperAPI` on the way in, `helperAPIToJson` on the way out). `HelperAPI.additional` is `false`. For a `false` additional type, `D` throws `Invalid value` on any key that is not in the type map. `handleMessage` catches that and logs "Failed to parse HelperAPI message", and the pending request then waits out its timeout. `HelperAPIError.payload.type` is the enum `"SOME_ERROR_TYPES"` only. Flag kinds (`ACK`, `IsReady`) are the literal `true`, not an object.

### How sqlite3 is loaded

Observed. Module `19269` is `e.exports=require(n.ab+"build/Release/node_sqlite3.node")`. The webpack runtime sets `s.ab=__dirname+"/native_modules/"`, so the resolved path is `.webpack/main/native_modules/build/Release/node_sqlite3.node`, outside the archive because `*.node` is unpacked. The app's own `package.json` pins `sqlite3` `5.1.7`. `strings` on the Windows DLL shows N-API imports (`napi_register_module_v1`) and the SQLite version `3.44.2`.

### win-ca does not load its addon on Linux

Observed. The bundled `win-ca` entry sets `disabled` to `process.platform!=="win32"` and, when that is set, uses the empty store in module `31562` instead of module `62849`. Module `62849` is the only caller of the crypt32 shims (`93470`, `61761`), which `dlopen` `crypt32-ia32.node` and `crypt32-x64.node`. The app's own call site (`n(60689)`, inside the certificate helper) is inside `else if (c.H8)`, the Windows branch. On Linux neither branch runs, so no system certificates are added. No patch is needed.

### Windows-only startup is already skipped

Observed. The Squirrel shortcut handling (`--squirrel-install`, `--squirrel-updated`, `--squirrel-uninstall`, `--squirrel-obsolete`, and the `Update.exe` spawn) is inside `if("win32"===process.platform)`. In module `81609`, off Windows, `Fm` (the `Update.exe` path) and `bN` (`basename(process.execPath)`) are both `""`. The string `electron-squirrel-startup` does not occur in the bundle. `autoUpdater.checkForUpdates` is only reached from `startCheckingForUpdates`, which returns immediately when `app.isPackaged` is false and otherwise calls Electron's updater. The 23 October launch did call it. See Pass 1 progress.

### Running unpacked would miss files the archive does not contain

Observed. `app.isPackaged` is read in about 60 places. The ones that change whether the app can start:

- Database migrations (module `7566`) resolve to `src/main/db/migrations` when unpacked, and to `<resources>/migrations` when packaged. The asar has no `src/` tree.
- Tray icons use `/src/renderer/assets/tray/` when unpacked and `/assets/tray/` when packaged.
- When unpacked, the file log level is forced to `silly` and `--remote-debugging-port=9222` is appended.
- Module `69583` calls `process.exit(1)` for an argv token that is not one of `dev-helper`, `dev-backend`, `staging-backend`, `dev-base10`, `dev-bubble`, `dev-notepad`, but only when `app.isPackaged` is false. Tokens starting with `--` are ignored.

Inferred. Launching the stock `electron` binary with the asar path as an argument leaves `isPackaged` false, and the missing `src/` paths would stop startup. Copying Electron's dist and renaming the binary, so it loads `resources/app.asar` itself, makes `isPackaged` true. That is the layout used below.

Observed. In the packaged branch, module `97422` (called from the app-lifecycle startup, before `ready`) sets the electron-log file transport level to `false` and deletes `main.log`, `main.old.log`, and `accessibility.log` from the log directory. Console logging is unchanged. A packaged run therefore has to be captured from the process output, not from `main.log`.

### The helper does not inherit the environment

Observed. The spawn in module `8460` is `spawn(path, {stdio:["pipe","pipe","pipe","pipe"], env:R()})`. `R` returns only `sentryDSN`, `environment`, `segmentWriteKey`, `postHogProjectKey`, `sentryLocalDebug`, and `developmentFileLogging`. `HOME`, `PATH`, `DISPLAY`, and `XDG_*` are not passed. The helper path itself is computed in the Electron process, before the spawn, so an environment variable read there is the Electron process's environment.

Inferred. The helper has to be started by an absolute shebang, and it has to find its home directory without `HOME`. Anything Pass 2 runs from the helper (`ydotool`, `wl-copy`) will need its own path and environment.

### Sign-in opens a browser

Observed. The auth start builds `https://…/login?device_code=…` and calls `shell.openExternal`. Completion is waited on inside the app (an SSE client, from the log text "authCompletedVia" and "aborts SSE"). The argv scan that forwards a `wispr-flow:` URL into that flow is inside `if(v.H8)`, the Windows branch. `setAsDefaultProtocolClient("wispr-flow")` runs on every platform.

Inferred. Signing in does not depend on a `wispr-flow://` redirect back to the process, so no `.desktop` file is required for the first run. `setAsDefaultProtocolClient` may still write a MIME association on Linux.

### A Linux package is already installed on this machine

Observed. `dpkg -S` maps `/usr/lib/wispr-flow/wispr-flow` to the `wispr-flow` package. Its `package.json` version is `1.6.957`. When this was checked, pid 781479 was that binary, with `--class=Wispr Flow` and `--user-data-dir=/home/adam/.config/Wispr Flow`. Crashpad's annotation said Electron `42.3.0`. `~/.config/Wispr Flow/SingletonLock` pointed at that pid. `flow.sqlite` in that directory was 510,316,544 bytes. The package also ships `resources/Release/wispr-flow-linux-helper`, an ELF, and `launcher-common.sh`.

Observed. That launcher says a renamed binary is what makes `app.isPackaged` true, and that Electron 42 also honors `ELECTRON_FORCE_IS_PACKAGED`. The string is present in the Electron 42.11.2 binary. On Wayland the launcher lets Ozone auto-detect unless `WISPR_USE_X11=1`.

This pass still launches 1.6.1209 from the Windows package, under XWayland, as decided. The installed package is recorded because it already owns the data directory.

### The database is not the Chromium profile

Observed. Module `83659` joins `flow.sqlite` onto export `q0` of module `81609`. After the Linux path patch, that is `~/.config/Wispr Flow`, or `$XDG_CONFIG_HOME/Wispr Flow` when the variable is set. `--user-data-dir` changes Electron's profile directory and electron-store. It does not move `flow.sqlite`.

### Linux fails the macOS Applications-folder check

Observed. Module `66539`, export `Wl`, shows "Move Flow to Applications folder" and calls `app.quit()` when the platform is not Windows, the Sentry environment is `production`, and `app.getAppPath()` does not match `/Applications/Wispr Flow.app` (or the user or system Applications paths). The macOS version check and the Windows architecture check in the same module are already behind `tD` and `H8`. Patch `030` makes `Wl` return false on Linux.

## Roadmap

Static work (steps 1–4) is done. Steps 5 onward run the app on this machine. Each step should end with a note here that says what was run and what was observed.

1. **Stub behavior.** Done. Identity, download URLs, fallback, signature and hash checks, launch, and the PostHog request are documented above.
2. **Obtain the app.** Done for 1.6.1209. The last-known-good setup, 1.6.531, is identified and not downloaded.
3. **Map the Electron app.** Done at the level above: Electron version, bundle layout, renderer entries, backend hosts.
4. **Separate the app from the shell.** Done for the part that matters to the port. The helper is the platform layer. `Wispr Flow.exe` is the Electron host and is not needed on Linux.
5. **Pass 1: launch on Linux.** Done. With 1.6.957 quit, `bin/shoutr` opened the existing profile, the hub was logged as shown, the stored account was already signed in, and the stub helper stayed ready. Dictation is Pass 2. The database is the one 1.6.1209 already migrated. Leave 1.6.957 quit while this build is running.
6. **Pass 2: dictation.** Done. Ctrl+Space records, the transcript shows in the hub, the text stays on the clipboard, and it is pasted into the focused text box. The hub can be moved and minimized. The muted-mic toast can be clicked, and Space from the shortcut does not land in the text box. See Pass 2 progress.
7. **Pass 3: context features.** Done for controls AT-SPI can read. The focused app is named, and a caret's surrounding text is pushed when dictation starts. A control with no caret, including Cursor's editor and a Firefox page, still has no text context. The browser URL is still empty. See Pass 3 progress.
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
- **Bundle reading for the open questions. Done, nothing executed.** The answers are in the findings above. One correction to the plan: a reply the quicktype converter rejects is not a soft error. `handleMessage` logs it and the request then hits its timeout, so the stub has to send schema-valid JSON. A second one: packaged startup deletes `main.log`, so the launcher has to keep the process output itself.
- **Step 2, Electron runtime. Done.** `npm install` recorded `electron@42.11.2` and `@electron/rebuild@4.2.1`. The `electron` package did not download its binary during install; `node node_modules/electron/install.js` did, into `node_modules/electron/dist` (the ABI file says 146). `npm run stage` copied 73 files to `build/` and renamed the binary to `build/wispr-flow`. `resources/default_app.asar` is not copied. `bin/shoutr` runs that binary with `--ozone-platform=x11`, `--user-data-dir` set to `~/.config/Wispr Flow`, and `ELECTRON_FORCE_IS_PACKAGED=true`. It does not pass the asar path.
- **Step 4, platform patches. Done.** `npm run repack` applied `patches/010-linux-platform-paths.mjs` and `patches/020-linux-helper-path.mjs`. `ut()` still ends in `desktop_mac`. The nupkg keeps `migrations/` (the database schema) and `assets/` (tray and window icons) beside `app.asar`, and packaged code joins those onto `process.resourcesPath`. Repack now extracts those, plus the `ax-inspect*` scripts, into `build/resources/` (837 files). `Release/Wispr Flow Helper.exe` is not extracted.
- **Step 5, sqlite3. Done.** `npm run native` compiled sqlite3 5.1.7 with `@electron/rebuild` against Electron 42.11.2. No Node fallback was needed. The addon is an ELF that links only the C library and libstdc++, which fits N-API. `ELECTRON_RUN_AS_NODE=1 build/wispr-flow` loaded it and `select sqlite_version()` returned `3.44.2`. Repack copies that file over the Windows DLL. win-ca needed no patch; the launch log said it injected 0 system certificates.
- **Step 6, stub helper. Done.** `python3 helper/test_framing.py` passed: escape round trip, a message split across reads, and a pipe on fd 3. The first test process had no fd 3, so the log file was opened as fd 3 and one reply was written into `helper.log`. The helper now refuses to start unless fd 3 is a pipe, and it will not open the log on fd 3. A later test run left a clean log line.
- **Step 7, first run. Stopped before sign-in.** Two launches, both with `--user-data-dir=/tmp/shoutr-pass1-userdata`, so the Chromium profile was not the installed app's profile. The database was. See the findings: `flow.sqlite` does not follow `--user-data-dir`.

  The first launch logged "App is not in the Applications folder" and exited after the dialog. That is the check patched in step 4's follow-up, `patches/030-linux-skip-applications-folder.mjs`.

  The second launch stayed up for about 35 seconds and was then stopped. Observed in `/tmp/shoutr-pass1.log` and `~/.local/state/Wispr Flow/logs/helper.log`:

  - `App ready, version: 1.6.1209`, `Platform: linux`, Sentry `enabled: true`, `environment: 'production'`.
  - `Running Shoutr Linux helper`, one spawn, `Helper service is ready: true`. No second spawn, no `HelperPersistentFailure`, no `Failed to parse HelperAPI message`.
  - The hub, status, and scratchpad windows were logged as created. This was not checked by looking at the screen. The process was stopped first.
  - Sign-in did not happen. The log says `User is not signed in`. The throwaway profile had no session. The real profile was left alone apart from the database, below.
  - Requests the stub rejected, from this launch only: `GetDeviceInfo` (6), `StartAccessibilityServices` (2), `StartAllIntervals`, `UpdateShortcuts`, `StopAllIntervals`, `HelperAppShutdown`. `IsReady` was answered, including a keepalive about every 2 seconds. That list is the start of the Pass 2 work.
  - The auto-update check ran. The override-release fetch returned HTML (`Unexpected token '<'`) and was logged as a warning. No download was observed. On exit the log says `Stopping autoupdate check intervals`.
  - `~/Library` was not created. `~/.config/mimeapps.list` was unchanged (same SHA-256 as before the launch). No new file appeared in `~/.local/share/applications`.

  Observed, and this is the part that matters: the second launch migrated the installed app's database. `SequelizeMeta` gained 17 names that `1.6.957` does not ship:

  `20260916120000-add-meeting-identity-fields`, `20260918120000-add-meetings-candidate-summary`, `20260922120000-add-meetings-current-job`, `20260925120000-heal-meetings-candidate-summary-metadata`, `20260928120000-add-folder-meetings-copy-identity`, `20260928130000-add-shared-notes-copy-identity`, `20260929120000-add-calendar-event-notetaker-controls`, `20260929120000-add-meetings-org-insights`, `20260929180000-add-meetings-summary-feedback`, `20260930120000-add-folders-grants`, `20260930120000-add-meeting-speaker-assignment-edits`, `20261005120000-add-folders-sharing-blocked`, `20261007120000-create-usage-outbox`, `20261007120001-add-usage-outbox-needs-uploading-index`, `20261008120000-add-calendar-event-alternate-conference-url`, `20261009120000-add-meeting-room-label-edits`, `20261014120000-add-calendar-event-series-key`.

  The same launch also ran `cleanupOldHistory`: 21 history rows older than 14 days, already marked uploaded, had `audio`, `opusChunks`, and `builtInAudio` set to null. The transcript text was not what that function updates. The same function text is in the 1.6.957 bundle. `config.json` in the real profile was not rewritten (its mtime stayed 10:28, before the launch). electron-store wrote a `config.json` under `/tmp/shoutr-pass1-userdata` instead. SIGTERM reached the hub renderer (`exitCode: 15`, reason `killed`). During that shutdown the GPU process failed to relaunch six times, and the main process then aborted with `GPU process isn't usable. Goodbye.` The shell recorded exit 133, `Trace/breakpoint trap (core dumped)`. No core file was left in the project directory. The installed 1.6.957 process was still running afterward.

  Not done, on purpose: launching again against `~/.config/Wispr Flow` while 1.6.957 is running, and signing in. The schema is already ahead of the installed package. Another launch would keep writing that database.
- **Step 7, continued, after 1.6.957 was quit. The hub is up.** Confirmed no `wispr-flow` process and no `SingletonLock`, then ran `bin/shoutr` against `~/.config/Wispr Flow`. The first attempt crash-looped the helper: Node's extra stdio slot is a socket (`S_ISSOCK`), and the helper refused anything that was not a FIFO. Stopped that process (shell exit 133 again, the same GPU abort on shutdown). The helper now accepts a pipe or a socket, and still refuses a regular file. Tests passed. The second launch logged `App ready, version: 1.6.1209`, `Showing hub window`, and `Helper service is ready: true` with `relaunchCount: 0`. No further relaunch in the following seconds. Sentry `setUser` ran for the account already stored in that profile, so no new browser login appeared. `SequelizeMeta` stayed at 174 rows, still ending at `20261014120000-add-calendar-event-series-key.js`. The stub still answers only `IsReady`. New unhandled kinds in this run: `UpdateFeatureFlags`. The rest match the earlier list (`GetDeviceInfo`, `StartAccessibilityServices`, `StartAllIntervals`, `UpdateShortcuts`).

Decisions, 22 October 2026: the helper is written in Python, because `evdev` and AT-SPI bindings are available and the code stays readable. Pass 2 runs the app under XWayland first and moves to native Wayland later.

### Pass 2 progress

- **Key numbers. Observed.** Module `28889` chooses macOS key codes when `tD` is set and Windows virtual-key codes otherwise. `tD` is darwin, so Linux uses the Windows column. Left Ctrl is 162 and Space is 32. The stored push-to-talk chord in `~/.config/Wispr Flow/config.json` is `162+32`, action `ptt`. Electron matches the keys it is holding against `prefs.cache.splitKeybinds`. `UpdateShortcuts` carries no payload because that file is the source. A `KeypressEvent` uses `eventType` `key_event_press` or `key_event_release`, `key` as that Windows code, and `index` counting from 1 with no gaps.
- **Who records. Observed.** `DictationStart` is sent to the helper when a shortcut fires, and the audio work stays in Electron (`dictation.streaming`). The helper is asked to paste afterwards: `PasteText` with `pasteId` and `text`. Replying `ACK` is enough for that request. `CheckStaleKeys` expects `StaleKeysResponse.payload.staleKeys`.
- **Helper, restarted under the open hub.** The running helper was stopped once. Electron started it again, `relaunchCount` stayed 0, and the log says `Helper service is ready: true`. The new process is listening to five keyboards and answered `IsReady`. It does not grab those devices, so the shortcut still reaches the focused window as well. Paste goes through `ydotool` (`/tmp/.ydotool_socket`, uinput) after writing the X11 and Wayland clipboards.
- **First real dictations. Observed.** Ctrl+Space started and stopped dictation (`DictationStart`, `DictationStop`). `PasteText` then ran. The text reached the clipboard. The key press did not: `xclip` keeps running to own the selection, `subprocess` waited for it, and the helper logged `paste command timed out` before `ydotool key ctrl+v`. Writes now spawn the clipboard tools and do not wait.
- **The full-screen window. Observed.** The context menu is created at the size of the work area (`3439x1439` here), `frame:false`, `closable:false`, `type:"toolbar"`. On Linux that window was mapped and solid. It is now created at 1×1 offscreen, and hidden back there. The hub's non-macOS branch also forced `frame:false`, so Linux had no minimize or close. The hub frame is on for Linux. After the first repack, Motif decorations were set and the context menu was 1×1 at `-2000,-2000`. The hub still could not move or minimize.
- **Clipboard emptied, hub stuck. Observed.** Later dictations were transcribed in the hub. The helper logged `PasteText` with no failure, then put the previous clipboard contents back 0.2s after Ctrl+V, so the dictation did not stay on the clipboard. The hub's `_NET_WM_ALLOWED_ACTIONS` were only change-desktop, above, and below, and its state was skip-taskbar and skip-pager. A stock Electron 42 probe on this machine reproduced that: a window created `focusable:false` and made focusable on `show` never gains move or minimize. The same window created `focusable:true` does. The hub is created `focusable:false` and only calls `setFocusable(true)` from its `show` handler, which is after Mutter has decided. Linux now creates the hub focusable, and the shared show helper uses `showInactive()` and does not call `focus()`, so the text box keeps the keyboard. Paste no longer restores the old clipboard, and it waits until `xclip` reads the new text back before Ctrl+V.
- **Relaunch after that patch. Observed.** `_NET_WM_ALLOWED_ACTIONS` on the hub now includes move, resize, minimize, maximize, and close. `_NET_WM_STATE` is empty. `_NET_ACTIVE_WINDOW` was `0x0`, so a Wayland window held the keyboard and the hub had not taken it. The context menu is still 1×1 at `-2000,-2000`. The helper was ready and listening. The user then confirmed the hub can be moved and the dictation stays on the clipboard. Automatic paste still did not happen.
- **Ctrl+V never arrived. Observed.** Each paste logged `ydotoold listening` and then a successful `PasteText`, with no failure line. The daemon was not staying up: the socket refused connections while a `ydotoold` process still existed, and `/proc/bus/input/devices` had no virtual keyboard. A keyboard opened with `evdev` and held open delivered Ctrl+V to a focused X11 window (two KeyPress events) and to a Wayland GTK window (`Control_L`, then `v` with `GDK_CONTROL_MASK`). Paste now uses that keyboard. The helper was restarted under the open hub and logged `paste keyboard ready`.
- **The letter v, and the extension. Observed.** After the virtual keyboard, dictation still showed in the hub and the clipboard still held the text, but the text box sometimes gained a single `v` and sometimes nothing. Ctrl and V were separate reports, 30 ms apart. A combined report (Ctrl down and V down, then one sync) pastes into a Wayland GTK entry (`BEFORE` became `BEFORECHORD_OK`) and into an X11 GTK entry. The helper was restarted onto that chord. GNOME Shell here is 42.9. `wispr-flow-window-bridge@wispr.flow` is enabled and its state is `ERROR`: the extension is written for GNOME 45 (ESM imports) and did not load. It only reports the focused window over D-Bus. It does not send keys. `clipboard-history@alexsaveau.dev` is enabled. Its paste hack sends Shift+Insert when a history row is chosen, and its shortcuts are Super+Shift+V and Super+Shift+P, not Ctrl+V. The muted-mic toast is the status window. That window ignores the mouse, and the 1-pixel alpha sample that would turn clicks back on throws `UnknownVizError`, so the buttons never receive the click.
- **Push-to-talk paste. Observed.** After the combined chord, the user dictated again and said it works. The words land in the focused text box. Pass 2's dictation path is done. The muted-mic toast is still not clickable, and the shortcut is still not swallowed.
- **Toast clicks and swallowed Space. Observed.** An X input shape and Electron `setShape` were both tried on a probe window. Under this window manager the click still landed on the window behind, so that path was not kept. The toast card now forces `pointer-events: auto`, and the reporter keeps a clickable rectangle even when a parent had turned pointer events off. The status hit tester, which already delivered a real click to the flow bar, polls every 50 ms on Linux and also checks on mouse move. The helper was restarted with the repacked build: `paste keyboard ready`, then `swallowing push-to-talk on 5 keyboard(s)`. A second grab of each of those five keyboards returned "Device or resource busy", so the grab is held. Space is not re-injected while Left Ctrl is held. Ctrl itself, and Ctrl+V, still are. The user then tried both and said they work: the muted-mic buttons can be clicked, and the shortcut no longer types a space.

### Pass 3 progress

- **Window bridge on GNOME 42 and 45. Observed on 42.** One `extension.js` cannot serve both shells. GNOME 42.9 reported `import declarations may only appear at top level of a module` and left `wispr-flow-window-bridge@wispr.flow` in `ERROR`. GNOME 45 loads that file as a module, so the script form would fail there instead. `gnome/window-bridge/` keeps both entry points, and `gnome/install_window_bridge.py` copies the one that matches `gnome-shell --version`. Shell 43 and 44 take the 42 file. The break is 45. This machine is 42.9, so `extension-42.js` was installed and the shell reloaded extensions. State is `ENABLED`. `GetFocusedWindow` returned `firefox.desktop` with a pid and a title. `GetWindowList` returned 13 windows, including Terminal, Slack, Nautilus, Firefox, and Cursor. The version-check setting was put back to `true`. The other enabled extensions were still `ENABLED` afterward. The GNOME 45 file was not loaded here.
- **Focused app and caret. Observed.** The helper now answers `GetAppInfo`, `GetActiveAppInfo`, and `GetRunningApps` from that bridge, and it sends `AppInfoUpdate` when the focused id or title changes. After a helper restart under the open hub, the log says `AppInfoUpdate -> org.gnome.Terminal.desktop`, then `swallowing push-to-talk on 5 keyboard(s)`. The desktop file's `Name=` is what the app is given (`Terminal` for that id). A shell id of `window:N` is not used as the bundle id; the WM class is. A direct read of the focused Terminal, through AT-SPI, found a caret: 3566 characters before it and 1 after. The same read on a focused Firefox page did not: the document was focused and the caret was -1, so `GetTextBoxInfo` stays the empty result the app already uses when it has no text. The text itself is not logged. `GetTextBoxInfo` had not been requested again by the time the helper finished starting. `python3 helper/test_pass3.py` covers the reply shape, the pipe in a title, and the caret split.
- **Screen reader hint. Observed.** `org.a11y.Status.ScreenReaderEnabled` was set true to see if Cursor's editor would expose a caret. That started Orca. The focused Cursor document still had caret -1. The property was set back to false, Orca was stopped, and `org.gnome.desktop.a11y.applications screen-reader-enabled` was still false. Leave that hint off.
- **Text box push. Observed.** Audio chunks copy `beforeText` and `afterText` from the stored text box, and a new dictation clears that store before it sends `DictationStart`. `GetTextBoxInfo` is not how a normal dictation gets its context. The helper now pushes `TextBoxInfo` (the same payload, no `focusedElementHash`) when the focused app changes, again when `DictationStart` arrives even if the text is unchanged, and during an open dictation when a caret's text changes. A caret-less app is walked once per focus, not on the key-forwarding poll. Losing the caret pushes the empty result once. Lengths are logged; the text is not. After a helper restart under the open hub the log says `paste keyboard ready`, `swallowing push-to-talk on 5 keyboard(s)`, `AppInfoUpdate -> firefox.desktop`, and `TextBoxInfo -> before=9 selected=0 after=0`. Focus then moved, and the next lines are `AppInfoUpdate -> cursor.desktop` and `TextBoxInfo -> no caret`, so the Firefox snapshot was not left in place. The app log did not record a parse failure or a skipped text box for the Firefox push. Which Firefox control those 9 characters belong to was not identified. Later, a focused Terminal pushed `before=342 selected=0 after=16`, and a focused Firefox field pushed `before=17 selected=0 after=6`. Other Firefox focuses pushed `no caret`. A Cursor dictation then logged `TextBoxInfo -> no caret`, `DictationStart -> ACK`, and `PasteText` of 27 characters. The user said it works. Cursor's editor still has no caret. `python3 helper/test_pass3.py` checks that `DictationStart` pushes the same caret again and that the log does not contain the text.

### Pass 4 progress

- **Window name. Observed.** The hub title bar, `WM_CLASS`, and the process are `shoutr`, the project directory. `app.setName` and `--class=shoutr` changed the title and left `WM_CLASS` as `wispr-flow`, because Electron fixes that from the desktop name at startup. `setDesktopName("shoutr.desktop")` is what the window manager reads, and the staged binary is `build/shoutr` for the same reason. The tray tooltip is `shoutr`. The profile path is still `~/.config/Wispr Flow`, so this launch opened the existing account. Text inside the hub page still says Wispr Flow. Helper was ready on this launch.
- **Tray menu. Observed.** The panel menu is the appindicator menu, not the offscreen HTML context menu. Its items that open the hub (Open, Shortcuts, meetings, feedback, support) call the shared Linux show helper. That helper uses `showInactive()` and skips `focus()`, so a hub that is already mapped never comes forward and the click looks dead. `patches/070-linux-tray-raise.mjs` raises and focuses the hub only on that tray path. Dictation still uses the old helper, so a recording does not steal the text box. After a restart, the same `clicked` event the shell sends for "Open Wispr Flow" moved `_NET_ACTIVE_WINDOW` from none to the hub (`WM_CLASS` `shoutr`). A click in the panel menu itself was not made. Help center, Quit, and Paste last transcript do not use that show helper. The grey row under Paste last transcript is the last transcript, and it is disabled. The hub page body is still the vendor copy; the title string is the only text already changed.
- **Name, mark, and colors. Observed.** Visible product copy is Shoutr. The hub title is Shoutr, the onboarding headline reads "How would you like to use Shoutr first?", and Settings says "Shoutr Hub language" and "Shoutr v1.6.1209". The live hub text contains no "wispr". The profile directory is still `~/.config/Wispr Flow`. Hosts, the help article slug `for-Wispr-Flow`, protocols, and code identifiers stay. `tools/brand.mjs` rewrites the shared theme in all nine window bundles. On the live hub, `--background` is `#080D20`, `--primary` is `#426CFF`, `--foreground` is `#E8EDFF`, `--border` is `#293657`, `--recording-foreground` is `#FF3D68`, and `--gradient-voice` is the coral-to-amber gradient. The settings sheet is `#111B3D`. It had stayed white because `--shade-white` was still `#fff` in the light theme block. A Change button's forced focus ring is 2px `#6488FF`, and forcing hover changes that button's fill. The theme menu still says Light, which is the saved preference; both theme blocks now use this palette. Button text on the blue fill is `#080D20`, because `#E8EDFF` on `#426CFF` is below the contrast bar. The tray image and the in-app marks are the transparent waveform from `img/`. The window icon is the embossed mark. The status window was empty while idle, so its toast was not on screen. "Try it now" was not clicked. A look at the panel icon itself was not taken.
- **Logo and readable menus. Observed.** Sidebar nav icons kept a hardcoded dark fill (`#312D37`) because the saved theme is Light, and the vendor only recolors those fills in the dark theme. Buttons now paint those fills with the light text color. The light-theme neutral steps had pointed at near-black, so menu labels disappeared on navy; they now point at the light foreground. Popup text that was still `#1d1d1f` on a navy surface is `#E8EDFF`. The open theme menu measured Light, Dark, and System at contrast 12 to 16 on the navy menu. A dictionary icon's computed fill was `rgb(232, 237, 255)`.
- **Hub header logo beside Pro. Observed.** The vendor header used two webpack SVGs: gray “Flow New” bars (`195938afa229e6d82a5a.svg`) and a compact “Flow” wordmark (`0e6b9400359d8a3d4054.svg`). On navy, the wordmark read as faint “Flow” text beside the Pro pill. `tools/brand_icons.py` now writes the orange transparent mark from `img/app_icon_transparent_bg.png` into the icon slot, clears the wordmark slot, and leaves the vendor gradient dictation nav icons (`rke` / `kg`) alone. `patches/080-linux-sidebar-header.mjs` drops the second header image, raises the logo to 32px, and left-aligns it so Pro follows. `tools/brand.mjs` no longer swaps the Dictation row for a PNG and skips inline logo replacement in `hub/index.js` so the hub keeps the vendor gradient waveform component for in-app uses. Other renderer windows still get two inline logo replacements (not three).
- **Helper without system python3-evdev. Observed.** On Ubuntu 22, `python3-evdev` may not be installed and sudo may be unavailable. The bundled tree in `vendor/python3-dist` is Python 3.10. The launcher uses the distro module when that import works, and that tree only when the tree itself imports. On Debian, Ubuntu, and apt derivatives, `shoutr` installs `python3-evdev` when neither copy imports. `bin/shoutr` points `SHOUTR_HELPER` at the launcher, not the `.py` file directly.

### Working with the tools

- `npm install` installs `@electron/asar`, `electron@42.11.2`, and `@electron/rebuild`. If `node_modules/electron/dist/electron` is missing after install, run `node node_modules/electron/install.js`.
- `npm run stage` copies Electron's dist to `build/shoutr`. It does not touch `app.asar`.
- `npm run native` builds `build/native/node_sqlite3.node`.
- `npm run repack` rebuilds `build/resources/app.asar` from the vendor archive and `patches/*.mjs`, overlays that sqlite build, and extracts `migrations/` and `assets/` beside the archive. It then writes the Shoutr name, theme, and icons (`tools/brand.mjs`, reading `img/`). It always starts from a fresh extraction, so `work/app/` can be read freely but should never be edited by hand. Repack fails if the sqlite build is missing. A clean checkout needs the vendor tree under `payload/` (see **Artifacts on this machine**); it is gitignored.
- `npm start` runs `bin/shoutr`. It opens the database in `~/.config/Wispr Flow` even when a different `--user-data-dir` is passed. That directory is the installed app's database. Quit the installed `wispr-flow` package before starting Shoutr so `SingletonLock` is free.
- If the helper exits with `ModuleNotFoundError: evdev`, the system package is missing and `vendor/python3-dist` did not import. On Debian, Ubuntu, and apt derivatives, start `shoutr` from a terminal so it can run `sudo apt-get install python3-evdev`. `bash helper/test_evdev_setup.sh` checks that choice.
- `npm run schema` regenerates `work/helper-schema.json` and `work/helper-protocol.md`. Read the Markdown file before writing any helper handler.
- `python3 helper/test_framing.py` checks the helper's framing without Electron. `python3 helper/test_pass3.py` checks focused-app replies, the caret split, and that `DictationStart` pushes `TextBoxInfo` again without logging the text.
- `python3 gnome/test_window_bridge.py` checks that the GNOME 42 file is a script, the GNOME 45 file is a module, and both speak `org.wispr.flow.WindowBridge`. `python3 gnome/install_window_bridge.py` copies the matching file into `~/.local/share/gnome-shell/extensions/`. `--reload` loads it in the running session by reloading every extension.
- To locate code in the 10 MB single-line bundle, use Python or Node string searches on `work/app/.webpack/main/index.js`. Regex `grep` across the whole line is too slow. Webpack modules start with `<id>(e,t,n){`.

### Open questions for the next steps

Answered and moved into the findings: the ready handshake, the response shape, the sqlite3 path and version, win-ca on non-Windows, and the Windows-only startup code.

- **Key codes and shortcuts.** Answered. See Pass 2 progress. Paste into the focused window works with the helper's own virtual keyboard, including under Wayland. The helper grabs the keyboards and does not pass Space through while Left Ctrl is held. The user confirmed that dictation no longer types that space. `inputType` is optional and defaults to keyboard.
- **Second Flow directory.** Module `23913` export `u0` still resolves to `~/Library/Application Support/Flow` on anything that is not Windows. `~/Library` was not created during the 23 October launch. Whether a signed-in session writes there is not established.
- **Auto-update on Linux.** The 23 October launch did start the check, and the override-release URL returned HTML. No update was downloaded in that run. Whether a later check downloads anything is not established.
- **The live database.** `~/.config/Wispr Flow/flow.sqlite` has 17 migrations that 1.6.957 does not ship. The 1.6.1209 launch after 1.6.957 was quit did not add more. How 1.6.957 behaves against that schema is not established. Leave 1.6.957 quit while 1.6.1209 is running.

## Pass 5: Shoutr v1 scope

Shoutr v1 is a dictation client on Linux that opens the hub at launch on About Shoutr. It keeps auth, push-to-talk dictation, paste, the Linux helper, status toasts, the tray, mic and shortcut settings, personal dictionary sync, and Insights stats (cache prefetch on Linux). It drops or no-ops meetings, notetaker, calendar, notes, extensions, referral and trial promo UI, scratchpad and meeting-recorder prewarm, and Linux auto-update polling.

| Area | Keep | Disable or no-op (Linux patches) |
| --- | --- | --- |
| Launch | Hub (About Shoutr) + status window | — (removed tray-first `090`) |
| Hub main nav | About Shoutr, Insights, Dictation, Dictionary | My Voice, Notetaker, Snippets, Style, Transforms, Notes, Tasks, Memory, vendor Extensions home (`091`, `097`) |
| Hub footer | Shortcuts, Settings | Team, Referral, student challenge, Help (`091`) |
| Settings | General, System, Account, Plans and Billing, Data and Privacy (`107`) | Notetaker, Vibe coding, Experimental, Connectors, MCP, Team, internal/testing pages |
| Hub header | Account menu | Notifications bell and panel (`106`) |
| Background | Helper, dictation pipeline, insights cache | Calendar sync, meetings drain, pending promo fetch, launch verdict proof sync (`092`–`094`; `095` removed) |
| Extra windows | Status, hub when opened | Scratchpad and meeting-recorder prewarm (`096`) |
| Updates | — | `startCheckingForUpdates` on Linux (`093`) |

### Pass 5 regression checklist

Run after `npm run repack` and restarting with `bin/shoutr` (vendor `wispr-flow` quit):

1. **Launch:** hub opens on About Shoutr; status window present.
2. **Hub nav:** About, Insights, Dictation, Dictionary in the sidebar; Settings (and Shortcuts) in the footer; no Notetaker row; no notifications bell in the header.
3. **Settings modal:** sidebar lists only General, System, Account, Plans and Billing, Data and Privacy.
4. **Popovers:** account menu and other hub popovers use navy `#111B3D` with readable foreground (hub forced dark in `108`; `brand.mjs` retints `var(--shade-white)` surfaces).
5. **Ctrl+Space:** transcribe, paste into the focused app; no stray Space from the shortcut.
6. **Muted-mic toast:** clickable (existing Linux status patches).
7. **Helper log:** ready, no crash loop.
8. **Logs:** no `[CalendarSyncManager] Initializing`, no `[MeetingRecorder] Pre-warmed`, no `[Scratchpad] Pre-warmed` on a fresh launch (optional: fewer renderer processes than before prewarm was disabled).

### Pass 5 progress

- **Scope patches 091–098 (+ 092b).** Repack on 25 October 2026 applies 18 patches (010–080, 091–094, 096–098). Removed `090` (tray-first) and `095` (insights cache skip) per UI polish.
- **Hub at launch + About default (`097`/`098`).** Main window opens at startup again; each time the hub is shown, sidebar selects About Shoutr. About uses the same `A4` full-width page shell as Insights and Dictation (`var(--background)` panel).
- **Insights loading fix.** Re-enabled insights cache prefetch on Linux (removed `095`) so Insights tab is not stuck on skeleton loaders.
- **Hub UI trim (`098`).** Dictation hero banners off; voice-profile / Bot Architect card off; Dictionary promo banner off; Insights share ring off; hub modal/dialog surfaces use `#111B3D` to match status toasts.
- **Dictation layout + hub chrome (`100`/`101`).** Dictation stats aside removed. On Linux the hub opens at **1020×690** (reference screenshot), edge resize is off, maximize still works.
- **Linux menus (`102`).** Tray and GNOME app menu match hub nav (About, Insights, Dictation, Dictionary, Shortcuts, Settings); notetaker, calendar, help/support/feedback, and update entries removed. Tray keeps paste-last-transcript, mic, and languages.
- **Sidebar always open (`103`/`104`).** Collapse toggle removed; logo + Pro pill sit in the first sidebar row using the same icon column as nav items; sidebar no longer collapses.
- **External links (`104`/`105`).** About page Wispr link opens in the system browser (hub `window.open` handler + click handler).
- **Notifications removed (`106`).** Header bell, unread badge, notifications popover, and shared-note anchor popover removed for v1.
- **Settings nav trim (`107`).** Settings sidebar fixed to General + System and Account + Plans and Billing + Data and Privacy.
- **Popover theme (`108` + `brand.mjs`).** Hub theme provider always applies dark; key popover surfaces hard-coded to `#111B3D`; global retint maps `var(--shade-white)` backgrounds so light saved theme preference does not yield white sheets.
- **Scratchpad prewarm. Observed.** First repacked run still logged `[Scratchpad] Re-warming pre-warmed window (config changed)` until patch `096` also guarded `he=()`. Second repack + restart: no Scratchpad or MeetingRecorder prewarm lines in `/tmp/shoutr-v1-test.log`.
- **App services. Observed.** `Launching app services...` and `App services finished launching` still run (hub IPC init). No `[CalendarSyncManager] Initializing`, no `[MDM] Failed to start update checks`, and no insights prefetch errors on the smoke log. `[CalendarReminder]` status-lane pushes may still appear; calendar **sync** init is patched to skip on Linux when that path runs.
- **Hub nav and promos.** Patches `091` and `092`/`092b` are in the bundle (`w1=[Q.z6.Dictation,Q.z6.Dictionary]`, hub dialog `useEffect` short-circuited in `092b`). **Fix:** first `092b` used `process.platform` in the hub renderer, which threw `ReferenceError: process is not defined` and showed “Shoutr hit a snag”; repack uses an unconditional `return` at the top of that effect (renderer has no `process`; Shoutr is Linux-only). Manual UI check: open hub from tray and confirm sidebar/footer; Ctrl+Space dictation unchanged from Pass 2.
- **Helper (optional trim).** No change. `StartAllIntervals` / `StopAllIntervals` already ACK-only in `helper/shoutr_helper.py`; v1 dictation path unchanged.

## Install on another machine

`./install.sh` is how a fresh Ubuntu or Debian machine gets this build. It is for the desktop user who will dictate, on x86_64.

The Wispr application is not in git. The script downloads the Windows setup named in `packaging/vendor.json` (1.6.1209), checks the SHA-256, and extracts the archive the repack step already expects. Patches match that build, so the script does not follow `payload/latest.json`.

It then installs the apt packages (Wayland and X11 clipboards, Python evdev, AT-SPI, a compiler for the sqlite addon, and the libraries Electron needs), a private Node 22 when the system Node is older, the udev rule for `/dev/uinput` and `/dev/input/event*`, membership of the `input` group, and this user's GNOME window bridge. The app is copied to `/usr/lib/shoutr` with `chrome-sandbox` setuid, and `shoutr` is put on `PATH` with a desktop entry. `shoutr --doctor` reports what is still missing.

The helper uses the distro `evdev` when that import works. `vendor/python3-dist` is used only when that copy itself imports, so an Ubuntu 22 build is not forced onto a newer Python. On Debian, Ubuntu, and apt derivatives, `shoutr` installs `python3-evdev` when neither copy imports. Fedora, Arch, and openSUSE are left to their own package commands.

Windows stay on XWayland when the session is Wayland. That is the path the hub patches were tried on. `SHOUTR_USE_WAYLAND=1` asks Electron for a native Wayland window. Paste and the shortcut use the virtual keyboard either way.

Log out once if `--doctor` says `/dev/uinput` is not writable. Quit an installed `wispr-flow` before starting Shoutr; they share `~/.config/Wispr Flow`.

## Out of scope

- Bypassing sign-in, subscription limits, paywalls, or any server-side check. The port uses our own account as Wispr's servers see fit.
- Using the embedded analytics tokens or keys outside the app.
- Running the Windows stub, the setup, or `Wispr Flow.exe`. The Linux port only needs the asar.
- Bypassing the stub's hash or signature checks.