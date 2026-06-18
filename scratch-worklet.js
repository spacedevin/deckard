// Deckard scratch — an AudioWorkletProcessor that reads a mono sample buffer at a hand-driven SIGNED rate
// (negative = reverse), so you can scratch like a turntable. rate 0 = silence (the record isn't moving).
// The buffer + the live rate arrive over the port from the jog wheel on the main thread. A light per-sample
// smoothing toward the target rate removes zipper noise. The buffer is a one-bar LOOP — the read position
// WRAPS at both ends, so you can push it continuously forward or back like a loop scratch.
//
// Hand-written plain JS (Tish cannot express `class extends AudioWorkletProcessor`). Loaded via
// audioContext.audioWorklet.addModule('/scratch-worklet.js') and served as a static file.
class DeckardScratch extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = null;
    this._len = 0;
    this._pos = 0;     // fractional read position in samples
    this._rate = 0;    // current smoothed rate (output-samples advanced per output-sample)
    this._target = 0;  // requested rate from the jog
    this.port.onmessage = (e) => {
      const m = e.data;
      if (!m) return;
      if (m.type === 'buffer') {
        this._buf = m.data;
        this._len = this._buf ? this._buf.length : 0;
        this._pos = 0;
        this._rate = 0;
        this._target = 0;
      } else if (m.type === 'rate') {
        this._target = m.rate;
      } else if (m.type === 'pos') {
        if (this._len > 0) this._pos = Math.max(0, Math.min(1, m.pos)) * (this._len - 1);
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0];
    const ch0 = out[0];
    const n = ch0.length;
    if (!this._buf || this._len < 2) {
      for (let i = 0; i < n; i++) ch0[i] = 0;
      return true;
    }
    const len = this._len;
    for (let i = 0; i < n; i++) {
      this._rate += (this._target - this._rate) * 0.12;
      const r = this._rate;
      // not moving → silence (the needle is static).
      if (r > -0.0008 && r < 0.0008) { ch0[i] = 0; continue; }
      let p = this._pos;
      // It's a one-bar LOOP — wrap around so you can push it forward/back continuously like a loop scratch.
      if (p >= len) p -= len;
      if (p < 0) p += len;
      const i0 = p | 0;
      const i1 = (i0 + 1) % len;
      const frac = p - i0;
      ch0[i] = this._buf[i0] + (this._buf[i1] - this._buf[i0]) * frac;
      this._pos = p + r;
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;
  }
}
registerProcessor('deckard-scratch', DeckardScratch);
