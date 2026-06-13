import React, { useState, useEffect, useRef, useCallback } from 'react';

// ==========================================
// 1. WEB AUDIO SYNTHESIS & STEM ENGINE
// ==========================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterCompressor = null;
    this.reverbNode = null;
    
    // Decks setup
    this.decks = {
      A: { gain: null, sum: null, eq: {}, filter: null, stems: [], analysers: [] },
      B: { gain: null, sum: null, eq: {}, filter: null, stems: [], analysers: [] }
    };
    
    this.masterAnalyser = null;
    this.isPlaying = false;
    this.nextNoteTime = 0;
    this.currentStep = 0;
    this.lookahead = 25.0; // ms
    this.scheduleAheadTime = 0.1; // s
    this.timerID = null;

    // Buffers & Curves
    this.noiseBuffer = null;
    this.distortionCurve = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -12;
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 4;
    this.masterCompressor.attack.value = 0.005;
    this.masterCompressor.release.value = 0.1;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 1024;

    this.reverbNode = this.createReverb(3.0, 2.0); // 3s decay synthetic reverb
    
    this.reverbNode.connect(this.masterCompressor);
    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Initialize Decks
    ['A', 'B'].forEach(deckId => {
      const deckSum = this.ctx.createGain();
      
      const lo = this.ctx.createBiquadFilter();
      lo.type = 'lowshelf'; lo.frequency.value = 250;
      
      const mid = this.ctx.createBiquadFilter();
      mid.type = 'peaking'; mid.frequency.value = 1000; mid.Q.value = 0.5;
      
      const hi = this.ctx.createBiquadFilter();
      hi.type = 'highshelf'; hi.frequency.value = 4000;
      
      const filterNode = this.ctx.createBiquadFilter();
      filterNode.type = 'lowpass'; filterNode.frequency.value = 22000;

      const deckGain = this.ctx.createGain();
      deckGain.gain.value = deckId === 'A' ? 1.0 : 0.0;
      
      deckSum.connect(lo);
      lo.connect(mid);
      mid.connect(hi);
      hi.connect(filterNode);
      filterNode.connect(deckGain);
      deckGain.connect(this.masterGain);

      this.decks[deckId].gain = deckGain;
      this.decks[deckId].sum = deckSum;
      this.decks[deckId].eq = { lo, mid, hi };
      this.decks[deckId].filter = filterNode;

      for (let i = 0; i < 5; i++) {
        // Pre-fader analyser
        const analyser = this.ctx.createAnalyser();
        analyser.fftSize = 256;
        
        // Fader (Volume)
        const stemGain = this.ctx.createGain();
        stemGain.gain.value = 0.8;
        
        analyser.connect(stemGain);
        stemGain.connect(deckSum);
        
        this.decks[deckId].analysers.push(analyser);
        this.decks[deckId].stems.push(stemGain);
      }
    });

    this.distortionCurve = this.makeDistortionCurve(400);
    this.generateNoiseBuffer();
  }

  makeDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 50;
    let n_samples = 44100;
    let curve = new Float32Array(n_samples);
    let deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i ) {
      let x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  }

  createReverb(duration, decay) {
    const length = this.ctx.sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, this.ctx.sampleRate);
    for (let i = 0; i < 2; i++) {
      const channelData = impulse.getChannelData(i);
      for (let j = 0; j < length; j++) {
        channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
      }
    }
    const convolver = this.ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  generateNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2.0; 
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  // --- High Quality Synthesizers ---

  playKick(time, outNode, type = 'edm') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(outNode);

    if (type === 'edm') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.start(time); osc.stop(time + 0.6);
    } else if (type === 'deep') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, time);
      osc.frequency.exponentialRampToValueAtTime(20, time + 0.4);
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.linearRampToValueAtTime(0.01, time + 0.6);
      osc.start(time); osc.stop(time + 0.7);
    } else if (type === 'distorted') {
      const dist = this.ctx.createWaveShaper();
      dist.curve = this.distortionCurve;
      dist.oversample = '4x';
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.disconnect();
      osc.connect(dist).connect(gain);
      osc.start(time); osc.stop(time + 0.6);
    }
  }

  playHat(time, outNode, type = 'closed') {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = type === 'open' ? 5000 : 8000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(type === 'open' ? 0.3 : 0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + (type === 'open' ? 0.3 : 0.05));
    
    noise.connect(filter).connect(gain).connect(outNode);
    noise.start(time); noise.stop(time + 0.4);
  }

  playSnare(time, outNode) {
    // Tonal body
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const oscGain = this.ctx.createGain();
    osc.frequency.setValueAtTime(250, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.2);
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    osc.connect(oscGain).connect(outNode);

    // Noise snap
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 2500;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    noise.connect(noiseFilter).connect(noiseGain).connect(outNode);

    // Reverb send
    const revSend = this.ctx.createGain();
    revSend.gain.value = 0.2;
    noiseGain.connect(revSend);
    revSend.connect(this.reverbNode);

    osc.start(time); osc.stop(time + 0.3);
    noise.start(time); noise.stop(time + 0.3);
  }

  playBass(time, outNode, freq, duration, type = 'reese', isSidechained = true) {
    const mainGain = this.ctx.createGain();
    mainGain.connect(outNode);

    // Sidechain pumping simulation
    if (isSidechained) {
      mainGain.gain.setValueAtTime(0.1, time);
      mainGain.gain.linearRampToValueAtTime(0.8, time + 0.2);
    } else {
      mainGain.gain.setValueAtTime(0.6, time);
    }
    mainGain.gain.setValueAtTime(mainGain.gain.value, time + duration - 0.1);
    mainGain.gain.linearRampToValueAtTime(0.01, time + duration);

    if (type === 'reese') {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, time);
      filter.frequency.linearRampToValueAtTime(200, time + duration);
      filter.connect(mainGain);

      [-6, 0, 6].forEach(detune => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(time); osc.stop(time + duration);
      });
    } else if (type === 'acid') {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
      filter.Q.value = 15; // High resonance
      filter.connect(mainGain);

      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start(time); osc.stop(time + duration);
    }
  }

  playChord(time, outNode, chordFreqs, duration, type = 'pad') {
    const mainGain = this.ctx.createGain();
    
    const revSend = this.ctx.createGain();
    revSend.gain.value = 0.4;
    mainGain.connect(revSend);
    revSend.connect(this.reverbNode);
    mainGain.connect(outNode);

    if (type === 'pad') {
      mainGain.gain.setValueAtTime(0.01, time);
      mainGain.gain.linearRampToValueAtTime(0.3, time + duration * 0.3);
      mainGain.gain.setValueAtTime(0.3, time + duration * 0.8);
      mainGain.gain.linearRampToValueAtTime(0.01, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.linearRampToValueAtTime(1500, time + duration * 0.5);
      filter.connect(mainGain);

      chordFreqs.forEach(freq => {
        [-3, 3].forEach(detune => {
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(filter);
          osc.start(time); osc.stop(time + duration);
        });
      });
    } else if (type === 'stab') {
      mainGain.gain.setValueAtTime(0.4, time);
      mainGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

      chordFreqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(mainGain);
        osc.start(time); osc.stop(time + 0.4);
      });
    }
  }

  playPluck(time, outNode, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'square';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    const delaySend = this.ctx.createGain();
    delaySend.gain.value = 0.2;
    gain.connect(delaySend);
    delaySend.connect(this.reverbNode); 

    osc.connect(filter).connect(gain).connect(outNode);
    osc.start(time); osc.stop(time + 0.4);
  }

  playFMPluck(time, outNode, freq) {
    const carrier = this.ctx.createOscillator();
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();

    carrier.type = 'sine';
    modulator.type = 'sine';
    carrier.frequency.value = freq;
    modulator.frequency.value = freq * 0.5; // Sub octave modulator for metallic crunch

    // FM Index Sweep
    modGain.gain.setValueAtTime(freq * 2, time);
    modGain.gain.exponentialRampToValueAtTime(10, time + 0.3);

    // Amplitude Envelope
    mainGain.gain.setValueAtTime(0.5, time);
    mainGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    modulator.connect(modGain).connect(carrier.frequency);
    
    const delaySend = this.ctx.createGain();
    delaySend.gain.value = 0.3;
    mainGain.connect(delaySend).connect(this.reverbNode);

    carrier.connect(mainGain).connect(outNode);

    modulator.start(time); modulator.stop(time + 0.4);
    carrier.start(time); carrier.stop(time + 0.4);
  }

  playWobbleBass(time, outNode, freq, duration, lfoHz = 4) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300; 
    filter.Q.value = 12;

    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = lfoHz;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 2500; // Modulation depth

    const mainGain = this.ctx.createGain();
    mainGain.gain.setValueAtTime(0.8, time);
    mainGain.gain.setTargetAtTime(0.01, time + duration - 0.1, 0.1);

    lfo.connect(lfoGain).connect(filter.frequency);
    osc.connect(filter).connect(mainGain).connect(outNode);

    osc.start(time); osc.stop(time + duration);
    lfo.start(time); lfo.stop(time + duration);
  }

  playNoiseSweep(time, outNode, duration, isUp = true) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 5;

    const startFreq = isUp ? 200 : 6000;
    const endFreq = isUp ? 6000 : 200;

    filter.frequency.setValueAtTime(startFreq, time);
    filter.frequency.exponentialRampToValueAtTime(endFreq, time + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, time);
    gain.gain.linearRampToValueAtTime(0.3, time + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0.01, time + duration);

    const delaySend = this.ctx.createGain();
    delaySend.gain.value = 0.5;
    gain.connect(delaySend).connect(this.reverbNode);

    noise.connect(filter).connect(gain).connect(outNode);
    noise.start(time); noise.stop(time + duration);
  }

  // --- Scheduler ---
  
  start(deckAData, deckBData, masterBpm) {
    if (this.isPlaying) return;
    this.init();
    this.ctx.resume();
    this.isPlaying = true;
    this.deckAData = deckAData;
    this.deckBData = deckBData;
    this.masterBpm = masterBpm;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    clearTimeout(this.timerID);
  }

  setDeckData(deckId, data) {
    if (deckId === 'A') this.deckAData = data;
    if (deckId === 'B') this.deckBData = data;
  }

  setCrossfader(value) {
    if (!this.ctx) return;
    const gainA = Math.cos(value * 0.5 * Math.PI);
    const gainB = Math.cos((1.0 - value) * 0.5 * Math.PI);
    this.decks.A.gain.gain.setTargetAtTime(gainA, this.ctx.currentTime, 0.05);
    this.decks.B.gain.gain.setTargetAtTime(gainB, this.ctx.currentTime, 0.05);
  }

  setDeckEQ(deckId, band, value) {
    if (!this.ctx || !this.decks[deckId].eq[band]) return;
    this.decks[deckId].eq[band].gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  setDeckFilter(deckId, value) {
    if (!this.ctx || !this.decks[deckId].filter) return;
    const filterNode = this.decks[deckId].filter;
    if (value === 0) {
      filterNode.type = 'lowpass';
      filterNode.frequency.setTargetAtTime(22000, this.ctx.currentTime, 0.05);
    } else if (value < 0) {
      filterNode.type = 'lowpass';
      const freq = 20 * Math.pow(1000, 1 + value); 
      filterNode.frequency.setTargetAtTime(Math.max(20, Math.min(22000, freq)), this.ctx.currentTime, 0.05);
    } else {
      filterNode.type = 'highpass';
      const freq = 20 * Math.pow(1000, value);
      filterNode.frequency.setTargetAtTime(Math.max(20, Math.min(22000, freq)), this.ctx.currentTime, 0.05);
    }
  }

  setStemVolume(deckId, stemIndex, value) {
    if (!this.ctx) return;
    this.decks[deckId].stems[stemIndex].gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  scheduler() {
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += (60.0 / this.masterBpm) * 0.25; // 16th notes
      this.currentStep++;
    }
    this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
  }

  scheduleStep(step, time) {
    if (this.deckAData) this.deckAData.play(this, time, step, this.decks.A.analysers);
    if (this.deckBData) this.deckBData.play(this, time, step, this.decks.B.analysers);
  }
}

