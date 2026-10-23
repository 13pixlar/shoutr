// Module 20844 picks the Swift helper on macOS and the C# helper otherwise.
// On Linux, return the path in SHOUTR_HELPER. That variable is read here, in
// the Electron process. The helper is spawned with a different environment,
// so it does not need to see SHOUTR_HELPER itself. An empty path makes the
// app log "Helper service script path not found" instead of spawning.

export default {
  description: 'Point the helper path at the Shoutr helper on Linux',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'const l=()=>o.tD?a.ty.isHelperProcessRunningManually',
      replace:
        'const l=()=>"linux"===process.platform?(s().info("Running Shoutr Linux helper"),process.env.SHOUTR_HELPER||""):o.tD?a.ty.isHelperProcessRunningManually',
    },
  ],
};
