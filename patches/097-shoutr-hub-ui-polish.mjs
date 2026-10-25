// Shoutr hub UI: About page, no sidebar growth CTAs, no theme toggle, simplified account menu.

const aboutPage =
  'case Q.z6.ExtensionsHome:return{node:(0,de.jsxs)(A4,{title:"About Shoutr",children:[(0,de.jsx)("p",{style:{margin:"0 0 12px",lineHeight:1.65},children:"Shoutr is a simple Linux port of Wispr Flow. We built it because we wanted native dictation on Linux—not to compete with Wispr or make money from this project."}),(0,de.jsx)("p",{style:{margin:"0 0 12px",lineHeight:1.65},children:"You still sign in with your Wispr Flow account. Transcription runs on Wispr servers, and subscription payments go to them. Shoutr does not charge anything or run its own backend."}),(0,de.jsx)("p",{style:{margin:"0 0 12px",lineHeight:1.65},children:"Thank you to the team at Wispr Flow for an excellent product."}),(0,de.jsx)("p",{style:{margin:0,lineHeight:1.65},children:(0,de.jsx)("a",{href:"https://wisprflow.com",target:"_blank",rel:"noopener noreferrer",style:{color:"var(--primary)"},children:"Visit wisprflow.com"})})]}),surface:Q.z6.ExtensionsHome};';

export default {
  description: 'About Shoutr page, drop team CTAs, theme toggle, and referral account copy',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'h$e=e=>{const{forceHide:t,exploreCoachmarkHold:n}=e,',
      replace: 'h$e=e=>{return null;const{forceHide:t,exploreCoachmarkHold:n}=e,',
    },
    {
      find: 'c&&!u&&(0,de.jsx)(Rm,{id:fj,className:ts.navItem,source:"hub_header"}),',
      replace: '',
    },
    {
      find: ',(0,de.jsx)("div",{className:n6.divider}),(0,de.jsx)("div",{className:n6.item,children:(0,de.jsxs)("div",{className:n6.defaultLayout,children:[E,(0,de.jsx)(re.Ay,{variant:"secondary",onClick:()=>{R6.sendEvent(x.GW.ReferralModalOpened,{source:"referral_account_dropdown_clicked"}),o({children:(0,de.jsx)(N6,{})}),t()},children:a("hub_account_refer_a_friend")})]})}),',
      replace:
        ',(0,de.jsx)("div",{className:n6.item,children:(0,de.jsx)("p",{className:n6.subtitle,style:{margin:0},children:"Logged in with Wispr account"})}),',
    },
    {
      find: 'N1=(e,t)=>{if(e===Q.z6.MyVoice&&!t.isMyVoiceEnabled)return!1;',
      replace: 'N1=(e,t)=>{if(e===Q.z6.ExtensionsHome)return!0;if(e===Q.z6.MyVoice&&!t.isMyVoiceEnabled)return!1;',
    },
    {
      find: 'I1=({action:e,t,isHomepageRedesignEnabled:n=!1})=>t(e===Q.z6.Dictation&&n?"hub_sidebar_home_redesign_label":E1[e])',
      replace:
        'I1=({action:e,t,isHomepageRedesignEnabled:n=!1})=>e===Q.z6.ExtensionsHome?"About Shoutr":t(e===Q.z6.Dictation&&n?"hub_sidebar_home_redesign_label":E1[e])',
    },
    {
      find: 'case Q.z6.ExtensionsHome:return{node:(0,de.jsx)(L4,{}),surface:Q.z6.ExtensionsHome};',
      replace: aboutPage,
    },
    {
      find: '[P,D]=(0,f.useState)(V0e(R)&&!v||R===Q.z6.Notes&&!A||E(R)||R===Q.z6.Transforms&&!i?Q.z6.Dictation:R)',
      replace: '[P,D]=(0,f.useState)(Q.z6.ExtensionsHome)',
    },
    {
      find: '(e!==Q.z6.ExtensionsHome||Ae)&&(e!==Q.z6.Extension||P!==Q.z6.Extension||F!==n))if',
      replace: '(e!==Q.z6.Extension||P!==Q.z6.Extension||F!==n))if',
    },
  ],
};
