// Dictation: drop stats aside. Linux hub: fixed ~screenshot size, maximize-only (not resizable).

export default {
  description: 'Remove dictation stats column; Linux hub fixed 1020×690, not resizable',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: ',(0,de.jsxs)("div",{className:B4.aside,children:[(0,de.jsx)(Tae,{}),(0,de.jsx)(Gpe,{})]})',
      replace: '',
    },
  ],
};
