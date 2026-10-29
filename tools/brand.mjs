// Visible Shoutr identity for the packed app.
//
// The product name in menus, toasts, and page copy becomes Shoutr.
// Paths, hosts, protocol names, and code identifiers stay: the signed-in
// profile lives in ~/.config/Wispr Flow, and the servers are addressed
// by their existing hostnames. The color work rewrites the theme block
// the windows already share, so components keep their variables.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PATH_MARKERS = [
  'AppData',
  'APPDATA',
  'Roaming',
  'Library',
  'Application Support',
  '.config',
  'homedir(',
  'Policies',
  'swift-helper',
  'DerivedData',
  'XDG_STATE_HOME',
  'XDG_CONFIG_HOME',
];

// Steps that exist on each palette family in the vendor theme block.
const STEPS = {
  sand: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  vast: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '875', '900', '910', '925', '950'],
  dawn: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  signal: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  lumen: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  fathom: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  pulse: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  flare: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  glow: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  chord: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  red: ['50', '100', '200', '300', '400', '450', '500', '600', '700', '800', '900', '950'],
  orange: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  green: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  blue: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  yellow: ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'],
  success: ['100', '500', '700'],
  warning: ['400', '700'],
  destructive: ['400', '500', '700'],
};

const NAVY = {
  50: '#080D20',
  100: '#0C1430',
  200: '#0E1736',
  300: '#101C3C',
  400: '#111B3D',
  500: '#162244',
  600: '#1B2850',
  700: '#24325A',
  800: '#314268',
  900: '#3E4E72',
  950: '#080D20',
};

const INK = {
  50: '#E8EDFF',
  100: '#D5DCF2',
  200: '#B7C2DE',
  300: '#94A3C4',
  400: '#7685A8',
  500: '#5C6E96',
  600: '#7685A8',
  700: '#3E4E72',
  800: '#293657',
  875: '#1B2850',
  900: '#111B3D',
  910: '#0E1734',
  925: '#0C1430',
  950: '#080D20',
};

const BLUE = {
  50: '#E8EDFF',
  100: '#C9D6FF',
  200: '#1B2850',
  300: '#24325A',
  400: '#6488FF',
  500: '#426CFF',
  600: '#426CFF',
  700: '#E8EDFF',
  800: '#111B3D',
  900: '#0C1430',
  950: '#080D20',
};

const PINK = {
  50: '#FFE4EA',
  100: '#FFC2CE',
  200: '#FF8AA0',
  300: '#FF5C73',
  400: '#FF3D68',
  500: '#FF3D68',
  600: '#E02E58',
  700: '#B81E44',
  800: '#7A1430',
  900: '#4C0C1E',
  950: '#2A0610',
};

const ORANGE = {
  50: '#FFF0E8',
  100: '#FFD8C4',
  200: '#FFB088',
  300: '#FFA57A',
  400: '#FF854A',
  500: '#FF854A',
  600: '#E86E38',
  700: '#C45628',
  800: '#8A3A18',
  900: '#5C2410',
  950: '#2E1008',
};

const AMBER = {
  50: '#FFF4E4',
  100: '#FFE4C2',
  200: '#FFD199',
  300: '#FFB648',
  400: '#FFB648',
  500: '#E09A30',
  600: '#C48420',
  700: '#8A5C12',
  800: '#5C3C0C',
  900: '#3A2508',
  950: '#1A1004',
};

const GREEN = {
  50: '#E5FBF2',
  100: '#C8F6E0',
  200: '#8EE8C0',
  300: '#6EE0B0',
  400: '#51D8A1',
  500: '#51D8A1',
  600: '#51D8A1',
  700: '#3EBE8C',
  800: '#2A8F68',
  900: '#1C6B4E',
  950: '#0E3D2C',
};

