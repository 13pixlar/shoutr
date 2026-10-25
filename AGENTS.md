# Project context

Shoutr is a personal learning project. It exists to investigate technology and to build a small app for our own use while learning.

- The work is strictly for personal education.
- It is not a commercial product and not a public program.
- Everything stays local on this machine and will not be published.

Prefer clear, teachable code and explanations. Scope choices should fit a private learning sandbox rather than a product meant for release or distribution.

Allways read the ROADMAP.md for each new session.

## Cloud Agent

Node 22.12 or newer is required (`@electron/asar` and `electron` declare that). The image's Node 22 satisfies it. Helper tests import `evdev` at startup, so `python3-evdev` has to be installed first. `python3-pil` and `gir1.2-atspi-2.0` are what branding and the AT-SPI text walk import.

`payload/`, `work/`, and `build/` are gitignored. A fresh checkout can run:

- `npm ci`, then `node node_modules/electron/install.js` when `node_modules/electron/dist/electron` is missing
- `npm run native` and `npm run stage`
- `node --test tools/brand.test.mjs`
- `python3 helper/test_framing.py`
- `python3 helper/test_pass2.py`
- `python3 helper/test_pass3.py`
- `python3 gnome/test_window_bridge.py`

`npm run repack`, `npm run schema`, and `npm start` read the vendor archive under `payload/`. That archive is local to a machine that already has it. The framing test writes `~/.local/state/Wispr Flow/logs/helper.log` under the passwd home, because the helper does not follow `HOME`.
