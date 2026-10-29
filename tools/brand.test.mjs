import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { replaceBrand, retheme, retintNeutralUsage, retintRoles, retintSemanticSurfaces } from './brand.mjs';

test('visible product names become Shoutr', () => {
  assert.equal(replaceBrand('Open Wispr Flow'), 'Open Shoutr');
  assert.equal(replaceBrand('Quit Wispr'), 'Quit Shoutr');
  assert.equal(replaceBrand("I'm using Wispr Notetaker"), "I'm using Shoutr Notetaker");
  assert.equal(replaceBrand('whisper into @WisprFlow, which'), 'whisper into @Shoutr, which');
  assert.equal(replaceBrand('How would you like to use Flow first?'), 'How would you like to use Shoutr first?');
  assert.equal(replaceBrand('Welcome to Flow Pro'), 'Welcome to Shoutr Pro');
  assert.equal(replaceBrand('for-Wispr-Flow'), 'for-Wispr-Flow');
  assert.equal(replaceBrand('the wispr flow window'), 'the shoutr window');
});

test('the About page still names Wispr as the service people pay', () => {
  const about = [
    'Wispr Flow is a great dictation app. You hold a key, talk, and it types into the window in front of you.',
    'Shoutr is a Linux client for that same dictation. You sign in with your own Wispr account, and the speech still runs on Wispr\'s servers. Any money you pay still goes to Wispr Flow.',
    'children:"Wispr Flow webpage"',
    'Logged in with Wispr account',
  ].join(' ');
  const next = replaceBrand(about);
  assert.match(next, /Wispr Flow is a great dictation app/);
  assert.match(next, /Shoutr is a Linux client/);
  assert.match(next, /your own Wispr account/);
  assert.match(next, /Wispr's servers/);
  assert.match(next, /goes to Wispr Flow/);
  assert.match(next, /children:"Wispr Flow webpage"/);
  assert.match(next, /Logged in with Wispr account/);
});

test('paths, hosts, and identifiers stay', () => {
  const profile = 'o().join(i().homedir(),".config"),"Wispr Flow"';
  assert.equal(replaceBrand(profile), profile);
  const logs = 'o().join(i().homedir(),".local","state"),"Wispr Flow","logs"';
  assert.equal(replaceBrand(logs), logs);
  const helper = 'Contents/MacOS/Wispr Flow Helper.exe';
  assert.equal(replaceBrand(helper), helper);
  assert.equal(replaceBrand('https://api.wisprflow.ai'), 'https://api.wisprflow.ai');
  assert.equal(replaceBrand('com.electron.wispr-flow'), 'com.electron.wispr-flow');
  assert.equal(replaceBrand('handleWisprMessage'), 'handleWisprMessage');
  assert.equal(replaceBrand('e.WisprContacts'), 'e.WisprContacts');
  assert.equal(replaceBrand('menus_open_wispr_flow'), 'menus_open_wispr_flow');
  assert.equal(replaceBrand('Wispr:"wispr"'), 'Wispr:"wispr"');
});

test('light semantic steps become navy warning sheets when used as backgrounds', () => {
  const sample = 'background:var(--orange-100);background-color:var(--green-50);color:var(--orange-700)';
  const next = retintSemanticSurfaces(sample);
  assert.match(next, /background:color-mix\(in srgb, var\(--warning\) 18%, var\(--background-secondary\)\)/);
  assert.match(next, /background-color:color-mix\(in srgb, var\(--success\) 18%, var\(--background-secondary\)\)/);
  assert.match(next, /color:var\(--orange-700\)/);
});

test('neutral steps keep navy surfaces when used as toast backgrounds', () => {
  const sample = [
    'background:var(--neutral-900)',
    'background-color:var(--neutral-800)',
    'color:var(--neutral-900)',
    'color:var(--neutral-600)',
  ].join(';');
  const next = retintNeutralUsage(sample);
  assert.match(next, /background:var\(--background\)/);
  assert.match(next, /background-color:var\(--card\)/);
  assert.match(next, /color:#E8EDFF/);
  assert.match(next, /color:#94A3C4/);
});

test('dark text on navy is lifted and light sheets come down', () => {
  const sample = [
    'color:var(--vast-950)',
    'background:var(--vast-950)',
    'color:var(--shade-white)',
    'background:var(--shade-white)',
    'background:var(--vast-100)',
    '--foreground: var(--vast-50)',
    'color:var(--dawn-500)',
  ].join(';');
  const next = retintRoles(sample);
  assert.match(next, /color:#E8EDFF/);
  assert.match(next, /background:var\(--vast-950\)/);
  assert.match(next, /background:var\(--shade-white\)/);
  assert.match(next, /background:#1B2850/);
  assert.match(next, /--foreground: var\(--vast-50\)/);
  assert.match(next, /color:var\(--dawn-500\)/);
});

test('the shared theme block takes the Shoutr colors', () => {
  const file = 'work/app/.webpack/renderer/hub/index.js';
  if (!fs.existsSync(file)) return;
  const original = fs.readFileSync(file, 'utf8');
  if (!original.includes('--sand-50: #fcfcfb')) return;
  const next = retheme(original);
  assert.match(next, /--background: #080D20/);
  assert.match(next, /--primary: #426CFF/);
  assert.match(next, /--recording-foreground: #FF3D68/);
  assert.match(next, /--gradient-voice:linear-gradient/);
  assert.match(next, /prefers-reduced-motion:reduce/);
  assert.equal(next.includes('#fcfcfb'), false);
  assert.equal(next.includes('--theme: light'), false);
});