const FAMILIES = {
  sand: NAVY,
  vast: INK,
  dawn: BLUE,
  signal: PINK,
  lumen: { ...NAVY, 50: '#E8EDFF' },
  fathom: BLUE,
  pulse: PINK,
  flare: ORANGE,
  glow: AMBER,
  chord: BLUE,
  red: { ...PINK, 450: '#FF5C73' },
  orange: ORANGE,
  green: GREEN,
  blue: {
    50: '#E8EDFF',
    100: '#C9D6FF',
    200: '#9BB0FF',
    300: '#7C9BFF',
    400: '#6488FF',
    500: '#426CFF',
    600: '#426CFF',
    700: '#3458D6',
    800: '#243A8C',
    900: '#1B2850',
    950: '#111B3D',
  },
  yellow: AMBER,
  success: { 100: '#C8F6E0', 500: '#51D8A1', 700: '#3EBE8C' },
  warning: { 400: '#FFB648', 700: '#E09A30' },
  destructive: { 400: '#FF7A8C', 500: '#FF5C73', 700: '#E04560' },
};

const TOKENS =
  '--bg-app:#080D20;--bg-surface:#111B3D;--bg-elevated:#1B2850;--border-default:#293657;' +
  '--text-primary:#E8EDFF;--text-secondary:#94A3C4;--text-muted:#B7C2DE;' +
  '--accent-primary:#426CFF;--accent-hover:#6488FF;' +
  '--voice-pink:#FF3D68;--voice-orange:#FF854A;--voice-amber:#FFB648;' +
  '--gradient-voice:linear-gradient(105deg,#FF2D68 0%,#FF6247 45%,#FFB648 100%);' +
  '--status-success:#51D8A1;--status-warning:#FFB648;--status-error:#FF5C73;--focus-ring:#6488FF;';

const SURFACES =
  '--muted-hover: #1B2850;--background: #080D20;--background-secondary: #111B3D;--background-tertiary: #1B2850;' +
  '--card: #111B3D;--popover: #1B2850;--primary: #426CFF;--foreground: #E8EDFF;--foreground-secondary: #94A3C4;' +
  '--foreground-tertiary: #B7C2DE;--card-foreground: #E8EDFF;--popover-foreground: #E8EDFF;' +
  '--primary-foreground: #080D20;--border: #293657;--ring: #6488FF;';

const STATUS =
  '--destructive: #FF5C73;--destructive-foreground: #080D20;--info: #6488FF;--info-foreground: #E8EDFF;' +
  '--success: #51D8A1;--success-foreground: #080D20;--recording-foreground: #FF3D68;' +
  '--recording-background: color-mix(in srgb, #FF3D68 18%, transparent);--warning: #FF854A;--warning-foreground: #080D20;';

const EXTRA =
  ':focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}' +
  ':is(button,[role=button],[role=menuitem],[role=option],a) svg :is(path,rect,circle,polygon,ellipse):is([fill="#312D37" i],[fill="#49454D" i],[fill="#1A1A1A" i],[fill="#30302F" i],[fill="#1d1d1f" i],[fill="#252525" i]){fill:currentColor}' +
  '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important;scroll-behavior:auto !important}}';

const KEEP_HEX = new Set([
  '#080d20', '#0c1430', '#0e1736', '#101c3c', '#111b3d', '#162244', '#1b2850', '#24325a', '#293657', '#314268', '#3e4e72',
  '#e8edff', '#d5dcf2', '#b7c2de', '#94a3c4', '#7685a8', '#426cff', '#6488ff', '#3458d6', '#243a8c',
  '#ff3d68', '#ff2d68', '#ff6247', '#ff5c73', '#ff854a', '#ffb648', '#51d8a1', '#3ebe8c',
  '#000', '#000000',
]);

const LIGHT_NEUTRALS =
  '--neutral-10: var(--sand-50);--neutral-50: var(--sand-500);--neutral-100: var(--sand-500);--neutral-200: var(--sand-600);--neutral-300: var(--sand-600);--neutral-400: var(--sand-950);--neutral-500: var(--sand-950);--neutral-600: var(--vast-900);--neutral-800: var(--vast-950);--neutral-900: var(--vast-950);';

const READABLE_NEUTRALS =
  '--neutral-10: var(--background);--neutral-50: var(--background-tertiary);--neutral-100: var(--background-tertiary);--neutral-200: var(--border);--neutral-300: var(--border);--neutral-400: var(--foreground);--neutral-500: var(--foreground);--neutral-600: var(--foreground);--neutral-800: var(--foreground);--neutral-900: var(--foreground);';

