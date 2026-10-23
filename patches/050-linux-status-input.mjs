// The status window ignores the mouse. A 1-pixel sample of the page is
// supposed to turn clicks back on where something is drawn, and that sample
// throws UnknownVizError here. The page still reports rectangles for the
// flow bar and the toast. The hit tester turns clicks on when the pointer
// is inside one of those rectangles.
//
// On Linux that check waited for a 400 ms poll, and mouse moves were
// ignored until clicks were already on, so a click on the toast passed
// through. Linux polls sooner, and a move over a rectangle schedules the
// check immediately. An X input shape does not receive the click under
// this window manager, so the rectangles stay in the hit tester.

export default {
  description: 'Turn status-window clicks on as soon as the pointer is over the toast',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'const ne=e=>{te||(re(),e&&!e.isDestroyed()&&(V=(0,g.Bi)(e)))}',
      replace: 'const ne=e=>{te||(re(),e&&!e.isDestroyed()&&(V=(0,g.Bi)(e,0,"linux"===process.platform?50:400)))}',
    },
    {
      find: 'if(!l.H8&&!S)return;const{width:r,height:i}=e.getBounds();if(n.x<0||n.y<0||n.x>=r||n.y>=i)return;if(_=!0,!S)return;',
      replace: 'if(!l.H8&&!S){const s={x:n.x,y:n.y};return void(y.get(e)?.some(e=>(0,u.LU)(s,e))&&z())}const{width:r,height:i}=e.getBounds();if(n.x<0||n.y<0||n.x>=r||n.y>=i)return;if(_=!0,!S)return;',
    },
  ],
};
