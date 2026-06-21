class SyncOscillator extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'masterFreq', defaultValue: 110, minValue: 20, maxValue: 20000, automationRate: 'a-rate' },
      { name: 'slaveFreq', defaultValue: 220, minValue: 20, maxValue: 20000, automationRate: 'a-rate' }
    ];
  }

  constructor() {
    super();
    this.masterPhase = 0;
    this.slavePhase = 0;
  }

  polyblep(t, dt) {
    if (t < dt) {
      t /= dt;
      return t + t - t * t - 1.0;
    } else if (t > 1.0 - dt) {
      t = (t - 1.0) / dt;
      return t * t + t + t + 1.0;
    }
    return 0.0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    
    const channel = output[0];
    const masterFreqArray = parameters.masterFreq;
    const slaveFreqArray = parameters.slaveFreq;
    
    for (let i = 0; i < channel.length; i++) {
      const mf = masterFreqArray.length > 1 ? masterFreqArray[i] : masterFreqArray[0];
      const sf = slaveFreqArray.length > 1 ? slaveFreqArray[i] : slaveFreqArray[0];
      
      const mdt = mf / sampleRate;
      const sdt = sf / sampleRate;
      
      this.masterPhase += mdt;
      
      let syncJump = 0;
      
      if (this.masterPhase >= 1.0) {
        this.masterPhase -= 1.0;
        // Sub-sample precise reset of the slave phase
        let frac = this.masterPhase / mdt;
        let prevSlavePhase = this.slavePhase + (1 - frac) * sdt;
        if (prevSlavePhase > 1.0) prevSlavePhase -= 1.0;
        
        // The jump is from current slave position down to 0
        syncJump = prevSlavePhase; 
        
        this.slavePhase = this.masterPhase * (sf / mf);
      } else {
        this.slavePhase += sdt;
      }
      
      if (this.slavePhase >= 1.0) {
        this.slavePhase -= 1.0;
      }
      
      // Basic sawtooth output (-1 to 1)
      let out = 2.0 * this.slavePhase - 1.0;
      
      // PolyBLEP anti-aliasing for the slave's natural wrap
      out -= this.polyblep(this.slavePhase, sdt);
      
      // Simple PolyBLEP for the forced sync wrap (scaled by jump height)
      if (syncJump > 0) {
        out -= this.polyblep(this.masterPhase * (sf / mf), sdt) * syncJump;
      }
      
      channel[i] = out;
    }
    return true;
  }
}

registerProcessor('sync-oscillator', SyncOscillator);
