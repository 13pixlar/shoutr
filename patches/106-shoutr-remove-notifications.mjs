// Remove hub header notifications bell, panel, and shared-note popover (v1).

export default {
  description: 'Remove notifications UI from hub header',
  file: '.webpack/renderer/hub/index.js',
  edits: [
    {
      find: ',(0,de.jsxs)(q3.Root,{open:H,onOpenChange:(e,t)=>O(Q.RQ.Notifications,e,t.reason),children:[(0,de.jsx)(q3.Trigger,{className:(0,se.A)(ts.navItem,ts.notifications,{[ts.active]:H}),onMouseEnter:()=>P(Q.RQ.Notifications),onMouseLeave:D,"aria-label":o("hub_frame_notifications_aria"),children:(0,de.jsxs)("span",{ref:E,className:ts.iconContainer,children:[(0,de.jsx)(Zo.k,{className:ts.icon,src:C3,wrapper:"span"}),(0,de.jsx)($3,{})]})}),(0,de.jsx)(n4,{notifications:j,isOpen:H,close:()=>n(),onArchiveNotification:A,onOptimisticMarkAllAsRead:N,onOptimisticArchiveAll:T})]}),(0,de.jsx)(s4,{anchor:E,items:I.items,paused:I.paused,onClose:I.onClose}),',
      replace: '',
    },
    {
      find: 'src:m1})})]})!w.H8&&W',
      replace: 'src:m1})})]}),!w.H8&&W',
    },
  ],
};
