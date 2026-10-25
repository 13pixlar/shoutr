// Hub polish: About in a panel, default tab on show, no dictation/dictionary banners,
// no voice-profile card, no Insights share ring, modal surfaces match status toasts.

export default {
  description:
    'Hub opens on About, remove banners/share/voice card, modal blue surfaces',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'W=(0,f.useCallback)(e=>{B.current=!1,L(!1),"object"==typeof e?(D(Q.z6.Extension),O(e.extensionName)):(D(e),O(null))},[]);(0,f.useLayoutEffect)(()=>{',
      replace:
        'W=(0,f.useCallback)(e=>{B.current=!1,L(!1),"object"==typeof e?(D(Q.z6.Extension),O(e.extensionName)):(D(e),O(null))},[]);(0,f.useEffect)(()=>{const e=(0,Vt.x)(C.tv.Shown,()=>{W(Q.z6.ExtensionsHome)});return()=>e.unsubscribe()},[W]);(0,f.useLayoutEffect)(()=>{',
    },
    {
      find: '(0,de.jsx)(_ne,{}),',
      replace: '',
    },
    {
      find: 'O,u&&(0,de.jsx)(Cne.Section,{onClick:()=>{z.sendEvent(x.GW.InsightsHubVoiceProfileClicked',
      replace:
        'O,!1&&u&&(0,de.jsx)(Cne.Section,{onClick:()=>{z.sendEvent(x.GW.InsightsHubVoiceProfileClicked',
    },
    {
      find: 'X&&(0,de.jsx)(zHe,{isTeamView:B===OUe.Team,onDismiss:Be,onAddWord:Se}',
      replace: '!1&&X&&(0,de.jsx)(zHe,{isTeamView:B===OUe.Team,onDismiss:Be,onAddWord:Se}',
    },
    {
      find: 'children:(0,de.jsx)(zHe,{isTeamView:B===OUe.Team,onAddWord:Se})',
      replace: 'children:null',
    },
    {
      find: '(0,de.jsx)(ame,{onClick:()=>{c!==qne?',
      replace: '!1&&(0,de.jsx)(ame,{onClick:()=>{c!==qne?',
    },
    {
      find: 'background-color:var(--background);border-radius:var(--dialog-border-radius);cursor:default;border:var(--dialog-border-width) solid var(--border)',
      replace:
        'background-color:#111B3D;border-radius:var(--dialog-border-radius);cursor:default;border:var(--dialog-border-width) solid var(--border)',
    },
    {
      find: '.pDV7mroPd3UY82LlSLH4{width:fit-content;min-width:200px;background-color:var(--background)',
      replace: '.pDV7mroPd3UY82LlSLH4{width:fit-content;min-width:200px;background-color:#111B3D',
    },
    {
      find: 'border-radius:20px;background-color:var(--background);overflow-y:auto}.o1sxLJHFeWkCYhTuN7d1::-webkit-scrollbar',
      replace:
        'border-radius:20px;background-color:#111B3D;overflow-y:auto}.o1sxLJHFeWkCYhTuN7d1::-webkit-scrollbar',
    },
    {
      find: 'border-radius:24px;background-color:var(--background)}.q8kQ52cwu8Toxigku_UE{box-shadow',
      replace: 'border-radius:24px;background-color:#111B3D}.q8kQ52cwu8Toxigku_UE{box-shadow',
    },
    {
      find: 'border-radius:16px;background-color:var(--background)}.ykPf26zIuaIJPHDVaOgT{flex-shrink',
      replace: 'border-radius:16px;background-color:#111B3D}.ykPf26zIuaIJPHDVaOgT{flex-shrink',
    },
    {
      find: 'border-radius:16px;background-color:var(--background)}.KFL6HmxTWFdOCzGyvseg{flex-shrink',
      replace: 'border-radius:16px;background-color:#111B3D}.KFL6HmxTWFdOCzGyvseg{flex-shrink',
    },
  ],
};
