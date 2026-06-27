Aether Stem Deck: Audio System & Track Generation Guide1. System OverviewThe Aether Stem Deck is a procedural Web Audio API DJ mixer designed as the auditory counterpart to a 3D Solar System viewer. It does not use external audio files (no .mp3 or .wav samples). Instead, it synthesizes all audio in real-time using mathematical oscillators, noise buffers, and custom audio node routing.The system features two DJ decks (Deck A and Deck B), an automatic DJ mixing algorithm, and a master effects chain (Compressor + synthetic Reverb).2. Creative Inspiration & ThemeThe creative direction is "Retro-Futuristic Space."Vibe: Expansive, cosmic, data-dense, and occasionally aggressive (Cyberpunk, Sci-Fi).Genres: Ambient Space, Cyberpunk, Deep Techno, Trance, Downtempo, Psytrance, Halftime Dub, Synthwave, Liquid DnB, Midtempo Bass, and Lo-Fi House.Harmonic Constraint (Crucial): To ensure the Auto-DJ can seamlessly mix any track into any other track without harmonic clashing, all tracks are written in C Minor / Eb Major.Root notes, arpeggios, and chord progressions must strictly pull from this defined palette.Defined Harmonic Paletteconst CHORDS = {
  i:   [130.81, 155.56, 196.00], // C minor
  VI:  [103.83, 130.81, 155.56], // Ab major
  III: [155.56, 196.00, 233.08], // Eb major
  v:   [98.00, 116.54, 146.83],  // G minor
  VII: [116.54, 146.83, 174.61]  // Bb major
};
const ARPS = [261.63, 311.13, 392.00, 466.16, 523.25, 622.25]; // C minor pentatonic
3. The 5-Stem StructureEvery track must output audio into exactly 5 discrete channels (stems). This allows the DJ mixer to isolate elements.outs[0] - KICK: Low-end transients.outs[1] - PERC/HATS: Noise-based percussion, hi-hats, and snares.outs[2] - BASS: Sub-bass, reese basses, acid lines, and midtempo wobbles.outs[3] - CHORDS/PADS: Lush, sustained harmonic content.outs[4] - ARP/FX: Leads, plucks, FM metallic tones, and noise sweeps.4. Audio Engine API (Available Instruments)When writing a new track, the LLM must ONLY use the following synthesis methods provided by the AudioEngine (eng object).eng.playKick(time, outNode, type)Types: 'edm' (punchy, sine pitch-drop), 'deep' (triangle, soft), 'distorted' (waveshaper distortion).eng.playHat(time, outNode, type)Types: 'closed' (short, 8kHz HPF), 'open' (longer, 5kHz HPF).eng.playSnare(time, outNode)Synthetic 808-style snare (triangle body + noise snap).eng.playBass(time, outNode, frequency, duration, type, isSidechained)Types: 'reese' (detuned supersaw), 'acid' (high resonance sawtooth).isSidechained: true dips the volume at the start of the note to simulate ducking under a kick drum.eng.playChord(time, outNode, frequenciesArray, duration, type)Types: 'pad' (slow attack/release, lowpass sweep), 'stab' (fast square wave).eng.playPluck(time, outNode, frequency)Short, ping-pong delayed square pluck.eng.playFMPluck(time, outNode, frequency)Frequency Modulated metallic pluck (sub-octave modulator).eng.playWobbleBass(time, outNode, frequency, duration, lfoHz)Dubstep/Midtempo bass. lfoHz controls the speed of the filter wobble (e.g., 4 for quarter notes, 8 for eighths).eng.playNoiseSweep(time, outNode, duration, isUp)White noise transition effect. isUp = true sweeps frequency up (riser), false sweeps down (faller).5. Track Data Structure & Sequencer LogicTracks are defined as objects in the TRACKS array. The sequencer runs at a resolution of 16th notes. The step variable increments endlessly.Example Track Template{
  id: 'T16', 
  name: 'Galactic Drift', 
  genre: 'Space Ambient', 
  targetBpm: 100,
  play: (eng, time, step, outs) => {
    // 1. Calculate bar and progression
    const bar = Math.floor(step / 16);
    const prog = [CHORDS.i, CHORDS.VI, CHORDS.v];
    const currentChord = prog[Math.floor(bar / 4) % prog.length]; // Changes every 4 bars
    const root = currentChord[0] / 2; // Bass root an octave down

    // 2. Program Rhythms using Modulo arithmetic
    
    // KICK: Four-on-the-floor
    if (step % 4 === 0) eng.playKick(time, outs[0], 'deep');
    
    // HATS: Off-beats + occasional 16th note syncopation
    if (step % 4 === 2) eng.playHat(time, outs[1], 'open');
    if (step % 16 === 14) eng.playHat(time, outs[1], 'closed');
    
    // BASS: Sustained 1-bar reese bass
    if (step % 16 === 0) eng.playBass(time, outs[2], root, 1.0, 'reese', true);
    
    // CHORDS: Long 2-bar pad
    if (step % 32 === 0) eng.playChord(time, outs[3], currentChord, 2.0, 'pad');
    
    // ARP: Complex rhythmic pluck using random probability
    if (step % 3 === 0 && Math.random() > 0.4) {
      eng.playFMPluck(time, outs[4], ARPS[(step + bar) % ARPS.length]);
    }
  }
}
6. Prompting Instructions for the Next LLMCopy and paste the following to the next LLM to generate more tracks:"I am providing you with the specification for the 'Aether Stem Deck' audio engine. Your task is to generate 5 new procedural music tracks that fit within the TRACKS array.Rules:You must ONLY use the provided CHORDS and ARPS arrays to ensure everything stays in C Minor / Eb Major.You must ONLY use the methods available in the AudioEngine API defined above.Map your instruments perfectly to the 5 outs array indices (0: Kick, 1: Perc, 2: Bass, 3: Chords, 4: Arp/Lead).Use modulo arithmetic (step % X === Y) to sequence your beats in 16th note timing.Be highly creative with rhythms (syncopation, polyrhythms using step % 3), chord changes (using Math.floor(step / 16) to track bars), and instrument combinations.Output ONLY the JavaScript array of objects representing the new tracks."