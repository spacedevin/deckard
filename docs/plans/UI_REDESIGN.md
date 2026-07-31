# UI/UX Redesign Plan — Decks, Sequencer, and the Cue/Save model

Status: **proposal** · Owner: design · References live in [`docs/inspiritaion/`](../inspiritaion/)
(`deck.tsx`, `sequence.tsx`, and `current-*.png` screenshots).

This plan reworks three things that are currently wonky: the **mixer/deck**, the **sequencer**, and
the **sequence / cue / save-edit** product flow. The references give us a north star, and — more
importantly — they reveal a single metaphor that makes the whole thing cohere: **two decks.**

---

## 1. What's wrong today (grounded in the screenshots)

From [`current-main.png`](../inspiritaion/current-main.png) and [`current-session.png`](../inspiritaion/current-session.png):

1. **Two disjoint pattern editors.** The channel rack shows a per-channel 16-step *button row*
   ([`ChannelRack.tish`](../../src/ui/ChannelRack.tish) `StepRow`), and below it a *separate* piano-roll
   canvas ([`PianoRoll.tish`](../../src/ui/PianoRoll.tish)) for the selected channel only. Drum tracks
   live in one editor, melodic tracks in another; they don't read as one instrument.
2. **A cramped 3-tier mixer.** [`Mixer.tish`](../../src/ui/Mixer.tish) stacks master → actor → per-track
   strips in a narrow right-hand column. It's hard to read and nothing like a real desk.
3. **Three overlapping "arrangement" systems.** The transport has **SEQ 1–4** + **Save edit →**
   ([`Transport.tish`](../../src/ui/Transport.tish)), the **Session** tab has the full scene/clip grid
   ([`SessionView.tish`](../../src/ui/SessionView.tish)), and channels carry a **LIVE/CUE** deck flag
   ([`DeckRouting.tish`](../../src/model/DeckRouting.tish)). They solve adjacent problems in
   incompatible ways, so none of them is obvious.
4. **"Deck" doesn't mean what a DJ expects.** Today a "deck" is a per-channel routing flag, not a thing
   you load a song into and mix between.

---

## 2. The unifying idea: **two decks**

The deck reference ([`deck.tsx`](../inspiritaion/deck.tsx)) is a classic DJ surface: **Deck A** and
**Deck B**, each loads a *song*, each exposes **5 stem faders** (KICK / PERC / BASS / CHORD / ARP·FX)
with little waveforms, a center mixer with per-deck **HI / MID / LO / FILTER**, a **crossfader**, a
master spectrum, master BPM, and an **AUTO_DJ** that automates the blend.

This is a perfect fit for Deckard's actual thesis ("decode a streamed song into live stems and DJ from
there"), and it collapses our three overlapping systems into one:

| Today (confusing) | Deck model (clear) |
|---|---|
| Actor lanes `local` / `agent-*` | **Deck A** and **Deck B** are the two lanes you mix. A human drives one; an agent (or you) drives the other. |
| Per-channel `deck: live\|local` flag + `transportMainDeck` | A channel **belongs to a deck**; the **crossfader** decides what's heard. |
| **LIVE / CUE** per channel | **CUE = the deck you're prepping** (audible to you, not yet crossfaded in); **LIVE = the deck in the mix.** This is the *real* DJ meaning. |
| **SEQ 1–4** + **Save edit →** + Session scene grid | Each deck has a **pattern bank** (the old "scenes"). Save-edit captures the current grid into the deck's active slot; launching a slot loads it into the deck (queued to the next bar). |

**Recommended product model:** Deck A and Deck B are first-class. Each holds a set of channels grouped
into the 5 canonical **stem buses**, a pattern bank, and a per-deck EQ/filter strip. The crossfader
blends the two deck buses into master. This keeps everything we already built (actor buses, EQ,
scheduling, session clips) and just re-frames it.

See [§7 Open decisions](#7-open-decisions) for the one real fork (decks = actor lanes vs. decks =
orthogonal pattern slots).

---

## 3. Workstream A — Traditional mixing deck

