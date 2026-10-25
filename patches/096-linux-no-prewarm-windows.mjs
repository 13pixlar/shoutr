export default {
  description: 'Do not pre-warm scratchpad or meeting-recorder windows on Linux',
  file: '.webpack/main/index.js',
  edits: [
    {
      find: 'warmWindow(){this.preWarmEnabled&&(this.getFloatingWindow()||this.preWarmedWindow&&!this.preWarmedWindow.isDestroyed()||(this.preWarmedWindow=(0,a.kH)(),this.preWarmedReady=!1,s().info("[MeetingRecorder] Pre-warmed next window")))}',
      replace:
        'warmWindow(){if("linux"===process.platform)return;this.preWarmEnabled&&(this.getFloatingWindow()||this.preWarmedWindow&&!this.preWarmedWindow.isDestroyed()||(this.preWarmedWindow=(0,a.kH)(),this.preWarmedReady=!1,s().info("[MeetingRecorder] Pre-warmed next window")))}',
    },
    {
      find: 'he=()=>{if(!pe)return void o().info("[Scratchpad] Skipping rewarm — IPC listeners not ready yet");const e=(0,c.q)();if(JSON.stringify(e.window)===de)return;o().info("[Scratchpad] Re-warming pre-warmed window (config changed)");const t=l.q.getPreWarmedWindow();t&&!t.isDestroyed()&&(t.destroy(),l.q.setPreWarmedWindow(null)),me()}',
      replace:
        'he=()=>{if("linux"===process.platform)return;if(!pe)return void o().info("[Scratchpad] Skipping rewarm — IPC listeners not ready yet");const e=(0,c.q)();if(JSON.stringify(e.window)===de)return;o().info("[Scratchpad] Re-warming pre-warmed window (config changed)");const t=l.q.getPreWarmedWindow();t&&!t.isDestroyed()&&(t.destroy(),l.q.setPreWarmedWindow(null)),me()}',
    },
    {
      find: 'me=()=>{const e=(0,c.q)();if(!e.enabled)return;if(!1===l.q.getPreWarmedWindow()?.isDestroyed())return;l.q.setPreWarmedWindowReady(!1);const t=A(e.window);(0,h.c8)(t),l.q.setPreWarmedWindow(t),de=JSON.stringify(e.window),o().info("[Scratchpad] Pre-warmed next window")}',
      replace:
        'me=()=>{if("linux"===process.platform)return;const e=(0,c.q)();if(!e.enabled)return;if(!1===l.q.getPreWarmedWindow()?.isDestroyed())return;l.q.setPreWarmedWindowReady(!1);const t=A(e.window);(0,h.c8)(t),l.q.setPreWarmedWindow(t),de=JSON.stringify(e.window),o().info("[Scratchpad] Pre-warmed next window")}',
    },
  ],
};
