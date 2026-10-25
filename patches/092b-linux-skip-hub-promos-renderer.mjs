// Hub renderer: the large post-hydration useEffect that queues trial, referral, and enterprise dialogs.

export default {
  description: 'Skip hub dialog orchestration useEffect on Linux',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: '(0,f.useEffect)(()=>{if(!t.user.email)return;const n=t.user.email.split("@")[1]??"";if(mt)return void(et.current||(et.current=!0,d({children:(0,de.jsx)(y3,{enterpriseName:ht,onOpenAdminPortal:_t,onSignOut:',
      replace:
        '(0,f.useEffect)(()=>{return;if(!t.user.email)return;const n=t.user.email.split("@")[1]??"";if(mt)return void(et.current||(et.current=!0,d({children:(0,de.jsx)(y3,{enterpriseName:ht,onOpenAdminPortal:_t,onSignOut:',
    },
  ],
};
