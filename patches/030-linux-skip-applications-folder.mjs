// Module 66539, export Wl. On every non-Windows production build the app
// compares its path with /Applications/Wispr Flow.app and, on a miss, shows
// "Move Flow to Applications folder" and quits. Linux can never match that
// path. Skip the check here. The macOS and Windows architecture checks in
// the same module are already behind their own platform tests.

export default {
  description: 'Do not quit on Linux for the macOS Applications-folder check',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'w=()=>{if(c.H8)return!1;const e=i.app.getAppPath()',
      replace: 'w=()=>{if(c.H8||"linux"===process.platform)return!1;const e=i.app.getAppPath()',
    },
  ],
};
