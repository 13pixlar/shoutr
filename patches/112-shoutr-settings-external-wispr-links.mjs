// Settings: Plans and Billing / Data and Privacy open Wispr web pages on Linux.

const billingUrl = 'https://admin.wisprflow.ai/app/settings/billing';
const privacyUrl = 'https://www.wisprflow.ai/privacy-policy';

export default {
  description: 'Open Plans/Billing and Data/Privacy on Wispr web from settings',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: '[u,p]=(0,f.useState)(t||Q.$t.General),{general:m,account:g}=(()=>{',
      replace:
        `[u,p]=(0,f.useState)(("linux"===process.platform&&(t===Q.EK.PlansAndBilling||t===Q.EK.DataAndPrivacy))?Q.$t.General:t||Q.$t.General),(0,f.useEffect)(()=>{"linux"===process.platform&&(t===Q.EK.PlansAndBilling&&window.electron.shell.openExternal(${JSON.stringify(billingUrl)}),t===Q.EK.DataAndPrivacy&&window.electron.shell.openExternal(${JSON.stringify(privacyUrl)}))},[t]),{general:m,account:g}=(()=>{`,
    },
    {
      find: 'onClick:()=>(e=>{const t=(0,Qt.NV)();e===Q.EK.Team&&t.sendEvent(x.GW.TeamOpenSettingsPage,{source:"settings_sidebar"}),a(e)})(e),"data-testid":`settings-tab-${e}`',
      replace:
        `onClick:()=>(e=>{if("linux"===process.platform){if(e===Q.EK.PlansAndBilling)return void window.electron.shell.openExternal(${JSON.stringify(billingUrl)});if(e===Q.EK.DataAndPrivacy)return void window.electron.shell.openExternal(${JSON.stringify(privacyUrl)})}const t=(0,Qt.NV)();e===Q.EK.Team&&t.sendEvent(x.GW.TeamOpenSettingsPage,{source:"settings_sidebar"}),a(e)})(e),"data-testid":\`settings-tab-\${e}\``,
    },
    {
      find: 'case Q.EK.PlansAndBilling:return(0,de.jsx)(iM,{});case Q.EK.DataAndPrivacy:return(0,de.jsx)(Sp,{handleSwitch:_,focusSetting:r})',
      replace:
        'case Q.EK.PlansAndBilling:return"linux"===process.platform?(0,de.jsx)(Kc,{}):(0,de.jsx)(iM,{});case Q.EK.DataAndPrivacy:return"linux"===process.platform?(0,de.jsx)(Kc,{}):(0,de.jsx)(Sp,{handleSwitch:_,focusSetting:r})',
    },
  ],
};
