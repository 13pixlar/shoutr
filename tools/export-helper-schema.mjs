// Export the Electron <-> helper IPC contract from Wispr Flow's main bundle.
//
//   node tools/export-helper-schema.mjs
//
// Wispr generates TypeScript, Swift, and C# types from one JSON schema with
// quicktype. The TypeScript converter that ships in the bundle keeps a "type
// map" describing every message and field. This script finds that map,
// evaluates only that data literal in an empty sandbox, and writes:
//
//   work/helper-schema.json   JSON Schema (draft 2020-12) of every type
//   work/helper-protocol.md   readable list of messages and their fields
//
// Both outputs are derived from vendor code, so they live under work/ (ignored).

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import * as asar from '@electron/asar';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceArchive = path.join(root, 'payload/app/lib/net45/resources/app.asar');
const outDir = path.join(root, 'work');

// Return the index of the bracket that closes the one at `start`, skipping
// over string and template literals.
function findClosing(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unbalanced bracket starting at offset ${start}`);
}

// quicktype's tiny constructors, e.g. `function F(e){return{ref:e}}`. Their
// minified names change between builds, so match them by body.
const constructorShapes = [
  /function [\w$]+\(e\)\{return\{literal:e\}\}/,
  /function [\w$]+\(e\)\{return\{arrayItems:e\}\}/,
  /function [\w$]+\(\.\.\.e\)\{return\{unionMembers:e\}\}/,
  /function [\w$]+\(e,t\)\{return\{props:e,additional:t\}\}/,
  /function [\w$]+\(e\)\{return\{props:\[\],additional:e\}\}/,
  /function [\w$]+\(e\)\{return\{ref:e\}\}/,
];

function readTypeMap(bundle) {
  const anchor = /([\w$]+)=\{HelperAPI:/.exec(bundle);
  if (!anchor) throw new Error('Could not find the quicktype type map ({HelperAPI: ...}).');
  const open = anchor.index + anchor[1].length + 1;
  const literal = bundle.slice(open, findClosing(bundle, open) + 1);

  const preamble = bundle.slice(Math.max(0, open - 20000), open);
  const constructors = constructorShapes.map((shape) => {
    const found = preamble.match(new RegExp(shape.source, 'g'));
    if (!found) throw new Error(`Could not find quicktype constructor matching ${shape}`);
    return found.at(-1);
  });

  // Only the constructors and the data literal run, with no access to Node.
  const sandbox = vm.createContext({});
  const script = `${constructors.join('\n')}\n({ typeMap: (${literal}), DateType: Date })`;
  return vm.runInContext(script, sandbox, { timeout: 2000 });
}

// Request kinds that Electron itself handles are sent by the helper.
function readElectronHandledRequests(bundle, requestNames) {
  const anchor = /static handlers=([\w$]+);static writeQueue/.exec(bundle);
  if (!anchor) throw new Error('Could not find the HelperAPI client handler table.');
  const mapStart = bundle.lastIndexOf(`${anchor[1]}=new Map(`, anchor.index);
  const open = mapStart + `${anchor[1]}=new Map`.length;
  const body = bundle.slice(open, findClosing(bundle, open));
  return new Set(requestNames.filter((name) => body.includes(`["${name}",`)));
}

function makeConverters(DateType) {
  const isOptional = (typ) => typ === undefined || (typ?.unionMembers ?? []).includes(undefined);
  const withoutUndefined = (members) => members.filter((m) => m !== undefined);

  function toSchema(typ) {
    if (typ === null) return { type: 'null' };
    if (typ === 'any') return {};
    if (typ === '') return { type: 'string' };
    if (typ === true) return { type: 'boolean' };
    if (typ === DateType) return { type: 'string', format: 'date-time' };
    if (typeof typ === 'number') return { type: Number.isInteger(typ) ? 'integer' : 'number' };
    if (Array.isArray(typ)) return { enum: typ };
    if (typ.ref !== undefined) return { $ref: `#/$defs/${typ.ref}` };
    if (typ.literal !== undefined) return { const: typ.literal };
    if (typ.arrayItems !== undefined) return { type: 'array', items: toSchema(typ.arrayItems) };
    if (typ.unionMembers !== undefined) {
      const members = withoutUndefined(typ.unionMembers).map(toSchema);
      return members.length === 1 ? members[0] : { anyOf: members };
    }
    if (typ.props !== undefined) {
      const schema = { type: 'object', properties: {} };
      const required = [];
      for (const prop of typ.props) {
        schema.properties[prop.json] = toSchema(prop.typ);
        if (!isOptional(prop.typ)) required.push(prop.json);
      }
      if (required.length > 0) schema.required = required;
      if (typ.additional === false) schema.additionalProperties = false;
      else if (typ.additional !== undefined && typ.additional !== 'any') {
        schema.additionalProperties = toSchema(typ.additional);
      }
      return schema;
    }
    throw new Error(`Unknown quicktype type: ${JSON.stringify(typ)}`);
  }

  function describe(typ) {
    if (typ === null) return 'null';
    if (typ === 'any') return 'any';
    if (typ === '') return 'string';
    if (typ === true) return 'boolean';
    if (typ === DateType) return 'date-time';
    if (typeof typ === 'number') return Number.isInteger(typ) ? 'integer' : 'number';
    if (Array.isArray(typ)) return typ.map((v) => JSON.stringify(v)).join(' | ');
    if (typ.ref !== undefined) return typ.ref;
    if (typ.literal !== undefined) return JSON.stringify(typ.literal);
    if (typ.arrayItems !== undefined) return `${describe(typ.arrayItems)}[]`;
    if (typ.unionMembers !== undefined) return withoutUndefined(typ.unionMembers).map(describe).join(' | ');
    if (typ.props !== undefined && typ.props.length === 0) return `map<string, ${describe(typ.additional)}>`;
    return 'object';
  }

  return { toSchema, describe, isOptional };
}

function payloadRef(typ) {
  if (typ === undefined) return null;
  const members = typ?.unionMembers ?? [typ];
  return members.find((m) => m?.ref !== undefined)?.ref ?? null;
}

function main() {
  const bundle = asar.extractFile(sourceArchive, '.webpack/main/index.js').toString('utf8');
  const { typeMap, DateType } = readTypeMap(bundle);
  const { toSchema, describe, isOptional } = makeConverters(DateType);

  const metadataKeys = new Set(['uuid', 'sentryTrace', 'sentryBaggage']);
  const requests = typeMap.HelperAPIRequest.props.filter((p) => !metadataKeys.has(p.json));
  const responses = typeMap.HelperAPIResponse.props.filter((p) => !metadataKeys.has(p.json));
  const fromHelper = readElectronHandledRequests(bundle, requests.map((p) => p.json));

  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Wispr Flow helper IPC (recovered)',
    description: 'Recovered from the quicktype type map in Wispr Flow 1.6.1209 .webpack/main/index.js.',
    $ref: '#/$defs/HelperAPI',
    $defs: Object.fromEntries(Object.entries(typeMap).map(([name, typ]) => [name, toSchema(typ)])),
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'helper-schema.json'), `${JSON.stringify(schema, null, 2)}\n`);

  // Expand named object and enum types inline, a few levels deep, so each
  // message shows its real fields rather than just `payload: SomePayload`.
  const maxDepth = 4;
  const maxEnumValues = 12;
  const fieldLines = (typeName, depth = 1, seen = new Set()) => {
    const typ = typeMap[typeName];
    const pad = '  '.repeat(depth);
    if (Array.isArray(typ)) {
      const shown = typ.slice(0, maxEnumValues).map((v) => JSON.stringify(v)).join(' | ');
      const more = typ.length > maxEnumValues ? ` … (${typ.length - maxEnumValues} more)` : '';
      return [`${pad}- one of: ${shown}${more}`];
    }
    if (!typ?.props?.length || seen.has(typeName) || depth > maxDepth) return [];
    const lines = [];
    for (const p of typ.props) {
      lines.push(`${pad}- \`${p.json}${isOptional(p.typ) ? '?' : ''}\`: ${describe(p.typ)}`);
      const nested = payloadRef(p.typ) ?? payloadRef(p.typ?.arrayItems);
      if (nested) lines.push(...fieldLines(nested, depth + 1, new Set([...seen, typeName])));
    }
    return lines;
  };
  const section = (title, props) => {
    const lines = [`## ${title} (${props.length})`, ''];
    for (const prop of props) {
      const ref = payloadRef(prop.typ);
      lines.push(`- **${prop.json}**${ref && ref !== prop.json ? ` (payload type \`${ref}\`)` : ''}${ref ? '' : ': flag, no payload'}`);
      if (ref) lines.push(...fieldLines(ref));
    }
    lines.push('');
    return lines;
  };

  const markdown = [
    '# Wispr Flow helper IPC, recovered',
    '',
    'Generated by `tools/export-helper-schema.mjs` from Wispr Flow 1.6.1209. Field types come from the quicktype type map. A trailing `?` marks an optional field.',
    '',
    'Framing: one JSON object per message, `{"HelperAPIRequest": {...}}` or `{"HelperAPIResponse": {...}}`, with `uuid` on both. `+` is escaped as `+1` and `|` as `+2`, and messages end with `|`. Electron writes to the helper\'s stdin. The helper writes to fd 3.',
    '',
    'Direction: a request is listed as helper → Electron when Electron registers a handler for it. All other requests are assumed to go Electron → helper. That split is inferred from the handler table, not observed on the wire.',
    '',
    ...section('Requests, helper → Electron', requests.filter((p) => fromHelper.has(p.json))),
    ...section('Requests, Electron → helper', requests.filter((p) => !fromHelper.has(p.json))),
    ...section('Responses', responses),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, 'helper-protocol.md'), markdown);

  console.log(
    `Wrote work/helper-schema.json (${Object.keys(typeMap).length} types) and work/helper-protocol.md: ` +
      `${requests.length} requests (${fromHelper.size} handled by Electron), ${responses.length} responses.`,
  );
}

main();
