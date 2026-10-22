// Rebuild Wispr Flow's app.asar with our patches applied.
//
//   node tools/repack.mjs
//
// 1. Extract the vendor archive (and its app.asar.unpacked sibling) into work/app/.
// 2. Apply every patch in patches/*.mjs, in file-name order.
// 3. Pack work/app/ into build/resources/app.asar and check that the same
//    files ended up outside the archive as in the original.
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as asar from '@electron/asar';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArchive = path.join(root, 'payload/app/lib/net45/resources/app.asar');
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

  console.log(`Done. ${after.size} unpacked file(s), matching the original.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
