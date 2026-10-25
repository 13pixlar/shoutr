export default {
  description: 'Do not start auto-update checks on Linux',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: '(0,go.H3)("appLifecycle"),(0,sr.e6)(),fc.tL.startCheckingForUpdates().catch(e=>{rr().error("[MDM] Failed to start update checks",{customAttributes:{error:(0,ir.serializeError)(e)}})}),Tc(Jr.RA.prefs)',
      replace:
        '(0,go.H3)("appLifecycle"),(0,sr.e6)(),"linux"!==process.platform&&fc.tL.startCheckingForUpdates().catch(e=>{rr().error("[MDM] Failed to start update checks",{customAttributes:{error:(0,ir.serializeError)(e)}})}),Tc(Jr.RA.prefs)',
    },
  ],
};
