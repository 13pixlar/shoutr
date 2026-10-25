// Larger Shoutr mark on the header row with the account icon.
// The nav then starts at the top of the sidebar, level with the content panel.

export default {
  description: 'Larger header logo beside the account icon; nav aligns with the content panel',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[w.H8&&W]}),',
      replace:
        '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[(0,de.jsx)(Zo.k,{src:Nhe,style:{height:36,width:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}),(0,de.jsx)(M6,{subscription:p.user.subscription}),w.H8&&W]}),',
    },
    {
      find: '"data-testid":"main-navigation",children:(0,de.jsxs)("ul",{children:[(0,de.jsx)("li",{children:(0,de.jsxs)("div",{className:JXe.item,style:{background:"transparent",cursor:"default",marginBottom:4},children:[(0,de.jsx)("div",{className:JXe.icon,children:(0,de.jsx)(Zo.k,{src:Nhe,style:{height:20,width:20,objectFit:"contain"}})}),(0,de.jsx)(M6,{subscription:o.user.subscription})]})}),w1.map(e=>{',
      replace: '"data-testid":"main-navigation",children:(0,de.jsxs)("ul",{children:[w1.map(e=>{',
    },
    {
      find: '.DYfDg1NbrLuoPJVIlR_w{position:relative;display:flex;height:100%;width:216px;padding:8px 12px 12px;flex-direction:column;align-items:flex-start;gap:4px;flex-shrink:0;align-self:stretch;justify-content:space-between;user-select:none;overflow-y:auto;scrollbar-width:none}',
      replace:
        '.DYfDg1NbrLuoPJVIlR_w{position:relative;display:flex;height:100%;width:216px;padding:0 12px 12px;flex-direction:column;align-items:flex-start;gap:4px;flex-shrink:0;align-self:stretch;justify-content:space-between;user-select:none;overflow-y:auto;scrollbar-width:none}',
    },
    {
      // The injected mark keeps its own 21×20 attributes, so the wrapper size does not scale it.
      find: '.pP6aEC3SXCqDUzEsiotp{display:flex;flex-direction:row;align-items:center;gap:6px;margin-left:12px;padding-left:0;user-select:none;min-height:32px}',
      replace:
        '.pP6aEC3SXCqDUzEsiotp{display:flex;flex-direction:row;align-items:center;gap:8px;margin-left:12px;padding-left:0;user-select:none;min-height:36px}.pP6aEC3SXCqDUzEsiotp svg{width:36px;height:36px;display:block;flex-shrink:0}',
    },
    {
      // Linux uses the native frame. This slot is the empty macOS traffic-light gutter.
      find: '.dqwmlJtoiCGaDKGr1ngo{width:52px;height:12px;margin:8px 8px 8px 16px;flex-shrink:0;display:flex;flex-direction:row;gap:8px;align-items:center;-webkit-app-region:no-drag}',
      replace:
        '.dqwmlJtoiCGaDKGr1ngo{width:0;height:0;margin:0;overflow:hidden;flex-shrink:0;display:flex;flex-direction:row;gap:0;align-items:center;-webkit-app-region:no-drag}',
    },
  ],
};
