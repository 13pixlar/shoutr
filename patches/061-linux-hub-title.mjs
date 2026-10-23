// Once the hub page loads, document.title replaces the BrowserWindow
// title. That string is what the title bar shows.

export default {
  description: 'Set the hub page title to shoutr',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'document.title="Wispr Flow"',
      replace: 'document.title="shoutr"',
    },
  ],
};
