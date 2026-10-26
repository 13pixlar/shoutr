// Brand row in sidebar, aligned with the nav icons.
// About-page links open externally from the markup in 097.

export default {
  description: 'Sidebar brand row icon alignment',
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
  ],
};
