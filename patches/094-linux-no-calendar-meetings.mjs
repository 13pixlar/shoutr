export default {
  description: 'Skip calendar sync init and notetaker calendar reconcile on Linux',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'te.initialized?s().info("[CalendarSyncManager] Already initialized, skipping"):(te.initialized=!0,s().info("[CalendarSyncManager] Initializing"),te.syncOnce({launch:!0}).then(()=>te.checkRemindersNow()).catch(e=>{s().error("[CalendarSyncManager] Initial sync failed",{customAttributes:{error:(0,u.serializeError)(e)}})}',
      replace:
        'te.initialized?s().info("[CalendarSyncManager] Already initialized, skipping"):"linux"===process.platform?void s().info("[CalendarSyncManager] Skipped on Linux (Shoutr v1)"):(te.initialized=!0,s().info("[CalendarSyncManager] Initializing"),te.syncOnce({launch:!0}).then(()=>te.checkRemindersNow()).catch(e=>{s().error("[CalendarSyncManager] Initial sync failed",{customAttributes:{error:(0,u.serializeError)(e)}})}',
    },
    {
      find: 'Mi=()=>{if(Jr.RA.isShuttingDown)return;const e=(0,fi.QL)(Jr.RA.prefs);',
      replace: 'Mi=()=>{if("linux"===process.platform)return;if(Jr.RA.isShuttingDown)return;const e=(0,fi.QL)(Jr.RA.prefs);',
    },
    {
      find: 'static startFetchInterval(){this.legacyFetchEnabled=!0,this.drainUnsyncedMeetings().catch(e=>o().warn("[MeetingsManager] Initial sync drain failed",{customAttributes:{error:String(e)}})),this.refreshFetchInterval()}',
      replace:
        'static startFetchInterval(){if("linux"===process.platform)return;this.legacyFetchEnabled=!0,this.drainUnsyncedMeetings().catch(e=>o().warn("[MeetingsManager] Initial sync drain failed",{customAttributes:{error:String(e)}})),this.refreshFetchInterval()}',
    },
  ],
};
