// Linux hub window: 1020×690 default (reference screenshot), resizable off, maximize still on.

export default {
  description: 'Linux hub fixed default size; edge resize disabled, maximize allowed',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'const pe=()=>{const e=(0,b.Rj)(w.PF),t={title:"linux"===process.platform?"Shoutr":"Flow Hub",width:e.width,height:e.height,center:!0,resizable:!0,movable:!0,maximizable:!0,fullscreenable:!0,show:!1,transparent:w.tD,hasShadow:!0,webPreferences:{...A.g,preload:require("path").resolve(__dirname,"../renderer","hub","preload.js"),devTools:"development"===w.M0||(0,k.Pv)(p.RA.prefs?.user.email||"")},focusable:"linux"===process.platform};',
      replace:
        'const pe=()=>{const e=(0,b.Rj)(w.PF),shoutrLinuxHub="linux"===process.platform,t={title:shoutrLinuxHub?"Shoutr":"Flow Hub",width:shoutrLinuxHub?1020:e.width,height:shoutrLinuxHub?690:e.height,center:!0,resizable:!shoutrLinuxHub,movable:!0,maximizable:!0,fullscreenable:!shoutrLinuxHub,show:!1,transparent:w.tD,hasShadow:!0,webPreferences:{...A.g,preload:require("path").resolve(__dirname,"../renderer","hub","preload.js"),devTools:"development"===w.M0||(0,k.Pv)(p.RA.prefs?.user.email||"")},focusable:shoutrLinuxHub};',
    },
    {
      find: 'const n=new i.BrowserWindow(t);n.setMinimumSize(w.eh.width,w.eh.height),n.webContents.on("render-process-gone",',
      replace:
        'const n=new i.BrowserWindow(t);shoutrLinuxHub?(n.setMinimumSize(1020,690),n.setSize(1020,690),n.center()):n.setMinimumSize(w.eh.width,w.eh.height),n.webContents.on("render-process-gone",',
    },
  ],
};
