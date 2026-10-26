// Shouter mascot: About keeps the shouting pose, Insights shows the
// celebrating pose once a real streak reaches a week, and the listening
// and dictionary poses are empty states only.

export default {
  description: 'Place the Shouter mascot on About, streak milestones, and empty dictation and dictionary states',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: "(0,de.jsxs)(\"div\",{className:t1.window,\"data-tour-anchor\":\"hub-window\",\"data-active-page\":P,\"data-hub-dormant\":h,children:[(0,de.jsx)(p4,{",
      replace: "(0,de.jsxs)(\"div\",{className:t1.window,\"data-tour-anchor\":\"hub-window\",\"data-active-page\":P,\"data-hub-dormant\":h,children:[(0,de.jsx)(\"style\",{children:\".shoutr-about{position:relative;box-sizing:border-box;width:100%;min-height:420px}.shoutr-about-copy{position:relative;z-index:1;max-width:min(62ch,calc(100% - 248px))}.shoutr-about-mascot{position:absolute;right:0;bottom:0;width:220px;height:auto;object-fit:contain;pointer-events:none;user-select:none;transform:scaleX(-1)}@media (max-width:900px),(max-height:640px){.shoutr-about{min-height:0}.shoutr-about-copy{max-width:62ch}.shoutr-about-mascot{position:static;display:block;width:min(180px,52vw);margin-top:28px;transform:none}}.shoutr-empty{flex:1;min-height:320px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;padding:8px 16px 24px}.shoutr-empty img{width:min(190px,52vw);height:auto;object-fit:contain;user-select:none}.shoutr-empty h2{margin:8px 0 0;font-size:20px;line-height:28px;font-weight:600}.shoutr-empty p{margin:0;max-width:38ch;line-height:1.5}.shoutr-empty-action{margin-top:12px}.shoutr-dictation-mascot{width:min(200px,52vw);height:auto;object-fit:contain;pointer-events:none;user-select:none}.shoutr-dictionary-miss{width:min(170px,52vw);height:auto;object-fit:contain;pointer-events:none;user-select:none}.shoutr-streak-mascot{height:64px;width:auto;max-width:34%;object-fit:contain;flex-shrink:0;align-self:center;pointer-events:none;user-select:none}\"}),(0,de.jsx)(p4,{",
    },
    {
      find: "title:\"About Shoutr\",children:[",
      replace: "title:\"About Shoutr\",children:(0,de.jsxs)(\"div\",{className:\"shoutr-about\",children:[(0,de.jsxs)(\"div\",{className:\"shoutr-about-copy\",children:[",
    },
    {
      find: "children:\"Wispr Flow webpage\"})]})]}),surface:Q.z6.ExtensionsHome};",
      replace: "children:\"Wispr Flow webpage\"})]})]}),(0,de.jsx)(\"img\",{className:\"shoutr-about-mascot\",src:\"../static/media/shouter-about.png\",alt:\"\",\"aria-hidden\":\"true\",draggable:!1})]})}),surface:Q.z6.ExtensionsHome};",
    },
    {
      find: "const o7=()=>{const{t:e}=(0,y.Bd)(\"hub\");return(0,de.jsxs)(\"div\",{className:O8.emptyTable,children:[(0,de.jsx)(\"div\",{className:O8.emptyIcon,\"aria-hidden\":!0,children:(0,de.jsx)(Co.A,{size:20})}),(0,de.jsxs)(\"div\",{className:O8.textContainer,children:[(0,de.jsx)(\"span\",{className:O8.title,children:e(\"hub_history_empty_title\")}),(0,de.jsx)(\"p\",{children:e(\"hub_history_empty_body\")})]})]})}",
      replace: "const o7=()=>(0,de.jsxs)(\"div\",{className:O8.emptyTable,children:[(0,de.jsx)(\"img\",{className:\"shoutr-dictation-mascot\",src:\"../static/media/shouter-dictation.png\",alt:\"\",\"aria-hidden\":\"true\",draggable:!1}),(0,de.jsxs)(\"div\",{className:O8.textContainer,children:[(0,de.jsx)(\"span\",{className:O8.title,children:\"Ready when you are.\"}),(0,de.jsx)(\"p\",{children:\"Press your dictation shortcut and start talking.\"})]})]})",
    },
    {
      find: "const We=(0,de.jsx)(\"div\",{className:bHe.emptyContainer,children:(0,de.jsxs)(\"div\",{className:bHe.emptyContainerHeader,children:[(0,de.jsx)(\"span\",{className:bHe.emptyMessage,children:a(\"hub_dictionary_no_results_title\")}),(0,de.jsx)(\"p\",{children:a(\"hub_dictionary_no_results_body\")})]})})",
      replace: "const We=(0,de.jsxs)(\"div\",{className:bHe.emptyContainer,style:{background:\"transparent\"},children:[(0,de.jsx)(\"img\",{className:\"shoutr-dictionary-miss\",src:\"../static/media/shouter-dictionary.png\",alt:\"\",\"aria-hidden\":\"true\",draggable:!1}),(0,de.jsxs)(\"div\",{className:bHe.emptyContainerHeader,children:[(0,de.jsx)(\"span\",{className:bHe.emptyMessage,children:a(\"hub_dictionary_no_results_title\")}),(0,de.jsx)(\"p\",{children:a(\"hub_dictionary_no_results_body\")})]})]})",
    },
    {
      find: ":(0,de.jsx)(\"div\",{className:bHe.scrollContainer,ref:R,children:null})",
      replace: ":(0,de.jsx)(\"div\",{className:bHe.scrollContainer,ref:R,children:(0,de.jsxs)(\"div\",{className:\"shoutr-empty\",children:[(0,de.jsx)(\"img\",{src:\"../static/media/shouter-dictionary.png\",alt:\"\",\"aria-hidden\":\"true\",draggable:!1}),(0,de.jsx)(\"h2\",{children:\"Your dictionary is looking a little empty.\"}),(0,de.jsx)(\"p\",{children:\"Add words, names, or phrases to help Shoutr understand you better.\"}),(0,de.jsx)(\"div\",{className:\"shoutr-empty-action\",children:(0,de.jsx)(re.Ay,{variant:\"primary\",onClick:()=>Se(),\"data-testid\":\"dictionary-add-first-word\",children:\"Add your first word\"})})]})})",
    },
    {
      find: "k_e=({currentStreak:e,longestStreak:t})=>{const{t:n}=(0,y.Bd)(\"insights\");return(0,de.jsxs)(\"div\",{className:x_e.header,children:[(0,de.jsx)(u_e.Title,{className:x_e.streakTitle,children:n(\"insights_heatmap_current_streak\",{count:e})}),t>0&&(0,de.jsx)(u_e.Subtitle,{className:x_e.longestStreak,children:n(\"insights_heatmap_longest_streak\",{count:t})})]})}",
      replace: "k_e=({currentStreak:e,longestStreak:t})=>{const{t:n}=(0,y.Bd)(\"insights\");const a=(0,de.jsx)(u_e.Title,{className:x_e.streakTitle,children:n(\"insights_heatmap_current_streak\",{count:e})}),r=t>0&&(0,de.jsx)(u_e.Subtitle,{className:x_e.longestStreak,children:n(\"insights_heatmap_longest_streak\",{count:t})});return e>=7?(0,de.jsxs)(\"div\",{className:x_e.header,style:{alignItems:\"center\"},children:[(0,de.jsxs)(\"div\",{style:{minWidth:0,display:\"flex\",flexDirection:\"column\",alignItems:\"flex-start\",gap:2},children:[a,r]}),(0,de.jsx)(\"img\",{className:\"shoutr-streak-mascot\",src:\"../static/media/shouter-insights.png\",alt:\"\",\"aria-hidden\":\"true\",draggable:!1})]}):(0,de.jsxs)(\"div\",{className:x_e.header,children:[a,r]})}",
    },
  ],
};
