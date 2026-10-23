// The toast shell is the element the status page reports as clickable.
// A parent with pointer-events:none is inherited, and the reporter skips
// those elements, so the toast never becomes a click rectangle. The shell
// sets pointer-events itself, and the reporter keeps the rectangle even
// when a parent had turned them off. The hit tester then accepts the click.

export default {
  description: 'Keep the notification card in the clickable rectangles',
  file: '.webpack/renderer/status/index.js',
  edits: [
    {
      find: 'className:(0,tt.A)(vh.notificationContainer,vh.nonMorphOverlay,t),style:o,onClick:n',
      replace: 'className:(0,tt.A)(vh.notificationContainer,vh.nonMorphOverlay,t),style:{...o,pointerEvents:"auto"},onClick:n',
    },
    {
      find: 'style:{width:r.dimensions.width,height:r.dimensions.height,borderRadius:r.dimensions.borderRadius,...o}',
      replace: 'style:{width:r.dimensions.width,height:r.dimensions.height,borderRadius:r.dimensions.borderRadius,pointerEvents:"auto",...o}',
    },
    {
      find: 'c&&n&&"none"!==r.pointerEvents?y(o,{x:Math.round(t.left),y:Math.round(t.top),width:Math.round(t.width),height:Math.round(t.height)}):y(o,null)',
      replace: 'c&&n?y(o,{x:Math.round(t.left),y:Math.round(t.top),width:Math.round(t.width),height:Math.round(t.height)}):y(o,null)',
    },
  ],
};
