// Deckard transport clock — an AudioWorkletProcessor that runs on the audio render thread and posts a
// "tick" to the main thread roughly every 20ms of AUDIO time. It carries no musical state; it's just a
// reliable pump that keeps firing even when the main thread is janky or the tab is backgrounded (where
// setTimeout is throttled). The main thread's lookahead scheduler does the actual note scheduling on
// receipt, using ctx.currentTime for sample-accurate timing.
//
// Hand-written plain JS (Tish cannot express `class extends AudioWorkletProcessor`). Loaded via
// audioContext.audioWorklet.addModule('/clock-worklet.js') and served as a static file.
class DeckardClock extends AudioWorkletProcessor {
  constructor() {
    super();
    this._acc = 0;
    // sampleRate is a global in the AudioWorkletGlobalScope (e.g. 44100/48000). ~20ms cadence.
    this._period = sampleRate * 0.02;
  }
  process() {
    // process() is called every 128-sample render quantum (~2.7ms @ 48k). Coalesce to ~20ms ticks.
    this._acc += 128;
    if (this._acc >= this._period) {
      this._acc = 0;
      this.port.postMessage(0);
    }
    return true; // keep the processor alive
  }
}
registerProcessor('deckard-clock', DeckardClock);
