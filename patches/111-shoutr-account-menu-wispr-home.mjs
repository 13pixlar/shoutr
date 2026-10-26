// Account menu: "Manage account" opens wisprflow.com instead of in-app settings.

export default {
  description: 'Account menu Manage account opens Wispr homepage',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: '(0,de.jsx)("button",{type:"button",className:n6.manageAccountItem,onClick:()=>{t(),(0,Vt.$)(C.tv.OpenSettings,!1,{page:Q.EK.Account})},children:(0,de.jsx)("span",{className:n6.label,children:a("hub_account_manage_account")})})',
      replace:
        '(0,de.jsxs)("button",{type:"button",className:n6.manageAccountItem,onClick:()=>{t(),window.electron.shell.openExternal("https://wisprflow.com")},children:[(0,de.jsx)("span",{className:n6.label,children:a("hub_account_manage_account")}),(0,de.jsx)(Cg.A,{size:16,className:n6.externalLinkIcon})]})',
    },
  ],
};
