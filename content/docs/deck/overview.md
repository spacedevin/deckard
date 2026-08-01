---
title: deck overview
description: What a .deck file is, naming, and how it drives the DAW.
---

**deck** is Deckard's streamable patch language. Files use the `.deck` extension and start with:

```
deck 1
bpm 120
```

Legacy `tpl 1` is still accepted by the parser; emit always writes `deck 1`.

## Anatomy

```
deck 1
bpm 118
swing 0.12
scale C minor

track Kick id c0 gen noise_burst
  mix gain 0.85 pan 0
  step_pitch 36
  steps x . . . x . . . x . . . x . . .

track Bass id c1 gen bass_acid
  note 36 0 0.5 v 100
  note 39 1 0.5 v 90
```

- **Header** — `deck 1` then globals (`bpm`, `swing`, `scale`, `xfade`, `main_deck`, `deck_mix`, …)
- **Tracks** — `track <Name> id <id> gen <generator|macro> [* bars]`
- **Body** — indented `mix` / `fx` / `voice` / `gen` / `adsr` / `steps` / `note` / `deck A|B|C|D` / `gen_block` …

## Two meanings of `deck`

| Context | Syntax | Meaning |
|---------|--------|---------|
| Version header (top-level) | `deck 1` | Language version |
| Track body | `  deck A` / `B` / `C` / `D` | DJ player lane routing |

## Runtime path

Parser / apply / emit live in `src/deckfile/` (`Parser.tish`, `Apply.tish`, `Emit.tish`, `Stream.tish`). Incremental Co-DJ decode is skill-gated per line.

## Full references

- [deck grammar](/docs/deck/grammar/) — complete language
- [Agent grammar](/docs/deck/agent-grammar/) — co-DJ lane subset
- [Extensions](/docs/deck/extensions/) — `gen_block` patch / matrix
