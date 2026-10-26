// Rebuild Wispr Flow's app.asar with our patches applied.
//
//   node tools/repack.mjs
//
// 1. Extract the vendor archive (and its app.asar.unpacked sibling) into work/app/.
// 2. Apply every patch in patches/*.mjs, in file-name order.
// 3. Replace the Windows sqlite3 addon with build/native/node_sqlite3.node.
// 4. Pack work/app/ into build/resources/app.asar and check that the same
//    files ended up outside the archive as in the original.
// 5. Extract the migrations and assets that the package stores beside the
//    archive into build/resources/. Packaged code looks for them there.
//
// A patch module looks like this:
//
//   export default {
//     description: 'Give Linux its own data and log paths',
//     file: '.webpack/main/index.js',
//     edits: [{ find: 'const l="darwin"===process.platform', replace: '...' }],
//   };
//
// Each `find` must occur exactly once in the file. If Wispr ships a new build
// and the text moves or changes, the repack stops instead of patching blindly.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as asar from '@electron/asar';
import { applyBrand, applyResourceIcons } from './brand.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArchive = path.join(root, 'payload/app/lib/net45/resources/app.asar');

// ./install.sh writes the one nupkg named in packaging/vendor.json. The
// version stays in that file so a new pin does not require an edit here.
function sourcePackagePath() {
  const dir = path.join(root, 'payload');
  const names = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((name) => name.endsWith('-full.nupkg') && !name.endsWith('.partial'))
    : [];
  if (names.length !== 1) {
    throw new Error(
      `Expected one payload/*-full.nupkg (found ${names.length}). Run ./install.sh to download the pinned Wispr build.`,
    );
  }
  return path.join(dir, names[0]);
}
const workDir = path.join(root, 'work/app');
const patchesDir = path.join(root, 'patches');
const outputArchive = path.join(root, 'build/resources/app.asar');

// The vendor archive was built on Windows, so its header carries no executable
// flags. These unpacked files must be runnable on Linux.
const linuxExecutables = ['.webpack/main/native_modules/jabra-device-connector/linux/jabra-device-connector'];

// The original archive keeps native addons and the Jabra connector on disk,
// because Node cannot load a .node file or exec a binary from inside an asar.
const packOptions = {
  dot: true,
  unpack: '*.node',
  unpackDir: '.webpack/main/native_modules/jabra-device-connector',
};

function unpackedPaths(archivePath) {
  const { header } = asar.getRawHeader(archivePath);
  const found = new Set();
  const walk = (node, prefix) => {
    for (const [name, entry] of Object.entries(node.files ?? {})) {
      const entryPath = prefix ? `${prefix}/${name}` : name;
      if (entry.files) walk(entry, entryPath);
      else if (entry.unpacked) found.add(entryPath);
    }
  };
  walk(header, '');
  return found;
}

function countOccurrences(text, needle) {
  let count = 0;
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) count++;
  return count;
}

async function loadPatches() {
  if (!fs.existsSync(patchesDir)) return [];
  const names = fs.readdirSync(patchesDir).filter((n) => n.endsWith('.mjs')).sort();
  const patches = [];
  for (const name of names) {
    const { default: patch } = await import(pathToFileURL(path.join(patchesDir, name)));
    patches.push({ name, ...patch });
  }
  return patches;
}

// The Windows package keeps these next to app.asar. Packaged code joins them
// onto process.resourcesPath (build/resources): migrations for the database,
// and assets for the tray and window icons. Release/ is the Windows helper
// and is not extracted.
function extractResourceSiblings() {
  const sourcePackage = sourcePackagePath();
  if (!fs.existsSync(sourcePackage)) throw new Error(`Vendor package not found: ${sourcePackage}`);
  const script = `
import os, shutil, sys, zipfile
nupkg, dest = sys.argv[1], sys.argv[2]
prefix = "lib/net45/resources/"
keep = ("migrations/", "assets/", "ax-inspect")
count = 0
with zipfile.ZipFile(nupkg) as z:
    for info in z.infolist():
        name = info.filename
        if not name.startswith(prefix) or name.endswith("/"):
            continue
        rel = name[len(prefix):]
        if not rel.startswith(keep):
            continue
        out = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with z.open(info) as src, open(out, "wb") as dst:
            shutil.copyfileobj(src, dst)
        count += 1
print(count)
`;
  const result = spawnSync('python3', ['-c', script, sourcePackage, path.join(root, 'build/resources')], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to extract migrations and assets from the vendor package');
  }
  console.log(`  extracted ${result.stdout.trim()} resource files beside the archive`);
}

function overlaySqlite() {
  const source = path.join(root, 'build/native/node_sqlite3.node');
  const target = path.join(workDir, '.webpack/main/native_modules/build/Release/node_sqlite3.node');
  if (!fs.existsSync(source)) {
    throw new Error('Linux sqlite3 build not found at build/native/node_sqlite3.node. Run: npm run native');
  }
  const magic = fs.readFileSync(source).subarray(0, 4).toString('hex');
  if (magic !== '7f454c46') {
    throw new Error('build/native/node_sqlite3.node is not a Linux ELF. Run: npm run native');
  }
  fs.copyFileSync(source, target);
  console.log('  overlaid Linux node_sqlite3.node');
}

function applyPatch(patch) {
  const target = path.join(workDir, patch.file);
  let text = fs.readFileSync(target, 'utf8');
  for (const [index, edit] of patch.edits.entries()) {
    const count = countOccurrences(text, edit.find);
    if (count !== 1) {
      throw new Error(
        `${patch.name}, edit ${index + 1}: expected the search text exactly once in ${patch.file}, found ${count}.`,
      );
    }
    text = text.replace(edit.find, () => edit.replace);
  }
  fs.writeFileSync(target, text);
  console.log(`  applied ${patch.name}: ${patch.description}`);
}

async function main() {
  if (!fs.existsSync(sourceArchive)) throw new Error(`Vendor archive not found: ${sourceArchive}`);

  console.log(`Extracting ${path.relative(root, sourceArchive)} -> ${path.relative(root, workDir)}`);
  fs.rmSync(workDir, { recursive: true, force: true });
  asar.extractAll(sourceArchive, workDir);

  const patches = await loadPatches();
  console.log(`Applying ${patches.length} patch(es)`);
  for (const patch of patches) applyPatch(patch);
  applyBrand(workDir);
  overlaySqlite();

  console.log(`Packing -> ${path.relative(root, outputArchive)}`);
  fs.rmSync(outputArchive, { force: true });
  fs.rmSync(`${outputArchive}.unpacked`, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outputArchive), { recursive: true });
  await asar.createPackageWithOptions(workDir, outputArchive, packOptions);

  const before = unpackedPaths(sourceArchive);
  const after = unpackedPaths(outputArchive);
  const lost = [...before].filter((p) => !after.has(p));
  const added = [...after].filter((p) => !before.has(p));
  for (const p of added) console.log(`  newly unpacked: ${p}`);
  if (lost.length > 0) {
    throw new Error(`These files were unpacked in the original but are now inside the archive:\n  ${lost.join('\n  ')}`);
  }
  for (const file of linuxExecutables) fs.chmodSync(path.join(`${outputArchive}.unpacked`, file), 0o755);
  extractResourceSiblings();
  applyResourceIcons(path.join(root, 'build/resources'));

  console.log(`Done. ${after.size} unpacked file(s), matching the original.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