const DARK_NEUTRALS =
  '--neutral-400: var(--foreground-tertiary);--neutral-500: var(--foreground-tertiary);--neutral-600: var(--foreground-secondary);';

const VISIBLE_NEUTRALS =
  '--neutral-400: var(--foreground);--neutral-500: var(--foreground);--neutral-600: var(--foreground);';

const LIGHT_SURFACES =
  '--muted-hover: #f1ebe1;--background: var(--sand-50);--background-secondary: var(--sand-600);--background-tertiary: var(--sand-500);--card: var(--pure-white);--popover: var(--sand-50);--primary: var(--vast-950);--foreground: var(--vast-950);--foreground-secondary: var(--vast-950);--foreground-tertiary: var(--vast-600);--card-foreground: var(--vast-950);--popover-foreground: var(--vast-950);--primary-foreground: var(--sand-50);--border: var(--sand-600);--ring: var(--sand-950);';

const DARK_SURFACES =
  '--theme: dark;color-scheme:dark;--background: var(--vast-950);--background-secondary: var(--vast-900);--background-tertiary: var(--vast-925);--card: var(--pure-black);--popover: var(--vast-950);--primary: var(--sand-50);--foreground: var(--vast-50);--foreground-secondary: var(--vast-100);--foreground-tertiary: var(--vast-400);--card-foreground: var(--vast-100);--popover-foreground: var(--vast-100);--primary-foreground: var(--vast-950);--border: var(--vast-900);--ring: var(--sand-600);';

const LIGHT_STATUS =
  '--destructive: var(--red-600);--destructive-foreground: var(--red-100);--info: var(--blue-600);--info-foreground: var(--blue-100);--success: var(--green-600);--success-foreground: var(--green-100);--recording-foreground: var(--green-600);--recording-background: var(--green-50);--warning: var(--orange-600);--warning-foreground: var(--orange-100);';

const DARK_STATUS =
  '--destructive: var(--red-450);--destructive-foreground: color-mix(in srgb, var(--red-600) 15%, transparent);--info: var(--blue-400);--info-foreground: color-mix(in srgb, var(--blue-600) 20%, transparent);--success: var(--green-400);--success-foreground: color-mix(in srgb, var(--green-400) 15%, transparent);--recording-foreground: var(--green-400);--recording-background: color-mix(in srgb, var(--green-400) 15%, transparent);--warning: var(--orange-500);--warning-foreground: color-mix(in srgb, var(--orange-500) 15%, transparent);';

const LOGO =
  /=>\(0,(\w+)\.jsxs\)\("svg",\{width:e,height:e,viewBox:"33 33 121 121",fill:"none",xmlns:"http:\/\/www\.w3\.org\/2000\/svg",className:t,"aria-hidden":"true",children:\[[\s\S]*?\]\}\)/;

const STRUCTURAL = new Set(['vast', 'sand', 'dawn', 'fathom', 'lumen', 'chord', 'neutral', 'blue']);

function isPathBrand(text, index, phrase) {
  const before = text.slice(Math.max(0, index - 200), index);
  const after = text.slice(index + phrase.length, index + phrase.length + 16);
  if (PATH_MARKERS.some((marker) => before.includes(marker))) return true;
  if (after.startsWith('.app') || after.startsWith(' Helper')) return true;
  if (after.startsWith('","logs"') || after.startsWith('","Logs"') || after.startsWith('","session')) return true;
  return false;
}

