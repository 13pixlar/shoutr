// Build sqlite3 5.1.7, the version Wispr bundles, as a Linux addon for
// Electron 42.11.2, and copy it to build/native/node_sqlite3.node.
//
//   node tools/build-sqlite3.mjs
//
// The app loads .webpack/main/native_modules/build/Release/node_sqlite3.node.
// `npm run repack` copies this file over the Windows DLL before packing.
//
// The first attempt uses @electron/rebuild, which compiles against Electron's
// headers. The Windows DLL is an N-API addon, so if that compile fails the
// script tries once more with a plain Node build. Stop if both fail: a
// half-working addon is worse than a clear error.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rebuild } from '@electron/rebuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(root, 'build/native/src');
const output = path.join(root, 'build/native/node_sqlite3.node');
const sqliteVersion = '5.1.7';
const electronVersion = '42.11.2';

function runNpm(args) {
  const result = spawnSync('npm', args, { cwd: scratch, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(' ')} exited ${result.status}`);
}

function findAddons(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findAddons(child));
    else if (entry.name === 'node_sqlite3.node') found.push(child);
  }
  return found;
}

function elfAddon(paths) {
  const elves = paths.filter((file) => fs.readFileSync(file).subarray(0, 4).toString('hex') === '7f454c46');
  const release = elves.find((file) => file.includes(`${path.sep}build${path.sep}Release${path.sep}`));
  return release ?? elves[0];
}

async function main() {
  fs.rmSync(scratch, { recursive: true, force: true });
  fs.mkdirSync(scratch, { recursive: true });
  fs.writeFileSync(
    path.join(scratch, 'package.json'),
    JSON.stringify({ name: 'shoutr-native', private: true, dependencies: { sqlite3: sqliteVersion } }, null, 2),
  );

  console.log(`Installing sqlite3@${sqliteVersion} without running its scripts`);
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund']);

  let builtWith = 'electron';
  try {
    console.log(`Rebuilding sqlite3 for Electron ${electronVersion}`);
    await rebuild({
      buildPath: scratch,
      electronVersion,
      force: true,
      onlyModules: ['sqlite3'],
      buildFromSource: true,
    });
  } catch (error) {
    console.error(`Electron rebuild failed: ${error instanceof Error ? error.message : error}`);
    console.error('Trying a Node N-API build instead. Electron can load it only if the N-API versions agree.');
    builtWith = 'node';
    runNpm(['rebuild', 'sqlite3', '--build-from-source']);
  }

  const addon = elfAddon(findAddons(path.join(scratch, 'node_modules/sqlite3')));
  if (!addon) throw new Error('The build finished but no ELF node_sqlite3.node was produced.');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(addon, output);
  console.log(`Wrote ${path.relative(root, output)} (${builtWith} build, from ${path.relative(scratch, addon)})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
