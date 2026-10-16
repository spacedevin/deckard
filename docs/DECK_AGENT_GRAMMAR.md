# deck grammar (co-DJ agent reference)

The lines a **co-DJ lane** may emit. A **client** lane adds **new tracks + patterns on its own lane only**
(ids prefixed with its `actorId`, e.g. `ai-a_hat`) and reads everyone else's lines as context. A **host** lane
in the browser that owns the session is the master: it holds `master_mixer` and may also emit the master-scope
lines below. This is the agent subset
of the full language — for the complete grammar (master-scope headers, clips, `gen_block` graphs, automation,
control directives) see **[`@spacedevin/deck` grammar](../node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md)** (canonical).
Deckard UI / ownership notes: **[DECK_GRAMMAR.md](DECK_GRAMMAR.md)**. This file is injected verbatim into the
co-DJ agent prompt (via `scripts/gen-codj-api.mjs` → `src/agentkit/PromptAssets.tish`); keep it in lockstep with
the master-scope denylist in [`src/codj/Skills.tish`](../src/codj/Skills.tish).

## Track block

```
track <DisplayName> id <lane_unique_id> gen <generator> [* <bars>]
  mix gain <0..1> pan <-1..1> [eq_lo <dB>] [eq_mid <dB>] [eq_hi <dB>] [mute 1] [solo 1]
  fx [cutoff <hz>] [res <0..1>] [drive <0..1>] [reverb_send <0..1>] [lfo_rate <hz>] [lfo_depth <0..1>] [filter_type <lowpass|highpass|bandpass|notch>]
  voice [octave <-2..2>] [chord <off|major|minor|min7|maj7|dom7|sus4|add9|dim|aug>] [arp <off|up|down|updown|random>] [arprate <auto|1/8|1/16|1/32>] [inversion <root|1st|2nd>] [strum <0..150>]
  …generator param lines (see below)…
  adsr a <s> d <s> s <0..1> r <s>          (generators with an envelope)
  step_pitch <midi>                         (base pitch for step hits; default 36; `bar <selector>` for per-bar)
  steps <16 x/. tokens>  |  steps euclid <hits> 16
  step_vel <16 ints 1-127>                  (per-step velocity lock — optional, emit only deviations)
  step_prob <16 floats 0-1>                 (per-step probability — seeded, deterministic across peers)
  step_ratchet <16 ints 1-8>                (per-step sub-hits)
  step_nudge <16 floats -0.5..0.5>          (per-step micro-timing, fraction of a step)
  note <midi> <startBeat> <durBeats> v <vel 0-127> [p <prob>] [r <ratchet>] [n <nudge>] [bar <sel>]   (repeat; melodic)
  loops <N|inf>                             (finite repetition cap for this channel)
```

Beats are **quarter-notes**: step `i` (0–15) = beat `i*0.25` in the looping bar. `* <bars>` on the header makes a
multi-bar pattern; `bar <selector>` (`even`/`odd`/`<n>`/`2n+1`/`0,2`) on `note`/`step_pitch` varies it per bar.

## Generators (`gen <id>`)

**Fixed generators** (33) — pick by role; don't default everything to `noise_burst`/`fm`:

| role | ids |
|------|-----|
| perc/hat | `drumSynth` (`drum`) · `clap` · `cymbal` · `noise_burst` |
| lead/synth | `basic_osc` (`osc`) · `fm` · `aether` · `syncLead` · `obSync` · `laserSync` |
| keys/mallet | `tine` · `halo` · `bell` |
| pad/texture | `pad` · `noise_burst` |
| strings | `guitar` · `arco` |
| chip | `chiptune` · `nes2a03` · `gameBoyDmg` · `c64sid` · `ym2612` · `sn76489` · `spc700` · `gbaDirectSound` |
| vocal | `formantVocal` · `ttsVocal` · `meSpeakVocal` · `syncChoir` |
| modular (advanced) | `matrixFm` · `patch` (use `gen_block … end gen_block`; prefer named generators) |

**Macro voices** (expand to a tuned patch; use the macro name directly as `gen <id>`):

| role | ids |
|------|-----|
| kick | `kick_edm` · `kick_deep` · `kick_distorted` |
| bass | `bass_reese_punch` · `bass_reese_sc` · `bass_wobble`  (plus the bass **generators** `acid303` · `sub808` · `reeseBass`) |

Generators vs. macros never share a label (see project memory *macro-generator-boundary-policy*). Only
`noise_burst`/`fm`/`basic_osc`/`matrix_fm`/`drum_synth`/`patch` have short aliases — every other id is used verbatim.