export function replaceBrand(text) {
  text = text.replaceAll('@WisprFlow', '@Shoutr');
  text = text.replaceAll('Wispr Flow', (match, offset) => (isPathBrand(text, offset, match) ? match : 'Shoutr'));
  text = text.replaceAll('wispr flow', (match, offset) => (isPathBrand(text, offset, match) ? match : 'shoutr'));
  text = text.replaceAll('Wispr', (match, offset, source) => {
    const prev = source[offset - 1] ?? '';
    const next = source[offset + match.length] ?? '';
    // A protected "Wispr Flow" path is still in the text. Don't peel the first word off it.
    if (source.slice(offset + match.length, offset + match.length + 5).toLowerCase() === ' flow') return match;
    if (/[A-Za-z0-9_$.-]/.test(prev)) return match;
    if (/[A-Za-z0-9_:-]/.test(next)) return match;
    return 'Shoutr';
  });
  // The short product name is Flow. Leave the profile path ("Wispr Flow") and URL slugs ("Wispr-Flow").
  text = text.replaceAll('Flow', (match, offset, source) => {
    const before = source[offset - 1] ?? '';
    const after = source[offset + match.length] ?? '';
    if (/[A-Za-z0-9_-]/.test(before) || /[A-Za-z0-9_-]/.test(after)) return match;
    if (source.slice(offset - 6, offset) === 'Wispr ') return match;
    return 'Shoutr';
  });
  // The About page names Wispr as the app people pay for. Branding rewrites
  // that to Shoutr first; these phrases put the vendor name back.
  const vendorCredit = [
    ['Shoutr is a great dictation app', 'Wispr Flow is a great dictation app'],
    ['your own Shoutr account', 'your own Wispr account'],
    ["runs on Shoutr's servers", "runs on Wispr's servers"],
    ['Any money you pay still goes to Shoutr.', 'Any money you pay still goes to Wispr Flow.'],
    ['children:"Shoutr webpage"', 'children:"Wispr Flow webpage"'],
    ['Logged in with Shoutr account', 'Logged in with Wispr account'],
  ];
  for (const [from, to] of vendorCredit) {
    text = text.replaceAll(from, to);
  }
  return text;
}

// Hardcoded copies of the vendor palette, outside the token block.
// `color` keeps a light or accent ink. `background` and `border` become surfaces.
const RAW = {
  '#fcfcfb': { ink: '#E8EDFF', surface: '#080D20' },
  '#faf9f7': { ink: '#E8EDFF', surface: '#0C1430' },
  '#f8f7f3': { ink: '#E8EDFF', surface: '#0E1736' },
  '#f7f6f2': { ink: '#E8EDFF', surface: '#101C3C' },
  '#f6f5f1': { ink: '#E8EDFF', surface: '#111B3D' },
  '#f5f4f0': { ink: '#E8EDFF', surface: '#162244' },
  '#eeebe3': { ink: '#94A3C4', surface: '#1B2850' },
  '#ffffeb': { ink: '#E8EDFF', surface: '#111B3D' },
  '#fffffd': { ink: '#E8EDFF', surface: '#111B3D' },
  '#fdfbff': { ink: '#E8EDFF', surface: '#111B3D' },
  '#f0d7ff': { ink: '#6488FF', surface: '#426CFF' },
  '#f4e1ff': { ink: '#6488FF', surface: '#6488FF' },
  '#6c358c': { ink: '#6488FF', surface: '#1B2850' },
  '#034f46': { ink: '#6488FF', surface: '#243A8C' },
  '#1a1a1a': { ink: '#E8EDFF', surface: '#080D20' },
  '#30302f': { ink: '#94A3C4', surface: '#111B3D' },
  '#202020': { ink: '#94A3C4', surface: '#0C1430' },
  '#71716e': { ink: '#7685A8', surface: '#1B2850' },
  '#deddd7': { ink: '#94A3C4', surface: '#1B2850' },
  '#d4f6e1': { ink: '#51D8A1', surface: '#12382C' },
  '#d1fae5': { ink: '#51D8A1', surface: '#12382C' },
  '#34d399': { ink: '#51D8A1', surface: '#51D8A1' },
  '#10b981': { ink: '#51D8A1', surface: '#51D8A1' },
  '#4fbf78': { ink: '#51D8A1', surface: '#51D8A1' },
  '#ffa946': { ink: '#FFB648', surface: '#FFB648' },
  '#ef4444': { ink: '#FF5C73', surface: '#FF5C73' },
  '#ff5757': { ink: '#FF5C73', surface: '#FF5C73' },
};

