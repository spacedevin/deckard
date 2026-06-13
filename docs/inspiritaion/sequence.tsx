import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Helper for creating preset sequences easily ---
const P = (patternStr) => patternStr.split('').map(c => c === '1');

// --- Web Audio Synthesis Engine ---
class AetherSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.delayNode = null;
    this.droneOscillators = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;

    this.delayNode = this.ctx.createDelay();
    this.delayNode.delayTime.value = 0.5; 
    
    this.feedbackGain = this.ctx.createGain();
    this.feedbackGain.gain.value = 0.55; 
    
    this.delayFilter = this.ctx.createBiquadFilter();
    this.delayFilter.type = 'lowpass';
    this.delayFilter.frequency.value = 2000; 

    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayFilter);
    this.delayFilter.connect(this.delayNode);
    this.delayNode.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    
    this.isInitialized = true;
  }

  playNote(frequency, time, instrument = 'ethereal') {
    if (!this.ctx) return;

    const noteGain = this.ctx.createGain();
    const noteFilter = this.ctx.createBiquadFilter();

    noteGain.connect(noteFilter);
    noteFilter.connect(this.masterGain);

    const hasReverb = ['ethereal', 'stellar_bells', 'lofi', 'synth_lead'].includes(instrument);
    if (hasReverb) {
      noteFilter.connect(this.delayNode); 
    }

    if (instrument === 'ethereal') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(frequency, time);
      osc2.frequency.setValueAtTime(frequency * 1.008, time); 

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(2000, time);

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.2, time + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 3.0);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 3.5);
      osc2.stop(time + 3.5);

    } else if (instrument === 'lofi') {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(frequency, time);

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 2.5; 
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 15; 
      lfo.connect(lfoGain);
      lfoGain.connect(osc.detune);

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(600, time);

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.12, time + 0.02); 
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5); 

      osc.connect(noteGain);
      lfo.start(time);
      osc.start(time);
      lfo.stop(time + 2);
      osc.stop(time + 2);

    } else if (instrument === 'stellar_bells') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(frequency, time);
      osc2.frequency.setValueAtTime(frequency * 2.01, time); 

      noteFilter.type = 'highpass';
      noteFilter.frequency.setValueAtTime(800, time); 

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.15, time + 0.01); 
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 1.0); 

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 1.5);
      osc2.stop(time + 1.5);

    } else if (instrument === 'dark_pulse') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency / 2, time);

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(4000, time);
      noteFilter.frequency.exponentialRampToValueAtTime(200, time + 0.3);

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.2, time + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.4); 

      osc.connect(noteGain);
      osc.start(time);
      osc.stop(time + 0.5);
    
    } else if (instrument === 'synth_lead') {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'square';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(frequency, time);
      osc2.frequency.setValueAtTime(frequency * 1.005, time); 

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(3500, time);
      noteFilter.frequency.exponentialRampToValueAtTime(800, time + 0.5);

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.15, time + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8); 

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + 1.0);
      osc2.stop(time + 1.0);

    } else if (instrument === 'synth_bass') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequency, time);

      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(2500, time);
      noteFilter.frequency.exponentialRampToValueAtTime(100, time + 0.2); 

      noteGain.gain.setValueAtTime(0, time);
      noteGain.gain.linearRampToValueAtTime(0.3, time + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.3); 

      osc.connect(noteGain);
      osc.start(time);
      osc.stop(time + 0.4);

    } else if (instrument === 'kick') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      noteGain.gain.setValueAtTime(1, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      
      osc.connect(noteGain);
      osc.start(time);
      osc.stop(time + 0.6);

    } else if (instrument === 'snare') {
      const bufferSize = this.ctx.sampleRate * 0.2; 
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1500;
      noise.connect(noiseFilter).connect(noteGain);

      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, time);
      osc.connect(noteGain);

      noteGain.gain.setValueAtTime(0.8, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

      noise.start(time);
      osc.start(time);
      noise.stop(time + 0.2);
      osc.stop(time + 0.2);

    } else if (instrument === 'hihat') {
      const bufferSize = this.ctx.sampleRate * 0.05; 
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 7000;
      noise.connect(noiseFilter).connect(noteGain);

      noteGain.gain.setValueAtTime(0.4, time);
      noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05); 

      noise.start(time);
      noise.stop(time + 0.06);
    }
  }

  startDrone() {
    if (!this.ctx || this.droneOscillators.length > 0) return;
    const droneBaseFreq = 65.41; 

    [1, 1.01, 1.5].forEach(multiplier => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lfo = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = droneBaseFreq * multiplier;

      filter.type = 'lowpass';
      filter.frequency.value = 400;

      lfo.type = 'sine';
      lfo.frequency.value = 0.1 + (Math.random() * 0.1); 
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 300;
      
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      gain.gain.value = 0.05; 

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(this.delayNode); 

      osc.start();
      lfo.start();

      this.droneOscillators.push({ osc, lfo, gain });
    });
  }

  stopDrone() {
    this.droneOscillators.forEach(d => {
      d.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
      setTimeout(() => {
        d.osc.stop();
        d.lfo.stop();
      }, 2100);
    });
    this.droneOscillators = [];
  }
}

