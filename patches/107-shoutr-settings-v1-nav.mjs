// Settings modal sidebar: only pages that exist in Shoutr v1.

export default {
  description: 'Trim settings nav to General, System, Account, Billing, Privacy',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'general:Object.values(Q.$t).filter(e=>!(e===Q.$t.Connectors&&!g||e===Q.$t.Mcp&&!h||e===Q.$t.Notetaker&&!d||e===Q.$t.Internal&&!_&&!b||e===Q.$t.Experimental&&!y||!(e!==Q.$t.Testing||n&&_||b))),account:Object.values(Q.EK).filter(e=>!(e===Q.EK.Team&&!t))}),[g,h,d,_,b,y,n,t])',
      replace:
        'general:[Q.$t.General,Q.$t.System],account:[Q.EK.Account,Q.EK.PlansAndBilling,Q.EK.DataAndPrivacy]}),[])',
    },
  ],
};