function retintHardcoded(text) {
  text = text.replaceAll('border-radius:50%;background:#fff', 'border-radius:50%;background:#E8EDFF');
  text = text.replaceAll('background:#fff', 'background:#111B3D');
  text = text.replaceAll('background:#ffffff', 'background:#111B3D');
  text = text.replaceAll('background:var(--pure-white)', 'background:#111B3D');
  text = text.replaceAll('background-color:var(--pure-white)', 'background-color:#111B3D');
  text = text.replaceAll('background-color:var(--shade-white)', 'background-color:#111B3D');
  text = text.replaceAll('background:var(--shade-white)', 'background:#111B3D');
  text = text.replaceAll('--shade-white: var(--background);', '--shade-white: #111B3D;');
  for (const gray of ['#e8e8e8', '#ececec', '#e2e2e2', '#eeeeee']) {
    text = text.replaceAll(`solid ${gray}`, 'solid #293657');
  }
  text = text.replaceAll('solid #eee;', 'solid #293657;');
  text = text.replaceAll('solid #eee ', 'solid #293657 ');
  text = text.replaceAll('background-color:#e5ddf9;padding:0 20px;border-radius:6px;color:#000', 'background-color:#1B2850;padding:0 20px;border-radius:6px;color:#E8EDFF');
  text = text.replaceAll('background-color:var(--dawn-200);color:#000', 'background-color:var(--dawn-200);color:#E8EDFF');
  text = text.replaceAll('background-color:#222;color:#929292', 'background-color:#1B2850;color:#E8EDFF');
  text = liftLeftovers(text);
  const retinted = text.replace(
    /(background(?:-color)?|color|border(?:-color)?|fill|stroke|outline)(\s*:\s*)(#[0-9a-fA-F]{6})(?![0-9a-fA-F])/gi,
    (match, prop, space, hex) => {
      const role = RAW[hex.toLowerCase()];
      if (!role) return match;
      const ink = prop.toLowerCase() === 'color' || prop.toLowerCase() === 'fill' || prop.toLowerCase() === 'stroke';
      return `${prop}${space}${ink ? role.ink : role.surface}`;
    },
  );
  return retinted.replace(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g, (hex) => {
    const role = RAW[hex.toLowerCase()];
    return role ? role.ink : hex;
  });
}

function liftLeftovers(text) {
  return text.replace(
    /(?<![-\w])(color|fill|stroke|background(?:-color)?|border(?:-color)?)(\s*:\s*)(#[0-9a-fA-F]{3,8})(?![0-9a-fA-F])/gi,
    (match, prop, space, hex) => {
      let full = hex.toLowerCase();
      if (full.length === 4) full = `#${full[1]}${full[1]}${full[2]}${full[2]}${full[3]}${full[3]}`;
      if (KEEP_HEX.has(full)) return match;
      const kind = prop.toLowerCase();
      const ink = kind === 'color' || kind === 'fill' || kind === 'stroke';
      const L = luminance(full);
      if (ink && L < 0.2) return `${prop}${space}#E8EDFF`;
      if (ink && L < 0.45 && contrast(full, '#111B3D') < 4.5) return `${prop}${space}#E8EDFF`;
      if (!ink && L > 0.72) return `${prop}${space}${kind.startsWith('border') ? '#293657' : '#1B2850'}`;
      return match;
    },
  );
}

function channel(hex, index) {
  const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  return 0.2126 * channel(full, 0) + 0.7152 * channel(full, 1) + 0.0722 * channel(full, 2);
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

// The vendor light theme uses dark steps as text and light steps as surfaces.
// Both themes now sit on navy, so a dark step used as text is lifted and a
// light structural surface is brought back down.
// The readable neutral map points high steps at --foreground so menu labels stay
// visible on navy. Some surfaces still use those steps as backgrounds, which
// would paint the toast cards the same light ink color.
const NEUTRAL_SURFACE = {
  50: 'var(--background-tertiary)',
  100: 'var(--background-tertiary)',
  200: 'var(--border)',
  300: 'var(--border)',
  600: 'var(--background-secondary)',
  800: 'var(--card)',
  900: 'var(--background)',
};

const NEUTRAL_INK = {
  100: '#B7C2DE',
  200: '#B7C2DE',
  400: '#94A3C4',
  500: '#94A3C4',
  600: '#94A3C4',
  800: '#E8EDFF',
  900: '#E8EDFF',
};

export function retintNeutralUsage(text) {
  text = text.replace(
    /(?<![-\w])(background(?:-color)?)(\s*:\s*)var\(--neutral-(\d+)\)/g,
    (match, prop, space, step) => {
      const surface = NEUTRAL_SURFACE[Number(step)];
      return surface ? `${prop}${space}${surface}` : match;
    },
  );
  return text.replace(
    /(?<![-\w])(color|fill|stroke|caret-color)(\s*:\s*)var\(--neutral-(\d+)\)/g,
    (match, prop, space, step) => {
      const ink = NEUTRAL_INK[Number(step)];
      return ink ? `${prop}${space}${ink}` : match;
    },
  );
}

export function retintRoles(text) {
  text = text.replace(
    /(?<![-\w])(color|fill|stroke|caret-color)(\s*:\s*)var\(--(shade-white|background|background-secondary|background-tertiary|card|popover|pure-black)\)/g,
    '$1$2#E8EDFF',
  );
  return text.replace(
    /(?<![-\w])(color|fill|stroke|caret-color|background(?:-color)?|border(?:-color)?)(\s*:\s*)var\(--([a-z]+)-(\d+)\)/g,
    (match, prop, space, family, step) => {
      const color = FAMILIES[family]?.[step];
      if (!color) return match;
      const textProp = /^(color|fill|stroke|caret-color)$/.test(prop);
      // Lift muddy dark ink. Leave the electric blue and the voice colors alone.
      if (textProp && luminance(color) < 0.18 && contrast(color, '#111B3D') < 4.5) return `${prop}${space}#E8EDFF`;
      if (!textProp && STRUCTURAL.has(family) && luminance(color) > 0.45) return `${prop}${space}#1B2850`;
      return match;
    },
  );
}

function replaceOnce(text, find, replace, label) {
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`${label}: expected the theme text once, found ${count}`);
  return text.replace(find, () => replace);
}

export function retheme(text) {
  let next = text;
  next = replaceOnce(next, '--theme: light;color-scheme:light;', `--theme: dark;color-scheme:dark;${TOKENS}`, 'theme');
  next = replaceOnce(next, LIGHT_SURFACES, SURFACES, 'light surfaces');
  next = replaceOnce(next, DARK_SURFACES, `--theme: dark;color-scheme:dark;${SURFACES}`, 'dark surfaces');
  next = replaceOnce(next, LIGHT_STATUS, STATUS, 'light status');
  next = replaceOnce(next, DARK_STATUS, STATUS, 'dark status');
  next = replaceOnce(next, '--lumen: #ffffeb;--fathom: #034f46;--accent: #fff', '--lumen: #E8EDFF;--fathom: #243A8C;--accent: #FFB648', 'brand colors');
  next = replaceOnce(next, '--shade-white: #fff;--shade-black: #000;', '--shade-white: #111B3D;--shade-black: #E8EDFF;', 'shade');
  next = replaceOnce(next, LIGHT_NEUTRALS, READABLE_NEUTRALS, 'light neutrals');
  next = next.replaceAll(DARK_NEUTRALS, VISIBLE_NEUTRALS);
  next = next.replace(/--([a-z]+)-(\d+): (#[0-9a-fA-F]{3,8})/g, (match, name, step) => {
    const family = FAMILIES[name];
    if (!family) return match;
    const color = family[step];
    if (!color) throw new Error(`No Shoutr color for ${name}-${step}`);
    return `--${name}-${step}: ${color}`;
  });
  next = retintNeutralUsage(retintRoles(retintHardcoded(next)));
  next = replaceOnce(next, '}html[data-theme-transition=fade]', `}${EXTRA}html[data-theme-transition=fade]`, 'focus and motion');
  for (const step of Object.keys(STEPS)) {
    if (!FAMILIES[step]) throw new Error(`Missing family ${step}`);
  }
  return next;
}

function walkTextFiles(dir) {
  const found = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) found.push(full);
    }
  };
  visit(dir);
  return found;
}