const synth = new AetherSynth();

// --- Theme Definitions & Pre-filled Sequences ---
const THEMES = {
  AETHERIAL: {
    id: 'AETHERIAL',
    title: 'AETHER_AUDIO_NEXUS',
    subtitle: 'ORBITAL RESONATOR v2.1.0',
    colorMode: 'cyan',
    defaultBpm: 95,
    tracks: [
      { patch: 'stellar_bells', freq: 523.25, note: 'C5',  color: 'bg-teal-400',   shadow: 'shadow-[0_0_8px_rgba(45,212,191,0.8)]' },
      { patch: 'stellar_bells', freq: 392.00, note: 'G4',  color: 'bg-teal-400',   shadow: 'shadow-[0_0_8px_rgba(45,212,191,0.8)]' },
      { patch: 'ethereal',      freq: 311.13, note: 'Eb4', color: 'bg-cyan-500',   shadow: 'shadow-[0_0_8px_rgba(6,182,212,0.8)]' },
      { patch: 'ethereal',      freq: 261.63, note: 'C4',  color: 'bg-cyan-500',   shadow: 'shadow-[0_0_8px_rgba(6,182,212,0.8)]' },
      { patch: 'lofi',          freq: 233.08, note: 'Bb3', color: 'bg-orange-400', shadow: 'shadow-[0_0_8px_rgba(251,146,60,0.8)]' },
      { patch: 'lofi',          freq: 196.00, note: 'G3',  color: 'bg-orange-400', shadow: 'shadow-[0_0_8px_rgba(251,146,60,0.8)]' },
      { patch: 'dark_pulse',    freq: 155.56, note: 'Eb3', color: 'bg-rose-500',   shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.8)]' },
      { patch: 'dark_pulse',    freq: 130.81, note: 'C3',  color: 'bg-rose-500',   shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.8)]' }
    ],
    presets: [
      [
        P("1000000010000000"), P("0000100000001000"), P("1000000000000000"), P("0000000010000000"), 
        P("0010001000100010"), P("0100010001000100"), P("1000000010000000"), P("1000000000000000"), 
      ],
      [
        P("1000100010001000"), P("0010001000100010"), P("0100010001000100"), P("0001000100010001"),
        P("1000000010000000"), P("0000100000001000"), P("1000000000000000"), P("0000000010000000"),
      ]
    ]
  },
  SYNTHWAVE: {
    id: 'SYNTHWAVE',
    title: 'NEON_GRID_MAINFRAME',
    subtitle: 'VIRTUAL DRIVE ENGINE v8.8.4',
    colorMode: 'fuchsia',
    defaultBpm: 120,
    tracks: [
      { patch: 'synth_lead', freq: 392.00, note: 'G4',  color: 'bg-fuchsia-400', shadow: 'shadow-[0_0_8px_rgba(232,121,249,0.8)]' },
      { patch: 'synth_lead', freq: 311.13, note: 'Eb4', color: 'bg-fuchsia-400', shadow: 'shadow-[0_0_8px_rgba(232,121,249,0.8)]' },
      { patch: 'synth_lead', freq: 261.63, note: 'C4',  color: 'bg-fuchsia-500', shadow: 'shadow-[0_0_8px_rgba(217,70,239,0.8)]' },
      { patch: 'synth_bass', freq: 98.00,  note: 'G2',  color: 'bg-indigo-500',  shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.8)]' },
      { patch: 'synth_bass', freq: 65.41,  note: 'C2',  color: 'bg-indigo-500',  shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.8)]' },
      { patch: 'hihat',      freq: 0,      note: 'HAT', color: 'bg-yellow-400',  shadow: 'shadow-[0_0_8px_rgba(250,204,21,0.8)]' },
      { patch: 'snare',      freq: 0,      note: 'SNR', color: 'bg-pink-500',    shadow: 'shadow-[0_0_8px_rgba(236,72,153,0.8)]' },
      { patch: 'kick',       freq: 0,      note: 'KCK', color: 'bg-orange-500',  shadow: 'shadow-[0_0_8px_rgba(249,115,22,0.8)]' },
    ],
    presets: [
      [
        P("0000000000001000"), P("0000100000000010"), P("1000001010000000"), P("0000000010101010"), 
        P("1010101000000000"), P("1111111111111111"), P("0000100000001000"), P("1000000010000000"), 
      ],
      [
        P("0010000000100000"), P("0100010001000100"), P("1000000010000000"), P("0000100000001000"), 
        P("1010001010100010"), P("1010101010101010"), P("0000100000001000"), P("1000000010000000"), 
      ]
    ]
  }
};

