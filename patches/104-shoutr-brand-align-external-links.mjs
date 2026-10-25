// Brand row in sidebar (aligned with nav icons); open https links from the hub in the system browser.

export default {
  description: 'Sidebar brand row icon alignment; allow hub https window.open via shell',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[(0,de.jsx)(Zo.k,{src:Nhe,style:{height:20,width:"auto",display:"block",flexShrink:0}}),(0,de.jsx)(M6,{subscription:p.user.subscription}),(0,de.jsx)("span",{style:{flex:1}}),w.H8&&W]}),',
      replace:
        '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[w.H8&&W]}),',
    },
    {
      find: '"data-testid":"main-navigation",children:(0,de.jsxs)("ul",{children:[w1.map(e=>{',
      replace:
        '"data-testid":"main-navigation",children:(0,de.jsxs)("ul",{children:[(0,de.jsx)("li",{children:(0,de.jsxs)("div",{className:JXe.item,style:{background:"transparent",cursor:"default",marginBottom:4},children:[(0,de.jsx)("div",{className:JXe.icon,children:(0,de.jsx)(Zo.k,{src:Nhe,style:{height:20,width:20,objectFit:"contain"}})}),(0,de.jsx)(M6,{subscription:o.user.subscription})]})}),w1.map(e=>{',
    },
    {
      find: '(0,de.jsx)("a",{href:"https://wisprflow.com",target:"_blank",rel:"noopener noreferrer",style:{color:"var(--primary)"},children:"Visit wisprflow.com"})',
      replace:
        '(0,de.jsx)("a",{href:"https://wisprflow.com",target:"_blank",rel:"noopener noreferrer",style:{color:"var(--primary)",cursor:"pointer"},onClick:e=>{e.preventDefault(),window.electron.shell.openExternal("https://wisprflow.com")},children:"Visit wisprflow.com"})',
    },
  ],
};
