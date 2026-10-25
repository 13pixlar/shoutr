export default {
  description: 'Open http(s) links from hub window.open in the system browser',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: '(o().info("Blocked new window open in hub window:",e),{action:"deny"})',
      replace:
        '(e.startsWith("http://")||e.startsWith("https://"))?(i.shell.openExternal(e).catch(e=>{o().warn("Failed to open external link from hub",{customAttributes:{error:String(e)}})}),{action:"deny"}):(o().info("Blocked new window open in hub window:",e),{action:"deny"})',
    },
  ],
};
