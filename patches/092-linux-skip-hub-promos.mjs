// Skip hub promo/trial/enterprise dialog orchestration and related main-process fetches on Linux.

export default {
  description: 'No hub promo/trial dialogs and no pending promo fetch on Linux',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'async function C(){return u.AriaWebClient.getPendingPromo()}',
      replace: 'async function C(){if("linux"===process.platform)return null;return u.AriaWebClient.getPendingPromo()}',
    },
    {
      find: '(async()=>{if(!Jr.RA.authSignedIn)return;const e=wa(),t=(0,va.y)(),n=e&&null!==t&&(null!==t.hasRecorded||null!==t.hasRecordedLong),r=Ci.k2.consumeSyncSkippedBeforePrefsHydrated();',
      replace:
        '(async()=>{if("linux"===process.platform)return;if(!Jr.RA.authSignedIn)return;const e=wa(),t=(0,va.y)(),n=e&&null!==t&&(null!==t.hasRecorded||null!==t.hasRecordedLong),r=Ci.k2.consumeSyncSkippedBeforePrefsHydrated();',
    },
  ],
};
