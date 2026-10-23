// Module 81609 has two platforms: darwin and win32. Anything else, including
// Linux, falls through to the macOS directories. ut() is left alone, so Linux
// still reports the client type the stock app would: desktop_mac.

export default {
  description: 'Give Linux its own data and log directories',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'u="win32"===process.platform,',
      replace: 'u="win32"===process.platform,isLinux="linux"===process.platform,',
    },
    {
      find: 'm=u?o().join(i().homedir(),"AppData","Roaming","Wispr Flow","Logs"):o().join(i().homedir(),"Library","Logs","Wispr Flow")',
      replace:
        'm=isLinux?o().join(process.env.XDG_STATE_HOME||o().join(i().homedir(),".local","state"),"Wispr Flow","logs"):u?o().join(i().homedir(),"AppData","Roaming","Wispr Flow","Logs"):o().join(i().homedir(),"Library","Logs","Wispr Flow")',
    },
    {
      find: 'u?o().join(process.env.APPDATA||"","Wispr Flow"):o().join(i().homedir(),"Library","Application Support","Wispr Flow")',
      replace:
        'isLinux?o().join(process.env.XDG_CONFIG_HOME||o().join(i().homedir(),".config"),"Wispr Flow"):u?o().join(process.env.APPDATA||"","Wispr Flow"):o().join(i().homedir(),"Library","Application Support","Wispr Flow")',
    },
  ],
};