Target: the [`deck.tsx`](../inspiritaion/deck.tsx) layout, rebuilt in Lattish/tish.

### Layout
```
┌ header: AETHER_EDGE // STEM_DECK · MASTER CLOCK (BPM) · AUTO_DJ · HALT/INIT ┐
├ MASTER_OUT spectrum strip (master analyser, FFT 1024, comp/reverb status) ──┤
├ [ DECK A ]            │   CH A EQ │ ·· │ CH B EQ   │            [ DECK B ]   ┤
│  song selector        │  HI MID   │MIX │  HI MID   │  song selector          │
│  STATUS / GENRE        │  LO  FLT  │ ER │  LO  FLT  │  STATUS / GENRE         │
│  KICK PERC BASS CHORD ARP·FX  (per-stem: waveform + vertical fader + %)      │
│                       │      X-FADE  A ───●─── B   │                         │
└ footer: > SYSTEM READY · AUTO_DJ phase/CF pos · DEV_NODE ────────────────────┘
```

### Components (new `src/ui/deck/`)
- **`DeckPanel.tish`** — header (deck id, song/pattern selector, SYNCED/genre) + a row of 5
  `StemFader`s. Mirrors `deck.tsx`'s `Deck`.
- **`StemFader.tish`** — stem label, a small **waveform thumbnail** (per-stem analyser), a vertical
  fader, a `%` readout. Mirrors `StemFader`.
- **`DeckEqStrip.tish`** — `HI/MID/LO` shelving + a bipolar **`FLT`** (−1 LPF … 0 OFF … +1 HPF).
  Mirrors `EQSlider`; reuses our existing per-bus EQ.
- **`Crossfader.tish`** — A◄►B, 0..1.
- **`MasterScope.tish`** — reuse [`Scope.tish`](../../src/ui/Scope.tish); add a **spectrum** mode
  (bar FFT) for the master strip; per-stem thumbnails use the **waveform** mode.

### Model / audio changes
- **Stem grouping.** Add `channel.stem ∈ {kick, perc, bass, chord, arpfx}` (default inferred from
  generator/role). TPL: a `stem <name>` track-body line (round-tripped in
  [`Apply.tish`](../../src/deckfile/Apply.tish)/[`Emit.tish`](../../src/deckfile/Emit.tish)). Stem faders sum the
  gains of all channels tagged with that stem on that deck.
- **Deck buses.** [`Engine.tish`](../../src/audio/Engine.tish) already builds `channel → actor bus →
  master`. Rename/extend the two relevant buses to **deck buses A/B** (EQ + filter + trim already
  exist on the actor bus — reuse them as the deck EQ/filter). Insert a **crossfader gain pair** between
  the deck buses and `masterSum`: `gainA = equalPower(1−x)`, `gainB = equalPower(x)`.
- **Per-deck filter.** The per-channel lowpass exists; add a **per-deck** bipolar filter node on each
  deck bus (HPF for x>0, LPF for x<0) — this is what `FLT` and Auto-DJ sweep.
- **Master strip.** `masterMixer` already exists; surface `FFT_SIZE / COMPRESSOR / REVERB_BUS` status
  (add a master compressor + reverb send if we want the labels to be truthful — small, optional).

### Auto-DJ
Port `deck.tsx`'s routine (bass-swap → highpass sweep → crossfade → restore) as a tish module
`src/codj/AutoDj.tish`, driven off the transport tick. It writes the crossfader + deck EQ over a few
bars. **This is also the natural home for an agent to "DJ" a deck** — the same routine an agent could
emit as deck automation.

---

## 4. Workstream B — A real sequencer grid

Target: the [`sequence.tsx`](../inspiritaion/sequence.tsx) grid — replace the disjoint step-rows +
piano-roll with **one** beautiful editor.

### Layout
- **Rows = pitch lanes, grouped by instrument.** Left gutter shows the note name (`C5`, `G4`, …) and
  the instrument/patch label (`STELLAR BELLS`, `DARK PULSE`). 16 step **columns**.
