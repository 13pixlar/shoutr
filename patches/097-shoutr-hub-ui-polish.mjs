// Shoutr hub UI: About page, no sidebar growth CTAs, no theme toggle, simplified account menu.
// The About paragraphs follow the opening of README.md.

const aboutLead =
  'Wispr Flow is a great dictation app. You hold a key, talk, and it types into the window in front of you. It ships for macOS and Windows, and it lacks Linux support.';
const aboutFollow =
  'Shoutr is a Linux client for that same dictation, for GNOME, including Wayland. It is a project made in good faith. You sign in with your own Wispr account, and the speech still runs on Wispr\'s servers. Any money you pay still goes to Wispr Flow.';

function aboutParagraph(text) {
  return `(0,de.jsx)("p",{style:{margin:"0 0 12px",lineHeight:1.65,maxWidth:"62ch"},children:${JSON.stringify(text)}})`;
}

// Plain <a target="_blank"> stays inside the hub. Open these in the system browser.
function aboutLink(href, label) {
  const url = JSON.stringify(href);
  return `(0,de.jsx)("a",{href:${url},target:"_blank",rel:"noopener noreferrer",style:{color:"var(--primary)",cursor:"pointer"},onClick:e=>{e.preventDefault(),window.electron.shell.openExternal(${url})},children:${JSON.stringify(label)}})`;
}

const aboutPage =
  'case Q.z6.ExtensionsHome:return{node:(0,de.jsxs)(A4,{title:"About Shoutr",children:[' +
  [
    aboutParagraph(aboutLead),
    aboutParagraph(aboutFollow),
    `(0,de.jsxs)("p",{style:{margin:0,lineHeight:1.65},children:[${aboutLink('https://github.com/13pixlar/shoutr', 'GitHub')}," · ",${aboutLink('https://wisprflow.com', 'Wispr ❤️')}]})`,
  ].join(',') +
  ']}),surface:Q.z6.ExtensionsHome};';

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
