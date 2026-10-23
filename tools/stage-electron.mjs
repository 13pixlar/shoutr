// Copy Electron's dist into build/ and rename the binary.
//
//   node tools/stage-electron.mjs
//
// Electron treats a binary named "electron" as an unpackaged app. Renaming it
// makes app.isPackaged true, and the binary then loads build/resources/app.asar
// on its own. Do not pass the asar path on the command line: that argument
// selects a dev app and turns isPackaged back off.
//
// build/resources/app.asar and app.asar.unpacked belong to the repack step.
// This script never deletes or overwrites them. resources/default_app.asar is
// left out so a missing app.asar fails instead of opening Electron's demo.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'node_modules/electron/dist');
const buildDir = path.join(root, 'build');

function isOurApp(relativePath) {
  return relativePath === 'resources/app.asar' || relativePath.startsWith('resources/app.asar.unpacked');
}

function shouldSkip(relativePath) {
  return relativePath === 'resources/default_app.asar' || isOurApp(relativePath);
}

function copyTree(sourceDir, relativePath, copied) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (shouldSkip(childRelative)) continue;
    const source = path.join(sourceDir, entry.name);
    // The renamed binary is what flips app.isPackaged.
    const destRelative = childRelative === 'electron' ? 'wispr-flow' : childRelative;
    const dest = path.join(buildDir, destRelative);
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copyTree(source, childRelative, copied);
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (entry.isSymbolicLink()) {
      fs.rmSync(dest, { force: true });
      fs.symlinkSync(fs.readlinkSync(source), dest);
    } else {
      fs.copyFileSync(source, dest);
      fs.chmodSync(dest, fs.statSync(source).mode & 0o777);
    }
    copied.count++;
  }
}

function main() {
  if (!fs.existsSync(path.join(dist, 'electron'))) {
    throw new Error(`Electron binary not found in ${dist}. Run: npm install`);
  }
  fs.mkdirSync(buildDir, { recursive: true });
  const copied = { count: 0 };
  copyTree(dist, '', copied);
  // A leftover binary with the stock name would be unpackaged if someone ran it.
  fs.rmSync(path.join(buildDir, 'electron'), { force: true });
  fs.rmSync(path.join(buildDir, 'resources/default_app.asar'), { force: true });
  const binary = path.join(buildDir, 'wispr-flow');
  if (!fs.existsSync(binary)) throw new Error('Staging did not produce build/wispr-flow');
  console.log(`Staged Electron into build/ (${copied.count} files). Binary: build/wispr-flow`);
}

main();