const ROWS = 8;
const COLS = 16;

export default function App() {
  const [themeId, setThemeId] = useState('AETHERIAL');
  const [targetThemeId, setTargetThemeId] = useState('SYNTHWAVE');
  const [presetIdx, setPresetIdx] = useState(0);
  
  const currentTheme = THEMES[themeId];
  const [mixedTracks, setMixedTracks] = useState(currentTheme.tracks);
  
  const [grid, setGrid] = useState(() => currentTheme.presets[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(currentTheme.defaultBpm);
  const [currentStep, setCurrentStep] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [showDrone, setShowDrone] = useState(false);
  const [isEvolvingNotes, setIsEvolvingNotes] = useState(false);
  const [isEvolvingTheme, setIsEvolvingTheme] = useState(false);

  const gridRef = useRef(grid);
  const mixedTracksRef = useRef(mixedTracks);
  const isPlayingRef = useRef(isPlaying);
  const bpmRef = useRef(bpm);
  const currentStepRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const schedulerTimerRef = useRef(null);
  const isEvolvingNotesRef = useRef(isEvolvingNotes);
  const isEvolvingThemeRef = useRef(isEvolvingTheme);
  const targetThemeIdRef = useRef(targetThemeId);
  const sequenceCounterRef = useRef(0);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { mixedTracksRef.current = mixedTracks; }, [mixedTracks]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { isEvolvingNotesRef.current = isEvolvingNotes; }, [isEvolvingNotes]);
  useEffect(() => { isEvolvingThemeRef.current = isEvolvingTheme; }, [isEvolvingTheme]);
  useEffect(() => { targetThemeIdRef.current = targetThemeId; }, [targetThemeId]);

  const scheduleNote = useCallback((stepIndex, time) => {
    setTimeout(() => {
      setCurrentStep(stepIndex);
    }, Math.max(0, (time - synth.ctx.currentTime) * 1000));

    const currentColumn = gridRef.current.map(row => row[stepIndex]);
    currentColumn.forEach((isActive, rowIndex) => {
      if (isActive) {
        const track = mixedTracksRef.current[rowIndex];
        synth.playNote(track.freq, time, track.patch);
      }
    });
  }, []);

  const mutateGrid = (currentGrid) => {
    const newGrid = currentGrid.map(row => [...row]);
    
    let leadCount = 0;
    const activeLeads = [];
    for (let r = 0; r <= 2; r++) {
      for (let c = 0; c < COLS; c++) {
        if (newGrid[r][c]) {
          leadCount++;
          activeLeads.push({r, c});
        }
      }
    }
    
    if (leadCount > 4) {
      const toTurnOff = activeLeads[Math.floor(Math.random() * activeLeads.length)];
      newGrid[toTurnOff.r][toTurnOff.c] = false;
    }

    const mutations = Math.floor(Math.random() * 3) + 3;
    for(let i=0; i<mutations; i++) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      
      if (r <= 2 && !newGrid[r][c]) {
        let currentLeadCount = 0;
        for (let ir = 0; ir <= 2; ir++) currentLeadCount += newGrid[ir].filter(Boolean).length;
        if (currentLeadCount >= 4) continue; 
      }
      
      newGrid[r][c] = !newGrid[r][c];
    }
    return newGrid;
  };

  const scheduler = useCallback(() => {
    if (!isPlayingRef.current || !synth.ctx) return;

    const scheduleAheadTime = 0.1; 

    while (nextNoteTimeRef.current < synth.ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      
      const nextStep = (currentStepRef.current + 1) % COLS;
      
      // Sequence wrap logic (every 16 steps)
      if (nextStep === 0) {
        sequenceCounterRef.current += 1;

        // Note Evolution
        if (isEvolvingNotesRef.current) {
          const newGrid = mutateGrid(gridRef.current);
          gridRef.current = newGrid; 
          setGrid(newGrid);          
        }

        // Theme / Instrument Evolution
        if (isEvolvingThemeRef.current) {
          // Smooth BPM Glide
          const targetBpm = THEMES[targetThemeIdRef.current].defaultBpm;
          if (bpmRef.current < targetBpm) setBpm(b => b + 1);
          if (bpmRef.current > targetBpm) setBpm(b => b - 1);

          // Morph 1 track per sequence
          const currentMixed = [...mixedTracksRef.current];
          const targetTracks = THEMES[targetThemeIdRef.current].tracks;
          const diffIndices = [];
          
          for(let i = 0; i < ROWS; i++) {
            if (currentMixed[i].patch !== targetTracks[i].patch || currentMixed[i].freq !== targetTracks[i].freq) {
              diffIndices.push(i);
            }
          }

          if (diffIndices.length > 0) {
            // Pick a random un-morphed track and swap it
            const swapIdx = diffIndices[Math.floor(Math.random() * diffIndices.length)];
            currentMixed[swapIdx] = targetTracks[swapIdx];
            setMixedTracks(currentMixed);
            mixedTracksRef.current = currentMixed;
          }

          if (diffIndices.length <= 1) {
            // Morph complete! Officially swap themes to apply UI colors & swap target
            const newPrimary = targetThemeIdRef.current;
            const newTarget = newPrimary === 'AETHERIAL' ? 'SYNTHWAVE' : 'AETHERIAL';
            setThemeId(newPrimary);
            setTargetThemeId(newTarget);
            targetThemeIdRef.current = newTarget;
          }
        }
      }

      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += 0.25 * secondsPerBeat; 
      currentStepRef.current = nextStep;
    }

    schedulerTimerRef.current = setTimeout(scheduler, 25.0); 
  }, [scheduleNote]);

  useEffect(() => {
    if (isPlaying) {
      if (!audioReady) {
        synth.init();
        setAudioReady(true);
      }
      if (synth.ctx.state === 'suspended') synth.ctx.resume();
      if (showDrone) synth.startDrone();

      if (currentStepRef.current === 0) {
        nextNoteTimeRef.current = synth.ctx.currentTime + 0.05;
      }
      
      scheduler();
    } else {
      clearTimeout(schedulerTimerRef.current);
      synth.stopDrone();
    }

    return () => clearTimeout(schedulerTimerRef.current);
  }, [isPlaying, scheduler, audioReady, showDrone]);

  const toggleCell = (row, col) => {
    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
  };

  const loadNextPreset = () => {
    const nextIdx = (presetIdx + 1) % currentTheme.presets.length;
    setPresetIdx(nextIdx);
    setGrid(currentTheme.presets[nextIdx]);
  };

  const clearGrid = () => {
    setGrid(Array(ROWS).fill().map(() => Array(COLS).fill(false)));
  };

  const manualToggleTheme = () => {
    setIsEvolvingTheme(false); // Stop auto evolve if manually triggered
    const nextThemeId = themeId === 'AETHERIAL' ? 'SYNTHWAVE' : 'AETHERIAL';
    const nextTheme = THEMES[nextThemeId];
    setThemeId(nextThemeId);
    setTargetThemeId(nextThemeId === 'AETHERIAL' ? 'SYNTHWAVE' : 'AETHERIAL');
    setMixedTracks(nextTheme.tracks);
    setBpm(nextTheme.defaultBpm);
    setPresetIdx(0);
    setGrid(nextTheme.presets[0]);
  };

  const isFuchsia = currentTheme.colorMode === 'fuchsia';
  const textPrimary = isFuchsia ? 'text-fuchsia-400' : 'text-cyan-400';
  const borderPrimary = isFuchsia ? 'border-fuchsia-500' : 'border-cyan-500';
  const hoverBgPrimary = isFuchsia ? 'hover:bg-fuchsia-900/30' : 'hover:bg-cyan-900/30';
  const accentLight = isFuchsia ? 'bg-fuchsia-900/20 shadow-[0_0_8px_rgba(217,70,239,0.4)] border-fuchsia-500 text-fuchsia-400' : 'bg-cyan-900/20 border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]';

  return (
    <div className="min-h-screen bg-[#050505] text-[#d3d3d3] font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-gray-800">
      <div className="w-full max-w-5xl border border-[#333] bg-[#0a0a0a] rounded-sm shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="border-b border-[#333] p-3 flex justify-between items-center bg-[#000] transition-colors duration-1000">
          <div>
            <h1 className={`${textPrimary} font-bold tracking-widest text-sm md:text-base transition-colors duration-1000`}>
              {currentTheme.title}
            </h1>
            <p className="text-xs text-[#666] tracking-widest mt-1 transition-colors duration-1000">
              {currentTheme.subtitle}
            </p>
          </div>
          <div className="text-orange-500 text-xs text-right hidden sm:block">
            STATUS: {isPlaying ? 'ACTIVE_TRANSMISSION' : 'STANDBY'} <br/>
            SEQ_MORPH: {isEvolvingNotes ? 'DYNAMIC' : 'STATIC'} | SOUND_MORPH: {isEvolvingTheme ? 'ACTIVE' : 'STATIC'}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          <div className="flex flex-wrap items-end justify-between mb-8 gap-4">
            <div className="flex gap-4 items-end flex-wrap">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-6 py-2 font-bold border transition-colors ${
                  isPlaying 
                    ? 'border-orange-500 text-orange-500 bg-orange-950/30 shadow-[0_0_12px_rgba(249,115,22,0.4)]' 
                    : `${borderPrimary} ${textPrimary} ${hoverBgPrimary}`
                }`}
              >
                {isPlaying ? '[ STOP ]' : '[ INITIALIZE SEQUENCE ]'}
              </button>

              <div className="flex flex-col border border-[#333] px-3 py-1 bg-[#050505]">
                <label className="text-[10px] text-[#666] uppercase mb-1">Tempo (BPM)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="range" 
                    min="40" 
                    max="200" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))}
                    className={`w-24 cursor-pointer transition-colors duration-1000 ${isFuchsia ? 'accent-fuchsia-500' : 'accent-cyan-500'}`}
                  />
                  <span className={`${textPrimary} text-sm w-8 transition-colors duration-1000`}>{bpm}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 text-xs flex-wrap justify-end">
              <button 
                onClick={manualToggleTheme}
                className="px-3 py-1 border border-[#444] text-[#888] hover:text-white hover:border-white transition-colors"
              >
                THEME: {currentTheme.id}
              </button>
              <button 
                onClick={() => setIsEvolvingTheme(!isEvolvingTheme)}
                className={`px-3 py-1 border transition-colors ${isEvolvingTheme ? accentLight : 'border-[#444] text-[#888] hover:border-[#666]'}`}
              >
                MORPH_THEME: {isEvolvingTheme ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => setIsEvolvingNotes(!isEvolvingNotes)}
                className={`px-3 py-1 border transition-colors ${isEvolvingNotes ? accentLight : 'border-[#444] text-[#888] hover:border-[#666]'}`}
              >
                AUTO_EVOLVE_SEQ: {isEvolvingNotes ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => setShowDrone(!showDrone)}
                className={`px-3 py-1 border transition-colors ${showDrone ? accentLight : 'border-[#444] text-[#888] hover:border-[#666]'}`}
              >
                DRONE: {showDrone ? 'ON' : 'OFF'}
              </button>
              <button onClick={loadNextPreset} className={`px-3 py-1 border border-[#444] text-[#888] hover:${textPrimary} transition-colors`}>
                LOAD_PRESET {presetIdx + 1}/{currentTheme.presets.length}
              </button>
              <button onClick={clearGrid} className="px-3 py-1 border border-[#444] text-[#888] hover:text-red-400 hover:border-red-400 transition-colors">
                PURGE
              </button>
            </div>
          </div>

          {/* Sequencer Grid */}
          <div className="flex">
            {/* Y-Axis Labels (Tracks) */}
            <div className="flex flex-col justify-between pr-4 py-1 w-28 shrink-0">
              {mixedTracks.map((track, i) => (
                <div key={`track-label-${i}`} className="h-8 flex flex-col justify-center text-right border-r border-[#333] pr-3 mr-1">
                  <span className="text-[#aaa] font-bold text-xs leading-none mb-1">{track.note}</span>
                  <span className="text-[9px] text-[#555] leading-none uppercase">{track.patch.replace('_', ' ')}</span>
                </div>
              ))}
            </div>

            {/* The Grid */}
            <div className="flex-1 border border-[#222] bg-[#020202] p-1 relative overflow-x-auto min-w-[600px]">
              <div 
                className="absolute top-0 bottom-0 w-[calc((100%-0.5rem)/16)] bg-white/5 border-x border-white/10 transition-transform duration-75 pointer-events-none z-10"
                style={{ transform: `translateX(calc(${currentStep} * 100% + ${currentStep * 0.25}rem))` }}
              />

              <div className="flex flex-col gap-1">
                {grid.map((row, rowIndex) => (
                  <div key={`grid-row-${rowIndex}`} className="flex gap-1 h-8">
                    {row.map((isActive, colIndex) => {
                      const track = mixedTracks[rowIndex];
                      const isCurrentStep = colIndex === currentStep && isPlaying;
                      return (
                        <div 
                          key={`cell-${rowIndex}-${colIndex}`}
                          onClick={() => toggleCell(rowIndex, colIndex)}
                          className={`
                            flex-1 cursor-pointer transition-all duration-100 rounded-sm
                            ${isActive ? `${track.color} ${track.shadow}` : 'bg-[#111] hover:bg-[#222]'}
                            ${isCurrentStep && isActive ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,1)] scale-105' : ''}
                            ${isCurrentStep && !isActive ? 'bg-[#1a2b3c]' : ''}
                          `}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex ml-28 mt-2 min-w-[600px]">
            {Array.from({length: 16}).map((_, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-[#444]">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Terminal Output */}
          <div className="mt-12 p-3 border border-[#222] bg-[#050505] rounded font-mono text-[10px] text-[#444] h-24 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none"></div>
            <p>LOGGING AUDIO EVENTS...</p>
            <p className={`${textPrimary} transition-colors duration-1000`}>SYS_THEME: {currentTheme.id} {isEvolvingTheme ? `(MORPHING TO ${targetThemeId})` : ''} | PRESET_ID: {presetIdx + 1} | {ROWS} CHANNELS ACTIVE</p>
            {isPlaying && <p className="text-orange-800 animate-pulse mt-2">{"> SYNCING CLOCK TO " + bpm + " BPM..."}</p>}
            {isPlaying && isEvolvingNotes && <p className={`${isFuchsia ? 'text-pink-800' : 'text-teal-800'} animate-pulse`}>{"> AUTO_EVOLVE_PROTOCOL: ACTIVE. MUTATING SEQUENCE GENTLY..."}</p>}
            {isPlaying && isEvolvingTheme && <p className="text-yellow-600 animate-pulse">{"> THEME_MORPH: ACTIVE. HOT-SWAPPING INSTRUMENTS OVER TIME..."}</p>}
          </div>

        </div>
      </div>
    </div>
  );
}