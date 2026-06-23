// Deckard scratch — an AudioWorkletProcessor that reads a mono sample buffer at a hand-driven SIGNED rate
// (negative = reverse), so you can scratch like a turntable. rate 0 = silence (the record isn't moving).
// The buffer + the live rate arrive over the port from the jog wheel on the main thread. A light per-sample
// smoothing toward the target rate removes zipper noise. The buffer is a one-bar LOOP — the read position
// WRAPS at both ends, so you can push it continuously forward or back like a loop scratch.
//
// Performance moves layered on top:
//   • CUT gate — a SHARP per-sample gain gate (cut on/off) that is NOT slewed by the slow rate smoothing,
//     so a fader-style cut/transformer/chirp stays percussive. Coefficient ~0.06 ≈ 0.4 ms: click-free but crisp.
//   • SPIN — a timed rate ramp that OVERRIDES the jog: brake (rate +1 → 0 over ~0.5 s = the vinyl power-down)
//     and spinback (rate −big → 0 over ~0.35 s = the rewind zip). After the ramp the platter is stopped (rate 0).
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
    this._cut = 1;     // current cut-gate gain (0 = muted, 1 = open)
    this._cutTarget = 1;
    this._spin = 0;    // remaining samples of a brake/spinback ramp (0 = inactive)
    this._spinRate = 0;
    this._spinStep = 0;
    this.port.onmessage = (e) => {
      const m = e.data;
      if (!m) return;
      if (m.type === 'buffer') {
        this._buf = m.data;
        this._len = this._buf ? this._buf.length : 0;
        this._pos = 0;
      } else if (m.type === 'rate') {
        this._target = m.rate;
        this._spin = 0;          // a fresh jog cancels any in-flight brake/spinback
      } else if (m.type === 'pos') {
        if (this._len > 0) this._pos = Math.max(0, Math.min(1, m.pos)) * (this._len - 1);
      } else if (m.type === 'cut') {
        this._cutTarget = m.on ? 0 : 1;
      } else if (m.type === 'spin') {
        // Ramp the rate from m.rate down to 0 over m.samples (brake = +rate, spinback = −rate). Overrides the jog.
        const samp = (m.samples | 0) > 1 ? (m.samples | 0) : 1;
        this._spinRate = m.rate;
        this._spin = samp;
        this._spinStep = m.rate / samp;
        this._cut = 1;
        this._cutTarget = 1;
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
      // Sharp cut gate — its OWN fast smoothing, independent of the (slow) rate slew, so cuts stay crisp.
      this._cut += (this._cutTarget - this._cut) * 0.06;
      let r;
      if (this._spin > 0) {
        // Brake / spinback: the timed ramp drives the rate; the jog target is parked at a stop.
        r = this._spinRate;
        this._spinRate -= this._spinStep;
        if ((this._spinStep > 0 && this._spinRate < 0) || (this._spinStep < 0 && this._spinRate > 0)) {
          this._spinRate = 0;
        }
        this._spin -= 1;
        this._rate = r;
        this._target = 0;
      } else {
        this._rate += (this._target - this._rate) * 0.12;
        r = this._rate;
      }
      // Smoothly fade out volume as speed approaches 0 to avoid clicks/pops and static.
      let speedAmp = 1.0;
      const absR = Math.abs(r);
      if (absR < 0.05) {
        speedAmp = absR / 0.05;
      }
      let p = this._pos % len;
      if (p < 0) p += len;
      const i0 = p | 0;
      const i1 = (i0 + 1) % len;
      const frac = p - i0;
      ch0[i] = (this._buf[i0] + (this._buf[i1] - this._buf[i0]) * frac) * this._cut * speedAmp;
      this._pos = p + r;
    }
    for (let c = 1; c < out.length; c++) out[c].set(ch0);
    return true;
  }
}
registerProcessor('deckard-scratch', DeckardScratch);
