// Hub sidebar: main nav w1 and footer secondary nav (Linux Shoutr v1).

export default {
  description: 'Hub nav: About + Insights + Dictation + Dictionary; footer Shortcuts + Settings only',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: 'w1=[Q.z6.Dictation,Q.z6.MyVoice,Q.z6.Notetaker,Q.z6.Insights,Q.z6.Dictionary,Q.z6.Snippets,Q.z6.Style,Q.z6.Transforms,Q.z6.Notes,Q.z6.Tasks,Q.z6.WisprMemory,Q.z6.ExtensionsHome]',
      replace:
        'w1=[Q.z6.ExtensionsHome,Q.z6.Insights,Q.z6.Dictation,Q.z6.Dictionary]',
    },
    {
      find: 'children:[!W&&(0,de.jsxs)(de.Fragment,{children:[U&&H&&(0,de.jsx)("li",{className:JXe.studentChallengeItemWrapper,children:(0,de.jsx)(iZe,{variant:H,onClick:()=>{H&&(0,Qt.NV)().sendEvent(x.GW.StudentReferralChallengeSidebarClicked,{variant:H}),_e()},isCollapsed:ee,onMouseEnter:e=>ve(T1.StudentReferralChallenge,e),onMouseLeave:je})}),!Se&&(0,de.jsx)("li",{children:(0,de.jsx)($Xe,{page:T1.Team,isActive:!1,onClick:()=>{(0,Qt.NV)().sendEvent(x.GW.TeamOpenSettingsPage,{source:"sidebar"}),d({children:(0,de.jsx)(Fz,{initialPage:Q.EK.Team,onRequestShowFlowEnterprisePreview:p})})},isCollapsed:ee,onMouseEnter:()=>ve(T1.Team),onMouseLeave:je})}),!U&&(0,de.jsx)("li",{children:(0,de.jsx)($Xe,{page:T1.Referral,isActive:!1,onClick:()=>{d({children:(0,de.jsx)(N6,{})})},isCollapsed:ee,onMouseEnter:()=>ve(T1.Referral),onMouseLeave:je,isGiveOnly:Ce})})]}),(0,de.jsx)("li",{children:(0,de.jsx)($Xe,{page:T1.Settings,isActive:!1,onClick:ye,isCollapsed:ee,badgeCount:G.count,badgeLabel:G.label,onMouseEnter:()=>ve(T1.Settings),onMouseLeave:je})}),(0,de.jsx)("li",{children:(0,de.jsx)(ak,{isCollapsed:ee,onMouseEnter:()=>ve(T1.Help),onMouseLeave:je})})]',
      replace:
        'children:[(0,de.jsx)("li",{children:(0,de.jsx)($Xe,{page:T1.Shortcuts,isActive:!1,onClick:()=>{u({title:i("hub_sidebar_shortcuts_dialog_title"),subtitle:i("hub_sidebar_shortcuts_dialog_subtitle"),children:(0,de.jsx)(jk,{})})},isCollapsed:ee,onMouseEnter:()=>ve(T1.Shortcuts),onMouseLeave:je})}),(0,de.jsx)("li",{children:(0,de.jsx)($Xe,{page:T1.Settings,isActive:!1,onClick:ye,isCollapsed:ee,badgeCount:G.count,badgeLabel:G.label,onMouseEnter:()=>ve(T1.Settings),onMouseLeave:je})})]',
    },
  ],
};
