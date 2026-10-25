// Force hub dark theme and harden popover/modal surfaces for readable text.

export default {
  description: 'Hub always dark; popover surfaces use Shoutr navy',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'const c="system"===r?l??"light":r,u=n&&("system"!==r||s),',
      replace: 'const c="dark",u=n&&("system"!==r||s),',
    },
    {
      find: 'background-color:var(--shade-white);border-radius:12px;min-height:278px;width:512px',
      replace:
        'background-color:#111B3D;color:var(--foreground);border-radius:12px;min-height:278px;width:512px',
    },
    {
      find:
        'border:1px solid var(--border);background:var(--background);cursor:default;overflow:hidden}.CfMGK8lMCChZjRi8UqAm{box-shadow',
      replace:
        'border:1px solid var(--border);background:#111B3D;color:var(--foreground);cursor:default;overflow:hidden}.CfMGK8lMCChZjRi8UqAm{box-shadow',
    },
    {
      find:
        '.ubf9IXhAaL06tiU4_5Hp{background:var(--background);border:1px solid var(--border);border-radius:10px}',
      replace:
        '.ubf9IXhAaL06tiU4_5Hp{background:#111B3D;color:var(--foreground);border:1px solid var(--border);border-radius:10px}',
    },
    {
      find:
        '.mBstmjWr94HeQ3AEnhVQ{display:flex;width:100%;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background-color:var(--shade-white);cursor:pointer',
      replace:
        '.mBstmjWr94HeQ3AEnhVQ{display:flex;width:100%;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:6px;background-color:#111B3D;color:var(--foreground);cursor:pointer',
    },
  ],
};
