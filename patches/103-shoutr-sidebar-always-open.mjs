// Sidebar always expanded: remove collapse toggle, brand + Pro in the top header row aligned with nav icons.

export default {
  description:
    'Remove sidebar collapse; Shoutr logo and Pro pill in header row aligned with nav icons',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'ee=(0,f.useMemo)(()=>!o.user.renderOptions.sidebarOpen,[o.user.renderOptions.sidebarOpen])',
      replace: 'ee=!1',
    },
    {
      find: 'onToggleSidebarVisibility:()=>{(xe>=w.Ah||n.user.renderOptions.sidebarOpen)&&a(e=>({...e,renderOptions:{...e.renderOptions,sidebarOpen:!e.renderOptions.sidebarOpen}}))}',
      replace: 'onToggleSidebarVisibility:()=>{}',
    },
    {
      find: '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[(0,de.jsx)("div",{className:ts.sidebarAction,onClick:r,children:(0,de.jsx)(Zo.k,{className:ts.icon,src:A3})}),w.H8&&W]}),',
      replace:
        '(0,de.jsxs)("div",{className:ts.sidebarActionsContainer,children:[(0,de.jsx)(Zo.k,{src:Nhe,style:{height:20,width:"auto",display:"block",flexShrink:0}}),(0,de.jsx)(M6,{subscription:p.user.subscription}),(0,de.jsx)("span",{style:{flex:1}}),w.H8&&W]}),',
    },
    {
      find: '(0,de.jsxs)("div",{className:(0,se.A)(JXe.flowSection,ee&&JXe.collapsed),onClick:V,"aria-hidden":"true",children:[(0,de.jsx)(Zo.k,{src:Nhe,className:JXe.flowLogo}),(0,de.jsx)(M6,{subscription:o.user.subscription,className:(0,se.A)(JXe.planPill,ee&&JXe.hidden)})]}),',
      replace: '',
    },
    {
      find: '.pP6aEC3SXCqDUzEsiotp{display:flex;flex-direction:row;align-items:center;gap:8px;margin-left:8px;user-select:none}',
      replace:
        '.pP6aEC3SXCqDUzEsiotp{display:flex;flex-direction:row;align-items:center;gap:6px;margin-left:12px;padding-left:0;user-select:none;min-height:32px}',
    },
    {
      find: '.DYfDg1NbrLuoPJVIlR_w{position:relative;display:flex;height:100%;width:216px;padding:12px;flex-direction:column;align-items:flex-start;gap:10px;flex-shrink:0;align-self:stretch;justify-content:space-between;user-select:none;overflow-y:auto;scrollbar-width:none}',
      replace:
        '.DYfDg1NbrLuoPJVIlR_w{position:relative;display:flex;height:100%;width:216px;padding:8px 12px 12px;flex-direction:column;align-items:flex-start;gap:4px;flex-shrink:0;align-self:stretch;justify-content:space-between;user-select:none;overflow-y:auto;scrollbar-width:none}',
    },
  ],
};
