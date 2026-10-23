// The hub is created as "Flow Hub", then the page sets the title the
// title bar actually shows. app.setName is the name inside Electron, and
// the tray uses it too. The window manager does not: on Linux it reads
// the desktop name that was fixed at startup from package.json, which is
// why --class and setName left WM_CLASS as wispr-flow. setDesktopName
// replaces that before any window is created. The data directory stays
// "Wispr Flow": that path is the existing profile, and renaming it would
// open a new one.

export default {
  description: 'Name the Linux application and hub window shoutr',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'e.app.setName("Wispr Flow")',
      replace:
        'e.app.setName("linux"===process.platform?"Shoutr":"Wispr Flow"),"linux"===process.platform&&(e.app.setDesktopName("shoutr.desktop"),e.app.on("browser-window-created",(t,n)=>{try{n.setIcon(e.nativeImage.createFromPath(require("path").join(process.resourcesPath,"assets/icons/shoutr.png")))}catch(t){}}))',
    },
    {
      find: 'title:"Flow Hub"',
      replace: 'title:"linux"===process.platform?"Shoutr":"Flow Hub"',
    },
    {
      find: 'n.setToolTip("Wispr Flow")',
      replace: 'n.setToolTip("linux"===process.platform?"Shoutr":"Wispr Flow")',
    },
    {
      // A template image is painted as a single-color mask. The Shoutr
      // mark is a color waveform, so Linux keeps the pixels.
      find: 't.setTemplateImage(!0);const n=new r.Tray(t)',
      replace: 't.setTemplateImage("linux"!==process.platform);const n=new r.Tray(t)',
    },
  ],
};
