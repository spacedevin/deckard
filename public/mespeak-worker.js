importScripts('/mespeak/mespeak.js');

let initialized = false;
let compileCount = 0;

self.onmessage = function(e) {
  if (e.data.type === 'init') {
    meSpeak.loadConfig(e.data.config);
    initialized = true;
    self.postMessage({ type: 'init_done' });
  } else if (e.data.type === 'loadVoice') {
    meSpeak.loadVoice(e.data.voice);
    self.postMessage({ type: 'voice_done', voiceId: e.data.voiceId });
  } else if (e.data.type === 'speak') {
    if (!initialized) return;
    try {
      let buf = meSpeak.speak(e.data.text, e.data.opts);
      if (buf) {
        // We do NOT use [buf] or [buf.buffer] transferables here because if meSpeak 
        // returns a buffer backed by the WASM heap, transferring it will detach the 
        // entire WASM heap and instantly corrupt the worker.
        self.postMessage({ type: 'speak_done', key: e.data.key, buffer: buf });
      } else {
        self.postMessage({ type: 'speak_done', key: e.data.key, buffer: null });
      }
      compileCount++;
      if (compileCount > 50) {
        self.postMessage({ type: 'worker_tired' });
      }
    } catch (err) {
      console.error("meSpeak worker error:", err);
      self.postMessage({ type: 'speak_done', key: e.data.key, buffer: null });
    }
  }
};
