// Tray items that open the hub call the shared show helper. On Linux that
// helper uses showInactive() and does not focus, so a dictation can keep
// the text box. From the tray that looks like the item did nothing: the
// hub is already mapped, and it stays behind the window the user is in.
// Raise it only on this path.

export default {
  description: 'Bring the hub forward when a tray item opens it',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: '(0,h.Z)(),"Feedback"===e?(0,a.Bn)(u.RA.hubWindow,i.tv.OpenFeedback,{messageType:r.FEATURE_REQUEST})',
      replace:
        '(0,h.Z)(),"linux"===process.platform&&u.RA.hubWindow&&!u.RA.hubWindow.isDestroyed()&&(u.RA.hubWindow.isMinimized()&&u.RA.hubWindow.restore(),u.RA.hubWindow.show(),u.RA.hubWindow.focus()),"Feedback"===e?(0,a.Bn)(u.RA.hubWindow,i.tv.OpenFeedback,{messageType:r.FEATURE_REQUEST})',
    },
  ],
};
