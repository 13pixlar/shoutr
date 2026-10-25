// Linux tray + app menu: match hub nav (About, Insights, Dictation, Dictionary, Shortcuts, Settings).

const shoutrTrayMenu =
  'k="linux"===process.platform?[{label:"About Shoutr",click:()=>{(0,U.$5)("tray","about_shoutr"),(0,U.CM)(u.z6.ExtensionsHome)}},{label:"Insights",click:()=>{(0,U.$5)("tray","insights"),(0,U.CM)(u.z6.Insights)}},{label:"Dictation",click:()=>{(0,U.$5)("tray","dictation"),(0,U.CM)(u.z6.Dictation)}},{label:"Dictionary",click:()=>{(0,U.$5)("tray","dictionary"),(0,U.CM)(u.z6.Dictionary)}},{type:"separator"},...f,{type:"separator"},{label:(0,S.NS)("menus_shortcuts"),click:()=>(0,U.CM)("Shortcuts")},{label:(0,S.NS)("menus_settings"),click:()=>(0,U.CM)("Settings")},{label:(0,S.NS)("menus_microphone"),submenu:M},{label:(0,S.NS)("menus_languages"),submenu:w},{type:"separator"},{role:"quit"}]:[...N,...N.length>0?[{type:"separator"}]:[],...z&&!(0,I.kJ)()?[{label:(0,S.NS)("menus_start_notetaker"),click:()=>{(0,F.z)("tray")}}]:[],{label:(0,S.NS)("menus_open_wispr_flow"),click:()=>Y("open_main_window")},{type:"separator"},{label:G.tL.getUpdateStateMessage(),click:()=>(0,U.Gn)(),enabled:G.tL.isMenuButtonClickable()},{type:"separator"},...f,{type:"separator"},{label:(0,S.NS)("menus_shortcuts"),click:()=>(0,U.CM)("Shortcuts")},{label:(0,S.NS)("menus_microphone"),submenu:M},{label:(0,S.NS)("menus_languages"),submenu:w},{type:"separator"},{label:(0,S.NS)("menus_help_center"),click:()=>r.shell.openExternal(d.Ae)},{label:(0,S.NS)("menus_talk_to_support"),accelerator:"Command+/",click:()=>(0,U.CM)("Support")},{label:(0,S.NS)("menus_share_feedback"),click:()=>(0,U.CM)("Feedback")},{type:"separator"},...a.tD&&x()?[J()]:[],{role:"quit",accelerator:"Command+Q"}]';

const linuxAppMenu =
  'x=async()=>{if("linux"===process.platform){const e=[{label:"Shoutr",submenu:[{label:"About Shoutr",click:()=>R("app_menu","about_shoutr",f.z6.ExtensionsHome)},{label:"Insights",click:()=>R("app_menu","insights",f.z6.Insights)},{label:"Dictation",click:()=>R("app_menu","dictation",f.z6.Dictation)},{label:"Dictionary",click:()=>R("app_menu","dictionary",f.z6.Dictionary)},{type:"separator"},{label:(0,M.NS)("menus_shortcuts"),click:()=>(0,C.CM)("Shortcuts")},{label:(0,M.NS)("menus_settings"),accelerator:"Command+,",click:()=>(0,C.CM)("Settings")},{type:"separator"},{label:(0,M.NS)("menus_quit_wispr_flow"),accelerator:"Command+Q",click:()=>{s().warn("User quit the app via the menu or shortcut"),r.app.quit()}}]},{label:(0,M.NS)("menus_edit"),submenu:[{role:"undo"},{role:"redo"},{type:"separator"},{role:"cut"},{role:"copy"},{role:"paste"},{label:(0,M.NS)("menus_select_all"),accelerator:"CmdOrCtrl+A",click:(e,t)=>{if(!(t instanceof r.BrowserWindow))return;const n=_.NF.getFloatingWindow()?.window;n&&t.id===n.id?t.webContents.send(u.vo.SelectAllEditor):t.webContents.selectAll()}}]},{label:(0,M.NS)("menus_window"),submenu:[{role:"minimize"},{role:"maximize"},{role:"close"}]}];return void r.Menu.setApplicationMenu(r.Menu.buildFromTemplate(e))}if(!o.tD)return;const e=await(async()=>{';

export default {
  description: 'Linux tray and app menu aligned with Shoutr hub navigation',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'k=[...N,...N.length>0?[{type:"separator"}]:[],...z&&!(0,I.kJ)()?[{label:(0,S.NS)("menus_start_notetaker"),click:()=>{(0,F.z)("tray")}}]:[],{label:(0,S.NS)("menus_open_wispr_flow"),click:()=>Y("open_main_window")},{type:"separator"},{label:G.tL.getUpdateStateMessage(),click:()=>(0,U.Gn)(),enabled:G.tL.isMenuButtonClickable()},{type:"separator"},...f,{type:"separator"},{label:(0,S.NS)("menus_shortcuts"),click:()=>(0,U.CM)("Shortcuts")},{label:(0,S.NS)("menus_microphone"),submenu:M},{label:(0,S.NS)("menus_languages"),submenu:w},{type:"separator"},{label:(0,S.NS)("menus_help_center"),click:()=>r.shell.openExternal(d.Ae)},{label:(0,S.NS)("menus_talk_to_support"),accelerator:"Command+/",click:()=>(0,U.CM)("Support")},{label:(0,S.NS)("menus_share_feedback"),click:()=>(0,U.CM)("Feedback")},{type:"separator"},...a.tD&&x()?[J()]:[],{role:"quit",accelerator:"Command+Q"}];',
      replace: shoutrTrayMenu + ';',
    },
    {
      find: 'x=async()=>{if(!o.tD)return;const e=await(async()=>{',
      replace: linuxAppMenu,
    },
    {
      find: 'q=async()=>{o.tD&&(await x(),L()),(0,O.d)()}',
      replace: 'q=async()=>{await x(),o.tD&&L(),(0,O.d)()}',
    },
  ],
};