### Generator param lines

| `gen` | indented param line(s) |
|-------|------------------------|
| `noise_burst` | `noise attack <s> decay <s> tone <0..1> pitch_follow <0..1>` |
| `fm` | `fm ratio <n> mod_index <n> carrier <sine\|square> mod <sine\|square>` (+ `adsr`) |
| `basic_osc` | `osc waveform <sine\|square\|saw\|triangle>` (+ `adsr`) |
| every other named generator | `gen <param> <value> …` — 0–1 designer knobs (e.g. `gen tone 0.5 swell 0.45`) |
| `matrix_fm` / `patch` | `gen_block <patch\|matrix_fm> … end gen_block` graph — see [DECK_EXTENSION.md](DECK_EXTENSION.md) / package [extension](../node_modules/@spacedevin/deck/docs/DECK_EXTENSION.md) |

## Master-scope (the master browser)

These change the **whole session for every player**. The DAW tab that hosts the session is the master. An
**AI host added in that browser** (`Add AI host`, role `host`) holds `master_mixer` and may emit them. A
**client** lane does not, so the gate skips them (per [`Skills.tish`](../src/codj/Skills.tish)):

```
bpm   tpl   auto   transpose   scale   swing   master_mix   actor_mix
xfade <x 0..1> <y 0..1>          deck_mix <A|B|C|D> hi <dB> mid <dB> lo <dB> flt <-1..0> vol <0..1>
session_scenes   session_slot   clip
launch_quant   song_seed   main_deck   song   follow
@ launch scene <n>               @ launch clip <trackId> <clipId>
@ transport play <seq|song>     @ transport stop
@ fx <echo|filter> <on|off> [time <s>] [fb <0..0.9>] [freq <hz>]
```

`xfade` is the 4-way fader (x = deck A↔B, y = top↔bottom). `deck_mix` is that deck's booth EQ, lowpass (`flt`)
and volume. `@ fx` is a master throw, not a track send. Prefer the script helpers: `codj.crossfade`, `codj.booth`,
`codj.throwFx`, `codj.clips`, `codj.scene`, `codj.clip`, `codj.play`, `codj.stop`, `codj.launch`. Compose in Session
mode: `codj.clips(track, [...])` writes a track's short numbered clips (`clip c1 …`, `clip c2 …`, 1–4 bars, shown as
#1, #2 in the grid), and `codj.scene(n, { kick: 1, hat: 2 }, name)` writes a whole session column from those numbers
(a `session_slot` per track, or a `clip` block when a part is given inline); every owned track it leaves out gets
a hitless `rest` clip in that slot (an empty slot falls back to the track's main pattern), so it is silent there.

Per-deck launches (host): `@ launch scene <n> deck <X>` moves only deck X's tracks to scene n and pins the deck
there — a launch on the shared session (`@ launch scene <n>`) and the song's follow actions leave a pinned deck
alone. `@ launch deck <X> stop` silences the deck; `@ launch deck <X> song` releases it back to the shared session.
`@ launch clip <trackId> -` returns a track on a pinned deck to that deck's scene. A track line `deck <X> slot <n>`
places a track on a deck; for a guest's track it holds only on a deck no player owns (`codj.session().free`).
Script helpers: `codj.launch(n, deck)`, `codj.deckCtl(deck, 'stop' | 'song')`, `codj.launchClip`, `codj.stopClip`,
`codj.follow`, `codj.quantize`, `codj.song`, and `{ deck }` on `arrange` / `scene` / `clear`.

`remove_track <id>` removes a track **you own** — `codj.arrange` uses it to replace your previous arrangement
instead of stacking a new copy on every reload. The master (the host browser, and an AI host there) may remove
any track. A client lane may not remove a track it does not own. The page loads a starter loop — Kick `c0`,
Snare `c1`, HiHat `c2`, Bass `c3`. While those are the only tracks, `codj.placeholder()` is true and a host
calls `codj.clear()` before its own sequence so the demo is gone. `codj.clear()` is the clean slate: a host
removes every track, a client only its own.

A client lane cannot re-key (`scale`) or re-shuffle (`swing`) the mix. A host lane can, and it can launch scenes
and throw master FX. Cue and preview stay on the sender's machine.

## Streaming

You may stream `deck.line` incrementally — each line decodes progressively (a track sounds the moment its
`track …` arrives; the pattern fills as `steps …`/`note …` stream). Lane-unique ids are required.

**Goal:** complement the project — add the parts that are missing (hats, perc, bass, chords, melody), match the
tempo, and leave space. Don't double what already plays.