- **Cells**: dim when off; when on, filled with the **instrument's color + glow** (per the
  `track.color`/`shadow` map). A translating **playhead overlay** column; the active cell at the
  playhead flashes white and scales (`sequence.tsx` lines 666–694).
- **Terminal log** strip beneath (we already have a Co-DJ log + can stream deck events here).

### Mapping to Deckard's model (the important part)
Deckard channels are either **step/drum** (one `stepPitch`, `steps[16]`) or **melodic**
(`pianoNotes` with beat+pitch). The grid unifies both as **(lane, step) → on**:
- A **drum channel** contributes **one row** at its `stepPitch`; a cell toggles `steps[i]`.
- A **melodic channel** contributes **one row per pitch it uses** (or a windowed pitch range when
  focused); a cell toggles a `pianoNote` at `startBeat = i*0.25`, `durBeats = snap`. This is exactly the
  16-step quantum the piano roll already snaps to.
- Color per row = the channel's deck/instrument color; the gutter groups rows by channel.

This lets us **retire the separate canvas piano roll for the common case** (16-step melodic editing) and
keep a "fine" piano-roll mode only when sub-step resolution is needed. The step grid and the piano roll
stop being two products.

### Components (new `src/ui/grid/`)
- **`StepGrid.tish`** — the lane×step grid (DOM, not canvas — cheap at 8–16 lanes × 16 steps, and gives
  us CSS glow/transition for free like the reference). Reuses `toggleStep` / `addPianoNote` /
  `removePianoNoteAt` from [`Edits.tish`](../../src/model/Edits.tish) (now the mutation chokepoint).
- **`PlayheadOverlay.tish`** — absolute column translated by `currentStep` (drive off
  `rt.playbackUiStep`).
- **`LaneGutter.tish`** — note + instrument labels, per-channel color.
- Velocity/probability: optional later (cell opacity = velocity).

### Scope
- **Focused deck**: the grid shows the channels of the deck you're editing (CUE deck), so editing and
  cueing are the same surface.
- Keep the existing canvas piano roll behind a "fine edit" toggle for off-grid notes.

---

## 5. Workstream C — Sequence / cue / save, rethought

Collapse SEQ-buttons + Save-edit + Session-grid + LIVE/CUE into the **deck + pattern-bank** model:

- **Pattern bank per deck.** The old "scenes" become each deck's slots (reuse `session.slots` /
  `sessionClips` in [`Session.tish`](../../src/model/Session.tish) — the data already round-trips through
  deck `clip` / `session_slot` blocks). UI: a small row of slot buttons on each deck.
- **Save = capture.** "Save edit" becomes **CAPTURE → slot N** on the focused deck: snapshot the current
  grid into that deck's slot (`sessionWriteRackToSceneClip`, already implemented).
- **Launch = load to deck, queued.** Clicking a slot **loads that pattern into the deck**, queued to the
  next bar (`sessionQueueScene` + `sessionCommitQueued`, already implemented and bar-aligned).
- **CUE vs LIVE = crossfade position.** The deck on the quiet side of the crossfader is **CUE** (you
  prep/edit it); push the crossfader to bring it **LIVE**. (Optional, true-DJ: a separate cue monitor
  output — deferred.)
- **Result:** one mental model. *Edit the cue deck's grid → CAPTURE to a slot → crossfade it in.* The
  standalone Session tab can become an optional "bank overview," and the transport's SEQ/Save-edit row
  and per-channel LIVE/CUE chips are removed.

---

## 6. Cross-cutting: visual system & build

- **Look:** keep the mono/terminal aesthetic both references share — `#020202`/`#0a0a0a` panels,
  `#333` borders, per-instrument neon with glow (`shadow-[0_0_8px_…]`), cyan for Deck A, fuchsia/magenta
  for Deck B, orange for master/clock, green for SYNCED. Most of this is additive CSS in
  [`styles.css`](../../styles.css).
- **Lattish/tish:** the references are React + Tailwind; we port the **structure**, not the deps —
  plain `h()`/JSX + CSS classes. DOM cells (not canvas) for the grid so we get CSS transitions/glow.