const engine = new AudioEngine();

// ==========================================
// 2. PROCEDURAL TRACK DEFINITIONS
// ==========================================
// Notes in C Minor / Eb Major
const CHORDS = {
  i: [130.81, 155.56, 196.00],   // C min
  VI: [103.83, 130.81, 155.56],  // Ab maj
  III: [155.56, 196.00, 233.08], // Eb maj
  v: [98.00, 116.54, 146.83],    // G min
  VII: [116.54, 146.83, 174.61]  // Bb maj
};
const ARPS = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25]; // C min pentatonic

const TRACKS = [
  {
    id: 'T1', name: 'Aetherial Edge', genre: 'Ambient Space', targetBpm: 110,
    play: (eng, time, step, outs) => {
      const bar = Math.floor(step / 16);
      const prog = [CHORDS.i, CHORDS.VI, CHORDS.i, CHORDS.v];
      const currentChord = prog[Math.floor(bar / 4) % prog.length];
      const root = currentChord[0] / 2;
      if (step % 16 === 0) eng.playKick(time, outs[0], 'deep');
      if (step % 8 === 4) eng.playHat(time, outs[1], 'closed');
      if (step % 64 === 0) eng.playBass(time, outs[2], root, 4.0, 'reese', false);
      if (step % 64 === 0) eng.playChord(time, outs[3], currentChord, 4.0, 'pad');
      if (step % 3 === 0 && Math.random() > 0.5) eng.playPluck(time, outs[4], ARPS[(step + bar) % ARPS.length]);
    }
  },
  {
    id: 'T2', name: 'Nebula Pulse', genre: 'Cyberpunk', targetBpm: 125,
    play: (eng, time, step, outs) => {
      const bar = Math.floor(step / 16);
      const currentChord = [CHORDS.i, CHORDS.VII, CHORDS.VI, CHORDS.VII][bar % 4];
      const root = currentChord[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 8 === 4) eng.playSnare(time, outs[1]);
      if (step % 2 === 0) eng.playHat(time, outs[1], 'closed');
      if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
      if (step % 2 === 0) eng.playBass(time, outs[2], root, 0.2, 'acid', false);
      if (step % 16 === 0 || step % 16 === 10) eng.playChord(time, outs[3], currentChord, 0.3, 'stab');
      if (step % 16 >= 8 && step % 4 === 0) eng.playPluck(time, outs[4], ARPS[3]);
    }
  },
  {
    id: 'T3', name: 'Event Horizon', genre: 'Deep Techno', targetBpm: 130,
    play: (eng, time, step, outs) => {
      const root = CHORDS.i[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'deep');
      if (step % 4 !== 0 && Math.random() > 0.4) eng.playHat(time, outs[1], 'closed');
      if (step % 4 === 2) eng.playBass(time, outs[2], root, 0.4, 'reese', true);
      if (step % 128 === 0) eng.playChord(time, outs[3], CHORDS.i, 8.0, 'pad');
      // Sparse pluck instead of aggressive acid
      if (step % 16 === 14) eng.playPluck(time, outs[4], ARPS[step % ARPS.length]);
    }
  },
  {
    id: 'T4', name: 'Solar Flare', genre: 'Trance', targetBpm: 138,
    play: (eng, time, step, outs) => {
      const currentChord = [CHORDS.VI, CHORDS.VII, CHORDS.i, CHORDS.v][Math.floor(step / 32) % 4];
      const root = currentChord[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
      if (step % 8 === 4) eng.playSnare(time, outs[1]);
      if (step % 4 !== 0) eng.playBass(time, outs[2], root, 0.15, 'reese', false);
      if (step % 32 === 0) eng.playChord(time, outs[3], currentChord, 2.0, 'pad');
      if (step % 4 === 0 || step % 4 === 3) eng.playPluck(time, outs[4], ARPS[(step) % ARPS.length] * 2);
    }
  },
  {
    id: 'T5', name: 'Oort Cloud', genre: 'Downtempo', targetBpm: 90,
    play: (eng, time, step, outs) => {
      const currentChord = [CHORDS.i, CHORDS.III][Math.floor(step / 64) % 2];
      const root = currentChord[0] / 2;
      if (step % 16 === 0 || step % 16 === 11) eng.playKick(time, outs[0], 'deep');
      if (step % 16 === 8) eng.playSnare(time, outs[1]);
      if (step % 2 === 0) eng.playHat(time, outs[1], 'closed');
      if (step % 16 === 0 || step % 16 === 11) eng.playBass(time, outs[2], root, 1.0, 'acid', false);
      if (step % 16 === 0 || step % 16 === 6) eng.playChord(time, outs[3], currentChord, 1.5, 'stab');
      if (step % 32 === 14) eng.playPluck(time, outs[4], ARPS[4]);
    }
  },
  // --- Additional Tracks (6-10) ---
  {
    id: 'T6', name: 'Supernova', genre: 'Psytrance', targetBpm: 145,
    play: (eng, time, step, outs) => {
      const root = CHORDS.i[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 4 !== 0) eng.playBass(time, outs[2], root, 0.15, 'reese', false);
      if (step % 16 === 0 || step % 16 === 6) eng.playFMPluck(time, outs[4], ARPS[step % ARPS.length]);
      if (step % 8 === 4) eng.playHat(time, outs[1], 'open');
      if (step % 64 === 0) eng.playChord(time, outs[3], CHORDS.i, 4.0, 'pad');
    }
  },
  {
    id: 'T7', name: 'Void Walker', genre: 'Dub / Halftime', targetBpm: 140, // 140 programmed as 70
    play: (eng, time, step, outs) => {
      const root = CHORDS.v[0] / 4; // ultra deep sub
      if (step % 16 === 0 || step % 16 === 10) eng.playKick(time, outs[0], 'deep');
      if (step % 16 === 8) eng.playSnare(time, outs[1]);
      if (step % 4 === 2) eng.playHat(time, outs[1], 'closed');
      if (step % 16 === 0) eng.playBass(time, outs[2], root, 1.5, 'reese', false);
      if (step % 32 === 0) eng.playChord(time, outs[3], CHORDS.v, 1.0, 'stab');
      if (step % 16 === 14) eng.playFMPluck(time, outs[4], ARPS[1]);
    }
  },
  {
    id: 'T8', name: 'Pulsar', genre: 'Synthwave', targetBpm: 115,
    play: (eng, time, step, outs) => {
      const currentChord = [CHORDS.VI, CHORDS.VII][Math.floor(step / 32) % 2];
      const root = currentChord[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 8 === 4) eng.playSnare(time, outs[1]);
      if (step % 2 === 0) eng.playHat(time, outs[1], 'closed');
      if (step % 2 === 0) eng.playBass(time, outs[2], root, 0.25, 'acid', false);
      if (step % 16 === 0 || step % 16 === 6) eng.playChord(time, outs[3], currentChord, 0.5, 'stab');
      if (step % 8 === 6) eng.playPluck(time, outs[4], ARPS[2]);
    }
  },
  {
    id: 'T9', name: 'Quasar', genre: 'Liquid DnB', targetBpm: 170, // Fast
    play: (eng, time, step, outs) => {
      const root = CHORDS.III[0] / 2;
      if (step % 16 === 0 || step % 16 === 10) eng.playKick(time, outs[0], 'deep');
      if (step % 16 === 4 || step % 16 === 12) eng.playSnare(time, outs[1]);
      eng.playHat(time, outs[1], step % 2 === 0 ? 'closed' : 'open');
      if (step % 32 === 0) eng.playBass(time, outs[2], root, 2.0, 'reese', false);
      if (step % 64 === 0) eng.playChord(time, outs[3], CHORDS.III, 4.0, 'pad');
      if (step % 16 === 14) eng.playFMPluck(time, outs[4], ARPS[4]);
    }
  },
  {
    id: 'T10', name: 'Dark Matter', genre: 'Industrial EBM', targetBpm: 105,
    play: (eng, time, step, outs) => {
      const root = CHORDS.i[0] / 2;
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 16 === 8) eng.playSnare(time, outs[1]);
      if (step % 2 === 0) eng.playHat(time, outs[1], 'open');
      if (step % 8 === 0 || step % 8 === 3) eng.playBass(time, outs[2], root, 0.4, 'acid', false);
      if (step % 16 === 0) eng.playChord(time, outs[3], CHORDS.i, 0.2, 'stab');
      if (step % 3 === 0) eng.playFMPluck(time, outs[4], ARPS[(step) % ARPS.length] * 0.5);
    }
  },
  // --- Expanded Pipeline Tracks (11-15) ---
  {
    id: 'T11', name: 'Singularity', genre: 'Midtempo Bass', targetBpm: 105,
    play: (eng, time, step, outs) => {
      const root = CHORDS.i[0] / 4; 
      if (step % 8 === 0) eng.playKick(time, outs[0], 'distorted');
      if (step % 16 === 8) eng.playSnare(time, outs[1]);
      if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
      
      // Dynamic LFO wobble bass (switches speeds mid-bar)
      if (step % 8 === 0) {
        const lfoRate = step % 16 === 0 ? 2 : 8; 
        eng.playWobbleBass(time, outs[2], root, 1.0, lfoRate);
      }
      if (step % 32 === 30) eng.playWobbleBass(time, outs[2], root * 1.5, 0.5, 16);

      if (step % 64 === 0) eng.playChord(time, outs[3], CHORDS.i, 4.0, 'stab');
      // FX Sweep rise before the drop
      if (step % 64 === 48) eng.playNoiseSweep(time, outs[4], 2.0, true);
    }
  },
  {
    id: 'T12', name: 'Nebular Dust', genre: 'Lo-Fi House', targetBpm: 118,
    play: (eng, time, step, outs) => {
      const prog = [CHORDS.v, CHORDS.VII];
      const currentChord = prog[Math.floor(step / 32) % 2];
      const root = currentChord[0] / 2;
      
      if (step % 4 === 0) eng.playKick(time, outs[0], 'deep');
      if (step % 8 === 4) eng.playSnare(time, outs[1]); 
      if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
      
      if (step % 16 === 10 || step % 16 === 14) eng.playBass(time, outs[2], root, 0.3, 'reese', true);
      if (step % 16 === 4 || step % 16 === 12) eng.playChord(time, outs[3], currentChord, 0.5, 'stab');
      
      // Vinyl/atmosphere texture substitute using slow sweep
      if (step % 16 === 0) eng.playNoiseSweep(time, outs[4], 1.5, false);
    }
  },
  {
    id: 'T13', name: 'Chronos', genre: 'Psybient', targetBpm: 90,
    play: (eng, time, step, outs) => {
      const root = CHORDS.i[0] / 2;
      if (step % 16 === 0) eng.playKick(time, outs[0], 'deep');
      if (step % 4 === 0) eng.playHat(time, outs[1], 'closed');
      if (step % 16 === 14) eng.playHat(time, outs[1], 'open');
      
      // Extremely slow, breathing bass
      if (step % 32 === 0) eng.playWobbleBass(time, outs[2], root, 4.0, 0.5);
      if (step % 64 === 0) eng.playChord(time, outs[3], CHORDS.i, 8.0, 'pad');
      if (step % 16 === 6 || step % 16 === 8) eng.playFMPluck(time, outs[4], ARPS[step % ARPS.length]);
    }
  },
  {
    id: 'T14', name: 'Tachyon', genre: 'Hardwave', targetBpm: 130,
    play: (eng, time, step, outs) => {
      const root = CHORDS.VI[0] / 2;
      
      if (step % 8 === 0 || step % 16 === 11) eng.playKick(time, outs[0], 'distorted');
      if (step % 16 === 8) eng.playSnare(time, outs[1]);
      
      // Trap-style hi-hats with 32nd note rolls injected mid-step
      if (step % 2 === 0) eng.playHat(time, outs[1], 'closed');
      if (step % 32 >= 24) {
        eng.playHat(time + (60.0 / eng.masterBpm) * 0.125, outs[1], 'closed'); 
      }
      
      if (step % 16 === 0) eng.playBass(time, outs[2], root, 2.0, 'reese', true);
      
      // Huge supersaw chords
      if (step % 32 === 0) eng.playChord(time, outs[3], CHORDS.VI, 2.0, 'pad');
      if (step % 32 === 16) eng.playChord(time, outs[3], CHORDS.VII, 2.0, 'pad');
      
      if (step % 4 === 0) eng.playFMPluck(time, outs[4], ARPS[4] * 2); 
    }
  },
  {
    id: 'T15', name: 'Solar Wind', genre: 'Prog House', targetBpm: 124,
    play: (eng, time, step, outs) => {
      const bar = Math.floor(step / 16);
      const currentChord = [CHORDS.i, CHORDS.v, CHORDS.VI, CHORDS.III][bar % 4];
      const root = currentChord[0] / 2;
      
      if (step % 4 === 0) eng.playKick(time, outs[0], 'edm');
      if (step % 8 === 4) eng.playSnare(time, outs[1]);
      if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
      
      // 16th note rolling bass
      if (step % 4 !== 0) eng.playBass(time, outs[2], root, 0.15, 'acid', false);
      
      if (step % 16 === 0) eng.playChord(time, outs[3], currentChord, 2.0, 'pad');
      if (step % 8 === 3 || step % 8 === 6) eng.playPluck(time, outs[4], ARPS[(step) % ARPS.length]);
    }
  }
];

