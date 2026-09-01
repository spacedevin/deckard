# @spacedevin/deck-synths

The instrument catalog for the [`.deck`](https://github.com/spacedevin/deck) language — 33 voices
covering chip emulations, FM, drums, hard sync, bowed and plucked models, and vocals.

These are the voices [Deckard](https://deckard.lol) plays through. They live here so a second host —
a docs-site player, a renderer, a demo — can make the same sounds without a second copy of the code.

```bash
npm install @spacedevin/deck-synths
```

```js
import { dispatchPlayNote, ensureDeckGeneratorIds, ensureSyncWorklet } from '@spacedevin/deck-synths'

// Teach the language this catalog's generator ids, param aliases and gen_block dialects.
// Do this before parsing, or `gen sweep_amt` never reaches the voice as `sweepAmt`.
ensureDeckGeneratorIds()

await ensureSyncWorklet(ctx)      // only needed if a sync voice is used
dispatchPlayNote(ctx, bus, t, midi, vel, durSec, channel, bendSemis)
```

## The contract

A voice is a pure function that builds a short-lived Web Audio subgraph and connects its last node
to `bus.input`:

```
play<Name>(ctx, bus, t, midi, vel, durSec, ch, bendSemis)
```

`dispatchPlayNote` picks one by `ch.generatorId`; an unknown id falls back to `basicOsc`. Patch and
envelope come from `ch.generatorParams` — the ADSR lives there, not on the channel root.

## Assets

`ensureSyncWorklet` registers the hard-sync oscillator from an inlined Blob URL, so `syncLead`,
`syncChoir`, `obSync` and `laserSync` need nothing copied into your public directory.

`meSpeakVocal` is the exception: it needs a worker and voice data the host serves. The defaults are
`/mespeak-worker.js` and `/mespeak`; call `configureMeSpeak({ workerUrl, assetsBaseUrl })` if yours
differ. `ttsVocal` needs the Web Speech API.

## Known limits

- Two hosts that each bundle their own copy of `@spacedevin/deck` end up with two dialect
  registries, and a dialect registered against one is invisible to the other. Deduplicate the
  language package so there is a single instance.
