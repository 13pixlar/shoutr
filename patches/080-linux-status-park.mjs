// The status window is a transparent slab the size of the docked flow
// bar (490x1144 when the bar is on the left). type "toolbar" makes it
// override-redirect, so hide() leaves it mapped. Alpha click-through
// throws UnknownVizError and XWayland still delivers clicks to that
// slab after the hub is closed, even when the bar itself is hidden.
//
// Linux gets a normal window so hide() unmaps it. The window stays
// parked offscreen until the flow bar or a toast actually needs it.
// Leftover catch-rects must not bring it back: closing the hub was
// enough to remap the slab onto the left edge.

export default {
  description: 'Hide the Linux status window when the flow bar is idle',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'type:M.tD?"panel":"toolbar"',
      replace: 'type:M.tD?"panel":"linux"===process.platform?"normal":"toolbar"',
    },
    {
      find: 'e.showInactive(),M.H8&&(te||ne(e),e.setAlwaysOnTop(!0,"screen-saver")),Ae(oe),o().info("Showing status window")',
      replace: 'e.showInactive(),M.H8&&(te||ne(e),e.setAlwaysOnTop(!0,"screen-saver")),"linux"===process.platform&&((t=>{e.__shoutrHome=t,e.__shoutrParked=!0,e.hide(),e.setBounds({x:-2000,y:-2000,width:t.width,height:t.height})})(e.getBounds())),Ae(oe),o().info("Showing status window")',
    },
    {
      find: 'r.on("show",()=>{d.RA.statusWindow===r&&ye()})',
      replace: 'r.on("show",()=>{d.RA.statusWindow===r&&("linux"===process.platform&&r.__shoutrParked?((t=>{r.hide(),r.setBounds({x:-2000,y:-2000,width:t.width,height:t.height})})(r.__shoutrHome||r.getBounds())):ye())})',
    },
    {
      find: 'd.RA.statusWindow.setContentBounds(s,e),Z=s',
      replace: 'd.RA.statusWindow.setContentBounds(s,e),Z=s,"linux"===process.platform&&d.RA.statusWindow.__shoutrParked&&(d.RA.statusWindow.__shoutrHome=s,d.RA.statusWindow.hide(),d.RA.statusWindow.setBounds({x:-2000,y:-2000,width:s.width,height:s.height}))',
    },
    {
      find: 'v=(e,t)=>{e&&y.set(e,t)}',
      replace: 'v=(e,t)=>{e&&y.set(e,t);if(!e||"linux"!==process.platform||e.isDestroyed()||t&&t.length)return;const n=e.getBounds();n.x>=-100&&(e.__shoutrHome={x:n.x,y:n.y,width:n.width,height:n.height}),e.__shoutrParked=!0,e.hide(),e.setBounds({x:-2000,y:-2000,width:n.width,height:n.height})}',
    },
    {
      find: '(0,x.Z4)(S.EB.BarHidden,!1,()=>{re(),X()?.setIgnoreMouseEvents(!0,{forward:!0})})',
      replace: '(0,x.Z4)(S.EB.BarHidden,!1,()=>{re(),X()?.setIgnoreMouseEvents(!0,{forward:!0});const e=X();e&&!e.isDestroyed()&&"linux"===process.platform&&((t=>{t.x>=-100&&(e.__shoutrHome=t),e.__shoutrParked=!0,e.hide(),e.setBounds({x:-2000,y:-2000,width:t.width,height:t.height})})(e.getBounds()))})',
    },
    {
      find: '(0,x.Z4)(S.EB.BarVisible,!1,()=>{M.H8&&j.setEnabled(!0),ne(d.RA.statusWindow),(0,g.cA)(d.RA.statusWindow)})',
      replace: '(0,x.Z4)(S.EB.BarVisible,!1,()=>{M.H8&&j.setEnabled(!0),ne(d.RA.statusWindow),(0,g.cA)(d.RA.statusWindow);const e=X();e&&!e.isDestroyed()&&"linux"===process.platform&&(e.__shoutrParked=!1,e.__shoutrHome&&e.setBounds(e.__shoutrHome),e.showInactive())})',
    },
    {
      find: '(0,x.Z4)(S.K4.EnableMouseEvents,!1,e=>{te||(e?ne(d.RA.statusWindow):X()?.setIgnoreMouseEvents(!0,{forward:!0}),(0,g.cA)(d.RA.statusWindow))})',
      replace: '(0,x.Z4)(S.K4.EnableMouseEvents,!1,e=>{te||(e?ne(d.RA.statusWindow):X()?.setIgnoreMouseEvents(!0,{forward:!0}),(0,g.cA)(d.RA.statusWindow));if(!te&&e&&"linux"===process.platform){const t=X();t&&!t.isDestroyed()&&(t.__shoutrParked=!1,t.__shoutrHome&&t.setBounds(t.__shoutrHome),t.showInactive())}})',
    },
  ],
};
