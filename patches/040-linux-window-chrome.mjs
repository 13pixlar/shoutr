// The context menu is a transparent, click-through window the size of the
// work area. On Linux the transparent window is painted solid and type
// "toolbar" leaves it mapped with no title bar, so it covers the screen
// and cannot be closed. Park it offscreen until it is shown, and use a
// normal window so hide() works.
//
// The hub uses frame:false on every platform that is not macOS, which
// removes minimize and close on Linux too. Linux gets a normal frame.
// The hub is also created focusable:false and only made focusable once
// it is shown. Mutter decides move and minimize from that first map, and
// does not revise them, so the window stays put and cannot be minimized.

export default {
  description: 'Give the Linux hub a frame, and keep the context menu offscreen',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: '):Object.assign(t,{frame:!1,autoHideMenuBar:!0})',
      replace: '):Object.assign(t,{frame:"linux"===process.platform,minimizable:!0,closable:!0,movable:!0,autoHideMenuBar:!0})',
    },
    {
      find: 'focusable:!1};w.tD?Object.assign(t,{frame:!1,titleBarStyle:"hidden"',
      replace: 'focusable:"linux"===process.platform};w.tD?Object.assign(t,{frame:!1,titleBarStyle:"hidden"',
    },
    {
      // show() and focus() pull the keyboard away from the text box, so
      // Ctrl+V lands in the hub. On Linux the hub is shown without focus.
      find: 'e.isVisible()||e.show(),e.focus(),l.H8&&T(e)',
      replace: 'e.isVisible()||("linux"===process.platform?e.showInactive():e.show()),"linux"!==process.platform&&e.focus(),l.H8&&T(e)',
    },
    {
      find: 'type:p.tD?"panel":"toolbar",title:"Flow Context Menu"',
      replace: 'type:p.tD?"panel":"linux"===process.platform?"normal":"toolbar",title:"Flow Context Menu"',
    },
    {
      find: 'x:t,y:n,width:r,height:s,show:!1,webPreferences:{...d.g,preload:require("path").resolve(__dirname,"../renderer","contextMenu","preload.js")}',
      replace: 'x:"linux"===process.platform?-2000:t,y:"linux"===process.platform?-2000:n,width:"linux"===process.platform?1:r,height:"linux"===process.platform?1:s,show:!1,webPreferences:{...d.g,preload:require("path").resolve(__dirname,"../renderer","contextMenu","preload.js")}',
    },
    {
      find: ':(_.RA.contextMenuWindow.setAlwaysOnTop(!1),_.RA.contextMenuWindow.hide(),W=Promise.resolve())',
      replace: ':(_.RA.contextMenuWindow.setAlwaysOnTop(!1),_.RA.contextMenuWindow.hide(),"linux"===process.platform&&_.RA.contextMenuWindow.setBounds({x:-2000,y:-2000,width:1,height:1}),W=Promise.resolve())',
    },
  ],
};