function inlineLogo(text, dataUrl) {
  const matches = text.match(new RegExp(LOGO.source, 'g'));
  if (!matches) return { text, count: 0 };
  const next = text.replace(LOGO, (match, helper) =>
    `=>(0,${helper}.jsx)("img",{src:"data:image/png;base64,${dataUrl}",width:e,height:e,className:t,alt:"","aria-hidden":"true",draggable:!1,style:{display:"block"}})`,
  );
  return { text: next, count: matches.length };
}

function iconDataUrl(workDir) {
  const script = path.join(root, 'tools/brand_icons.py');
  const result = spawnSync(
    'python3',
    [
      script,
      '--transparent',
      path.join(root, 'img/app_icon_transparent_bg.png'),
      '--embossed',
      path.join(root, 'img/app_icon_embossed.png'),
      '--renderer',
      path.join(workDir, '.webpack/renderer'),
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr || 'Could not write the Shoutr marks');
  const line = result.stdout.trim().split('\n').pop();
  if (!line || line.length < 100) throw new Error('The icon encoder did not return a PNG');
  return line;
}

export function applyBrand(workDir) {
  let flow = 0;
  let wispr = 0;
  for (const file of walkTextFiles(workDir)) {
    const original = fs.readFileSync(file, 'utf8');
    let text = replaceBrand(original);
    if (text.includes(':root,[data-theme=light]{')) text = retheme(text);
    if (text !== original) fs.writeFileSync(file, text);
    flow += original.split('Wispr Flow').length - 1;
    wispr += original.split('Wispr').length - 1;
  }
  const dataUrl = iconDataUrl(workDir);
  let logos = 0;
  for (const file of walkTextFiles(workDir)) {
    if (file.endsWith(`${path.sep}hub${path.sep}index.js`)) continue;
    const original = fs.readFileSync(file, 'utf8');
    if (!original.includes('viewBox:"33 33 121 121"')) continue;
    const replaced = inlineLogo(original, dataUrl);
    if (replaced.count !== 1) {
      throw new Error(`${path.relative(workDir, file)}: expected one waveform icon, found ${replaced.count}`);
    }
    fs.writeFileSync(file, replaced.text);
    logos += 1;
  }
  if (logos !== 2) throw new Error(`Expected the waveform icon in 2 windows (not the hub), found ${logos}`);
  const hubHtml = path.join(workDir, '.webpack/renderer/hub/index.html');
  const html = fs.readFileSync(hubHtml, 'utf8').replace('background-color: white;', 'background-color: #080D20; color: #E8EDFF;');
  fs.writeFileSync(hubHtml, html);
  const main = fs.readFileSync(path.join(workDir, '.webpack/main/index.js'), 'utf8');
  if (!main.includes('.config"),"Wispr Flow"')) {
    throw new Error('The profile directory was renamed. It has to stay Wispr Flow so the existing account opens.');
  }
  copyMascots(workDir);
  console.log(`  branded visible copy (saw ${flow} "Wispr Flow" and ${wispr} "Wispr" before the pass) and ${logos} waveform icons`);
}

// The hub pages reference these by a path next to the other renderer media.
// Repack starts from a fresh extract, so the copy has to happen here.
function copyMascots(workDir) {
  const dest = path.join(workDir, '.webpack/renderer/static/media');
  fs.mkdirSync(dest, { recursive: true });
  for (const name of [
    'shouter-about.png',
    'shouter-insights.png',
    'shouter-dictation.png',
    'shouter-dictionary.png',
  ]) {
    const from = path.join(root, 'img', name);
    if (!fs.existsSync(from)) throw new Error(`Missing mascot image: ${from}`);
    fs.copyFileSync(from, path.join(dest, name));
  }
}

export function applyResourceIcons(resourcesDir) {
  const result = spawnSync(
    'python3',
    [
      path.join(root, 'tools/brand_icons.py'),
      '--transparent',
      path.join(root, 'img/app_icon_transparent_bg.png'),
      '--embossed',
      path.join(root, 'img/app_icon_embossed.png'),
      '--resources',
      resourcesDir,
    ],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(result.stderr || 'Could not write the resource icons');
  console.log('  overlaid Shoutr tray, window, and logo icons');
}