- **Reuse, don't rewrite the engine.** Audio routing, scheduling, deck apply/emit, session clips, and
  per-bus EQ already exist — this is largely a **view + thin model** change (stem tag, deck buses,
  crossfader). Keep `npm test` green; the grid/deck math should get smoke coverage.

---

## 7. Open decisions

1. **What backs a "deck"?**
   - **(a) Decks = actor lanes** — Deck A = `local` (you), Deck B = an agent lane. Most aligned with
     co-DJ ("mix yourself against the AI"); but a lane has arbitrary channels, so the 5-stem layout is a
     *grouping*, not a fixed structure. **(recommended)**
   - **(b) Decks = orthogonal pattern slots** — two song slots you load/crossfade, agents optional.
     Closest to a literal DJ deck; needs a new "deck" dimension separate from lanes.
   - This choice decides whether `channel.deck` becomes `A|B` mapped onto lanes, or a new field.
2. **Stems: fixed 5 or flexible?** The reference fixes KICK/PERC/BASS/CHORD/ARP·FX. Do we hard-code 5
   stem buses, or allow N named stems per deck? (Recommend: fixed 5 buses for the mixer, but a channel
   can be unassigned → routes to a default stem.)
3. **Melodic in the grid:** windowed pitch range per focused channel, or a fixed scale/row set like the
   reference's curated 8 pitches? (Recommend: windowed range + optional scale snap.)
4. **Auto-DJ ownership:** local routine vs. an agent that emits crossfade/EQ automation as deck.
   (Recommend: ship the local routine first; let an agent drive it later via the same automation lanes.)

---

## 8. Phased roadmap (each phase ships, app stays working)

1. **P1 — Mixer reskin (no model change).** Rebuild the right-hand mixer as the horizontal Deck
   A | center-EQ | Deck B desk with the master spectrum strip, driven by the *existing* actor lanes +
   master. Pure view work. Biggest visual win for least risk.
2. **P2 — Stem grouping + crossfader.** Add `channel.stem`, stem-summed faders, deck buses + equal-power
   crossfader in the audio engine, per-deck filter. Wire CUE/LIVE to crossfader position.
3. **P3 — Sequencer grid.** Ship `StepGrid` (DOM, glow, playhead) for drum + 16-step melodic; fold the
   step-rows into it; keep the canvas piano roll behind a "fine edit" toggle.
4. **P4 — Cue/Save unification.** Move pattern banks onto the decks (CAPTURE / launch-to-deck);
   remove the SEQ/Save-edit transport row and per-channel LIVE/CUE chips; demote the Session tab.
5. **P5 — Auto-DJ + agent DJ.** Port the auto-mix routine; expose it to an agent lane via automation.

---

## 9. File map (what changes)

| Area | New | Reuse / change | Retire |
|------|-----|----------------|--------|
| Deck mixer | `src/ui/deck/{DeckPanel,StemFader,DeckEqStrip,Crossfader,MasterScope}.tish` | `Mixer.tish` (logic), `Engine.tish` (deck buses + xfade), `MixerRouting.tish` | 3-tier `Mixer.tish` layout |
| Sequencer | `src/ui/grid/{StepGrid,PlayheadOverlay,LaneGutter}.tish` | `Edits.tish` mutators, `PianoRoll.tish` (fine-edit only), `LoopState.tish` | `ChannelRack.tish` `StepRow` |
| Cue/Save | deck pattern-bank UI | `Session.tish` (clips/slots/queue — unchanged data) | `Transport.tish` SEQ/Save row, `DeckRouting.tish` per-channel flag |
| Model/TPL | — | `Project.tish` (+`stem`), `Apply/Emit` (`stem` line, deck=A\|B) | `transportMainDeck` binary → crossfader |
| Audio | per-deck filter + xfade gains | `Engine.tish`, `MixerAutomation.tish` | — |

> The engine, scheduler, deck pipeline, and session model are kept. This is mostly a **view + thin-model**
> redesign — the streamed-stems / co-DJ core is already the right shape for a two-deck DJ surface.
