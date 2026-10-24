// Sidebar header: one Shoutr mark left-aligned, then the Pro pill.

export default {
  description: 'Show a single left-aligned header logo beside the Pro pill',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'children:[(0,de.jsx)(Zo.k,{src:Nhe,className:JXe.flowLogo}),(0,de.jsx)(Zo.k,{src:jv,className:(0,se.A)(JXe.flowLogo,ee&&JXe.hidden)}),(0,de.jsx)(M6,',
      replace: 'children:[(0,de.jsx)(Zo.k,{src:Nhe,className:JXe.flowLogo}),(0,de.jsx)(M6,',
    },
    {
      find: 'qBZ3M2G8zjbQeUQU8esy{display:flex;flex-direction:row;justify-content:flex-start;align-items:center;gap:2px;width:100%;cursor:pointer;margin-bottom:16px;padding:4px 5px;flex-shrink:0}',
      replace:
        'qBZ3M2G8zjbQeUQU8esy{display:flex;flex-direction:row;justify-content:flex-start;align-items:center;gap:4px;width:100%;cursor:pointer;margin-bottom:16px;padding:4px 5px 4px 0;flex-shrink:0}',
    },
    {
      find: 'qBZ3M2G8zjbQeUQU8esy .sftRca3dyfxgVnn_v4hx{height:25px;display:flex;align-items:center;justify-content:center;margin-left:3px;transition-property:opacity;transition-timing-function:var(--spring-easing);transition-duration:.15s;transition-delay:0}',
      replace:
        'qBZ3M2G8zjbQeUQU8esy .sftRca3dyfxgVnn_v4hx{height:32px;width:auto;display:flex;align-items:center;justify-content:flex-start;margin-left:0;transition-property:opacity;transition-timing-function:var(--spring-easing);transition-duration:.15s;transition-delay:0}',
    },
    {
      find: 'qBZ3M2G8zjbQeUQU8esy .sftRca3dyfxgVnn_v4hx>div{display:flex;align-items:center;justify-content:center}',
      replace:
        'qBZ3M2G8zjbQeUQU8esy .sftRca3dyfxgVnn_v4hx>div{display:flex;align-items:center;justify-content:flex-start}',
    },
    {
      find: 'MWmhP_nULNsqDvLcdkQi{margin-left:6px}',
      replace: 'MWmhP_nULNsqDvLcdkQi{margin-left:0}',
    },
  ],
};