// ==========================================
// 3. UI COMPONENTS & VISUALIZERS
// ==========================================

const Visualizer = ({ analyser, type = 'waveform', color = '#00f3ff', className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId;

    const dataArray = new Uint8Array(type === 'waveform' ? analyser.frequencyBinCount : analyser.frequencyBinCount);
    
    const draw = () => {
      animationId = requestAnimationFrame(draw);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      
      if (type === 'waveform') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();
        const sliceWidth = width * 1.0 / analyser.frequencyBinCount;
        let x = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          const v = dataArray[i] / 128.0;
          const y = v * height / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      } else {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (width / analyser.frequencyBinCount) * 2.5;
        let barHeight;
        let x = 0;
        for (let i = 0; i < analyser.frequencyBinCount; i++) {
          barHeight = dataArray[i] / 2;
          ctx.fillStyle = color;
          ctx.fillRect(x, height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
    };
    
    draw();
    return () => cancelAnimationFrame(animationId);
  }, [analyser, type, color]);

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} width={200} height={100} />;
};

const EQSlider = ({ label, value, onChange, min=-40, max=6, step=1, disabled, accentClass="accent-white" }) => (
  <div className="flex flex-col items-center gap-1 w-full">
    <div className="text-[9px] text-gray-500 font-bold tracking-widest">{label}</div>
    <input 
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      disabled={disabled}
      className={`h-16 w-3 ${accentClass} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
    />
    <div className="text-[8px] text-gray-600 font-bold h-2">
      {label === 'FLT' ? (value === 0 ? 'OFF' : (value > 0 ? 'HPF' : 'LPF')) : (value > 0 ? `+${Math.round(value)}` : Math.round(value))}
    </div>
  </div>
);

const StemFader = ({ label, analyser, volume, setVolume, color, disabled }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest h-6 text-center">{label}</div>
      <div className="h-16 w-full border border-[#222] bg-[#0a0a0a] rounded overflow-hidden">
         {analyser && <Visualizer analyser={analyser} type="waveform" color={color} />}
      </div>
      <input 
        type="range" 
        min="0" max="1" step="0.01" 
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        disabled={disabled}
        className={`h-32 w-4 origin-center appearance-none bg-[#111] border border-[#333] ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
      />
      <div className="text-[10px] text-gray-500">{Math.round(volume * 100)}%</div>
    </div>
  );
};

const Deck = ({ id, currentTrackIdx, setTrackIdx, stems, volumes, setVolume, color, disabled }) => {
  const track = TRACKS[currentTrackIdx];
  const stemLabels = ['KICK', 'PERC', 'BASS', 'CHORD', 'ARP/FX'];
  
  return (
    <div className="flex-1 bg-[#050505] border border-[#333] p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-[#222] pb-2">
        <div>
          <div className="text-xl font-bold tracking-widest" style={{color}}>[ DECK {id} ]</div>
          <select 
            className="bg-transparent text-sm mt-1 border border-[#333] p-1 outline-none text-white w-48"
            value={currentTrackIdx}
            onChange={(e) => setTrackIdx(parseInt(e.target.value))}
            disabled={disabled}
          >
            {TRACKS.map((t, i) => (
              <option key={t.id} value={i} className="bg-black text-white">{t.name} ({t.genre})</option>
            ))}
          </select>
        </div>
        <div className="text-right text-xs text-gray-500">
          STATUS: <span className="text-green-500">SYNCED</span><br/>
          GENRE: {track.genre.toUpperCase()}
        </div>
      </div>
      
      <div className="flex justify-between mt-2 px-2 gap-2">
        {volumes.map((vol, i) => (
          <StemFader 
            key={i} 
            label={stemLabels[i]} 
            analyser={stems ? stems[i] : null}
            volume={vol} 
            setVolume={(v) => setVolume(i, v)} 
            color={color}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoDj, setIsAutoDj] = useState(false);
  const [autoPhase, setAutoPhase] = useState('IDLE');
  
  const [masterBpm, setMasterBpm] = useState(120);
  const [crossfader, setCrossfader] = useState(0.5);
  
  const [deckATrackIdx, setDeckATrackIdx] = useState(0);
  const [deckBTrackIdx, setDeckBTrackIdx] = useState(1);
  
  const [deckAVols, setDeckAVols] = useState([0.8, 0.8, 0.8, 0.8, 0.8]);
  const [deckBVols, setDeckBVols] = useState([0.8, 0.8, 0.8, 0.8, 0.8]);

  const [deckAEQ, setDeckAEQ] = useState({ hi: 0, mid: 0, lo: 0, filter: 0 });
  const [deckBEQ, setDeckBEQ] = useState({ hi: 0, mid: 0, lo: 0, filter: 0 });

  // --- Auto DJ Routine ---
  const autoDjState = useRef({
    phase: 'IDLE', // IDLE | MIX_TO_B | MIX_TO_A
    ticks: 0,
    activeDeck: 'A', // Deck that is currently at full volume
    targetBpm: 120,
    bassSwapped: false
  });

  useEffect(() => {
    if (!isAutoDj || !isPlaying) return;
    
    // Set initial active deck based on current crossfader position if just turned on
    if (autoDjState.current.phase === 'IDLE' && autoDjState.current.ticks === 0) {
      autoDjState.current.activeDeck = crossfader < 0.5 ? 'A' : 'B';
    }

    const interval = setInterval(() => {
      const st = autoDjState.current;
      st.ticks++;
      
      if (st.phase === 'IDLE') {
        // Wait ~15 seconds (300 ticks at 50ms) before mixing
        if (st.ticks > 300) {
          st.phase = st.activeDeck === 'A' ? 'MIX_TO_B' : 'MIX_TO_A';
          st.ticks = 0;
          st.bassSwapped = false;
          
          // Select random new track for the upcoming deck
          const activeIdx = st.activeDeck === 'A' ? deckATrackIdx : deckBTrackIdx;
          let newTrackIdx;
          do { newTrackIdx = Math.floor(Math.random() * TRACKS.length); } while (newTrackIdx === activeIdx);
          
          if (st.activeDeck === 'A') {
            setDeckBTrackIdx(newTrackIdx);
            engine.setDeckData('B', TRACKS[newTrackIdx]);
          } else {
            setDeckATrackIdx(newTrackIdx);
            engine.setDeckData('A', TRACKS[newTrackIdx]);
          }
          
          // Grab target BPM from the new track
          st.targetBpm = TRACKS[newTrackIdx].targetBpm;
          setAutoPhase(st.phase);

          // Prep upcoming deck EQ (Highpass fully engaged, Bass cut)
          if (st.activeDeck === 'A') {
            setDeckBEQ({ hi: 0, mid: 0, lo: -40, filter: 1.0 });
            engine.setDeckEQ('B', 'lo', -40);
            engine.setDeckFilter('B', 1.0);
          } else {
            setDeckAEQ({ hi: 0, mid: 0, lo: -40, filter: 1.0 });
            engine.setDeckEQ('A', 'lo', -40);
            engine.setDeckFilter('A', 1.0);
          }
        }
      } else if (st.phase === 'MIX_TO_B') {
        const mixDuration = 200; // 10 seconds
        const prog = Math.min(1.0, st.ticks / mixDuration);

        // Move crossfader
        setCrossfader(prog);
        engine.setCrossfader(prog);

        // Filter sweeps (B sweeps in from HPF, A sweeps out to HPF)
        const bFilt = 1.0 - prog;
        const aFilt = prog;
        setDeckBEQ(prev => ({...prev, filter: bFilt})); engine.setDeckFilter('B', bFilt);
        setDeckAEQ(prev => ({...prev, filter: aFilt})); engine.setDeckFilter('A', aFilt);

        // Bass swap at 50%
        if (prog >= 0.5 && !st.bassSwapped) {
            setDeckAEQ(prev => ({...prev, lo: -40})); engine.setDeckEQ('A', 'lo', -40);
            setDeckBEQ(prev => ({...prev, lo: 0})); engine.setDeckEQ('B', 'lo', 0);
            st.bassSwapped = true;
        }

        if (prog >= 1.0) {
          st.phase = 'IDLE';
          st.activeDeck = 'B';
          st.ticks = 0;
          setAutoPhase('IDLE');
        }

        // Interpolate BPM
        setMasterBpm(bpm => {
          if (Math.abs(bpm - st.targetBpm) <= 0.1) return st.targetBpm;
          return bpm + (bpm < st.targetBpm ? 0.05 : -0.05);
        });
      } else if (st.phase === 'MIX_TO_A') {
        const mixDuration = 200; // 10 seconds
        const prog = Math.min(1.0, st.ticks / mixDuration);

        // Move crossfader
        const cfProg = 1.0 - prog; // 1.0 to 0.0
        setCrossfader(cfProg);
        engine.setCrossfader(cfProg);

        // Filter sweeps (A sweeps in from HPF, B sweeps out to HPF)
        const aFilt = 1.0 - prog;
        const bFilt = prog;
        setDeckAEQ(prev => ({...prev, filter: aFilt})); engine.setDeckFilter('A', aFilt);
        setDeckBEQ(prev => ({...prev, filter: bFilt})); engine.setDeckFilter('B', bFilt);

        // Bass swap at 50%
        if (prog >= 0.5 && !st.bassSwapped) {
            setDeckBEQ(prev => ({...prev, lo: -40})); engine.setDeckEQ('B', 'lo', -40);
            setDeckAEQ(prev => ({...prev, lo: 0})); engine.setDeckEQ('A', 'lo', 0);
            st.bassSwapped = true;
        }

        if (prog >= 1.0) {
          st.phase = 'IDLE';
          st.activeDeck = 'A';
          st.ticks = 0;
          setAutoPhase('IDLE');
        }

        // Interpolate BPM
        setMasterBpm(bpm => {
          if (Math.abs(bpm - st.targetBpm) <= 0.1) return st.targetBpm;
          return bpm + (bpm < st.targetBpm ? 0.05 : -0.05);
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isAutoDj, isPlaying, deckATrackIdx, deckBTrackIdx, crossfader]);

  // --- Controls ---
  const togglePlay = () => {
    if (!isPlaying) {
      engine.start(TRACKS[deckATrackIdx], TRACKS[deckBTrackIdx], masterBpm);
      engine.setCrossfader(crossfader);
      deckAVols.forEach((v, i) => engine.setStemVolume('A', i, v));
      deckBVols.forEach((v, i) => engine.setStemVolume('B', i, v));
      ['lo', 'mid', 'hi'].forEach(b => {
          engine.setDeckEQ('A', b, deckAEQ[b]);
          engine.setDeckEQ('B', b, deckBEQ[b]);
      });
      engine.setDeckFilter('A', deckAEQ.filter);
      engine.setDeckFilter('B', deckBEQ.filter);
      setIsPlaying(true);
    } else {
      engine.stop();
      setIsPlaying(false);
      setIsAutoDj(false);
    }
  };

  useEffect(() => { if (isPlaying) engine.setDeckData('A', TRACKS[deckATrackIdx]); }, [deckATrackIdx, isPlaying]);
  useEffect(() => { if (isPlaying) engine.setDeckData('B', TRACKS[deckBTrackIdx]); }, [deckBTrackIdx, isPlaying]);
  useEffect(() => { engine.masterBpm = masterBpm; }, [masterBpm]);

  const handleCrossfade = (e) => {
    const val = parseFloat(e.target.value);
    setCrossfader(val);
    if (isPlaying) engine.setCrossfader(val);
  };

  const handleDeckVolume = (deckId, stemIdx, val) => {
    if (deckId === 'A') {
      const newVols = [...deckAVols];
      newVols[stemIdx] = val;
      setDeckAVols(newVols);
    } else {
      const newVols = [...deckBVols];
      newVols[stemIdx] = val;
      setDeckBVols(newVols);
    }
    if (isPlaying) engine.setStemVolume(deckId, stemIdx, val);
  };

  const handleEQ = (deckId, control, val) => {
    if (deckId === 'A') setDeckAEQ(prev => ({...prev, [control]: val}));
    else setDeckBEQ(prev => ({...prev, [control]: val}));
    
    if (isPlaying) {
      if (control === 'filter') engine.setDeckFilter(deckId, val);
      else engine.setDeckEQ(deckId, control, val);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-[#d3d3d3] font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-gray-800">
      
      <div className="w-full max-w-7xl border border-[#333] bg-[#0a0a0a] rounded shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Header */}
        <div className="border-b border-[#333] p-4 flex justify-between items-center bg-[#000]">
          <div>
            <h1 className="text-cyan-400 font-bold tracking-widest text-lg">AETHER_EDGE // STEM_DECK</h1>
            <p className="text-xs text-[#666] tracking-widest mt-1">PROCEDURAL AUDIO ROUTING SYS v5.0</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <label className="text-[10px] text-[#666] uppercase">Master Clock (BPM)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" min="70" max="180" 
                  value={masterBpm} onChange={(e) => setMasterBpm(parseFloat(e.target.value))}
                  disabled={isAutoDj}
                  className={`w-24 ${isAutoDj ? 'accent-gray-500 cursor-not-allowed' : 'accent-orange-500'}`}
                />
                <span className="text-orange-500 w-12 text-left">{masterBpm.toFixed(1)}</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsAutoDj(!isAutoDj)}
              disabled={!isPlaying}
              className={`px-4 py-3 font-bold border tracking-widest transition-all text-xs ${
                !isPlaying ? 'border-[#333] text-[#333] cursor-not-allowed' :
                isAutoDj 
                ? 'border-yellow-400 text-yellow-400 bg-yellow-900/20 shadow-[0_0_15px_rgba(250,204,21,0.4)]'
                : 'border-gray-500 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {isAutoDj ? 'AUTO_DJ: ON' : 'AUTO_DJ: OFF'}
            </button>

            <button 
              onClick={togglePlay}
              className={`px-8 py-3 font-bold border tracking-widest transition-all ${
                isPlaying 
                ? 'border-red-500 text-red-500 bg-red-900/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                : 'border-cyan-500 text-cyan-400 hover:bg-cyan-900/30'
              }`}
            >
              {isPlaying ? 'HALT SYS' : 'INIT AUDIO'}
            </button>
          </div>
        </div>

        {/* Master Visualizer Strip */}
        <div className="h-24 w-full bg-[#050505] border-b border-[#333] p-2 flex gap-4">
          <div className="w-48 shrink-0 flex flex-col justify-center text-xs text-gray-500 pl-4 border-r border-[#222]">
            <p className="text-orange-400 font-bold mb-1">MASTER_OUT</p>
            <p>FFT_SIZE: 1024</p>
            <p>COMPRESSOR: ACTIVE</p>
            <p>REVERB_BUS: ACTIVE</p>
          </div>
          <div className="flex-1 relative">
            {isPlaying && engine.masterAnalyser && (
              <Visualizer analyser={engine.masterAnalyser} type="spectrum" color="#f97316" />
            )}
            {!isPlaying && <div className="absolute inset-0 flex items-center justify-center text-[#333] text-sm tracking-widest">AWAITING SIGNAL</div>}
          </div>
        </div>

        {/* Mixer Area */}
        <div className="flex p-4 gap-6 bg-[#0a0a0a]">
          
          {/* Deck A */}
          <Deck 
            id="A" color="#06b6d4" // Cyan
            currentTrackIdx={deckATrackIdx} setTrackIdx={setDeckATrackIdx}
            stems={isPlaying ? engine.decks.A.analysers : null}
            volumes={deckAVols} setVolume={(i, v) => handleDeckVolume('A', i, v)}
            disabled={isAutoDj}
          />

          {/* Center Mixer / Crossfader */}
          <div className="w-80 shrink-0 flex flex-col items-center border border-[#333] bg-[#050505] p-2 relative rounded">
            {isAutoDj && <div className="absolute inset-0 bg-yellow-400/5 pointer-events-none border border-yellow-400/20 animate-pulse rounded"></div>}
            
            <div className="flex gap-2 flex-1 w-full z-10">
              {/* CH A EQ */}
              <div className="flex-1 bg-[#0a0a0a] border border-[#222] py-2 flex flex-col items-center gap-2 rounded">
                 <div className="text-[10px] text-cyan-600 font-bold mb-2">CH A EQ</div>
                 <EQSlider label="HI" value={deckAEQ.hi} onChange={(v) => handleEQ('A', 'hi', v)} disabled={isAutoDj} accentClass="accent-cyan-500" />
                 <EQSlider label="MID" value={deckAEQ.mid} onChange={(v) => handleEQ('A', 'mid', v)} disabled={isAutoDj} accentClass="accent-cyan-500" />
                 <EQSlider label="LO" value={deckAEQ.lo} onChange={(v) => handleEQ('A', 'lo', v)} disabled={isAutoDj} accentClass="accent-cyan-500" />
                 <div className="w-full h-[1px] bg-[#222] my-1" />
                 <EQSlider label="FLT" value={deckAEQ.filter} min={-1} max={1} step={0.01} onChange={(v) => handleEQ('A', 'filter', v)} disabled={isAutoDj} accentClass="accent-cyan-500" />
              </div>

              {/* Center Gutter */}
              <div className="w-6 flex flex-col items-center justify-between py-4">
                 <div className="flex flex-col gap-1 items-center opacity-50">
                   <div className="w-1 h-1 rounded-full bg-red-500"></div>
                   <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
                   <div className="w-1 h-1 rounded-full bg-green-500"></div>
                   <div className="w-1 h-1 rounded-full bg-green-500"></div>
                   <div className="w-1 h-1 rounded-full bg-green-500"></div>
                 </div>
                 <div className="text-[10px] text-gray-500 font-bold tracking-widest" style={{writingMode: 'vertical-rl'}}>MIXER</div>
              </div>

              {/* CH B EQ */}
              <div className="flex-1 bg-[#0a0a0a] border border-[#222] py-2 flex flex-col items-center gap-2 rounded">
                 <div className="text-[10px] text-fuchsia-600 font-bold mb-2">CH B EQ</div>
                 <EQSlider label="HI" value={deckBEQ.hi} onChange={(v) => handleEQ('B', 'hi', v)} disabled={isAutoDj} accentClass="accent-fuchsia-500" />
                 <EQSlider label="MID" value={deckBEQ.mid} onChange={(v) => handleEQ('B', 'mid', v)} disabled={isAutoDj} accentClass="accent-fuchsia-500" />
                 <EQSlider label="LO" value={deckBEQ.lo} onChange={(v) => handleEQ('B', 'lo', v)} disabled={isAutoDj} accentClass="accent-fuchsia-500" />
                 <div className="w-full h-[1px] bg-[#222] my-1" />
                 <EQSlider label="FLT" value={deckBEQ.filter} min={-1} max={1} step={0.01} onChange={(v) => handleEQ('B', 'filter', v)} disabled={isAutoDj} accentClass="accent-fuchsia-500" />
              </div>
            </div>

            {/* Crossfader */}
            <div className="w-full mt-3 border border-[#222] bg-[#0a0a0a] p-3 flex flex-col rounded z-10">
              <div className="w-full px-1 flex justify-between text-[10px] text-gray-600 font-bold mb-2">
                <span className="text-cyan-600">A</span>
                <span className="text-gray-500">X-FADE</span>
                <span className="text-fuchsia-600">B</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={crossfader}
                onChange={handleCrossfade}
                disabled={isAutoDj}
                className={`w-full h-2 rounded-none bg-[#222] ${isAutoDj ? 'accent-yellow-400 cursor-not-allowed' : 'accent-white cursor-pointer'}`}
              />
            </div>
          </div>

          {/* Deck B */}
          <Deck 
            id="B" color="#d946ef" // Fuchsia
            currentTrackIdx={deckBTrackIdx} setTrackIdx={setDeckBTrackIdx}
            stems={isPlaying ? engine.decks.B.analysers : null}
            volumes={deckBVols} setVolume={(i, v) => handleDeckVolume('B', i, v)}
            disabled={isAutoDj}
          />

        </div>
        
        {/* Footer / Logs */}
        <div className="border-t border-[#333] bg-[#000] p-2 px-4 text-[10px] text-[#555] flex justify-between items-center font-mono h-8">
          <div className="flex gap-4">
            <span>{"> SYSTEM READY..."}</span>
            {isAutoDj && (
              <span className="text-yellow-400 animate-pulse">
                {"> AUTO_DJ_SYS: [ENGAGED] | PHASE: " + autoPhase + " | CF_POS: " + crossfader.toFixed(2)}
              </span>
            )}
          </div>
          <span>DEV_NODE: AETHER_LABS</span>
        </div>

      </div>
    </div>
  );
}