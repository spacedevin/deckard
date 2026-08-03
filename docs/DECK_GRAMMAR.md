# Deckard × deck

**Canonical language reference** lives in **`@spacedevin/deck`**:

- Checkout / npm: [`node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md`](../node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md)
- Package export: `@spacedevin/deck/grammar`
- Upstream: [github.com/spacedevin/deck](https://github.com/spacedevin/deck)

Host integration (registries, dialects): package [`docs/HOST.md`](https://github.com/spacedevin/deck/blob/main/docs/HOST.md) · Deckard boot: [`src/generators/DeckIds.tish`](../src/generators/DeckIds.tish), [`src/generators/BuiltinMacros.tish`](../src/generators/BuiltinMacros.tish).

This document is the **Deckard overlay** — UI, co-DJ, ownership, clamps, and generator spellings — not a second grammar.

---

## UI: local song vs hub stream

There is a **single** deck editor (Apply / Sync, step highlight). **Stream vs local** is tied to **Co-DJ**:

| State | deck panel |
|-------|-----------|
| **Not connected** | Banner: *Local — not on hub.* Edit the song locally. |
| **Co-DJ connected** | Banner: **Hub** + **Local → hub** preview (what you send on Play) and **Remote** (agent `deck.stream_chunk` tail). |

**Append a line from JS** (e.g. LLM tooling): call `streamAppendLine` on the `DeckardRuntime` held in `App`’s `useRef` (`src/ui/DeckardRuntime.tish`). Example: `runtime.streamAppendLine("track kick id c0 gen noise_burst")`.

---

## Host modules (not in the package)

| Concern | Location |
|---------|----------|
| Parse / format / highlight classify | `@spacedevin/deck` |
| AST → project | [`src/deckfile/Apply.tish`](../src/deckfile/Apply.tish) |
| project → deck | [`src/deckfile/Emit.tish`](../src/deckfile/Emit.tish) |
| Incremental `deck.line` | [`src/deckfile/Stream.tish`](../src/deckfile/Stream.tish) |
| `patch` / `matrix_fm` graphs | [`PatchGraph.tish`](../src/deckfile/PatchGraph.tish), [`MatrixFmGraph.tish`](../src/deckfile/MatrixFmGraph.tish) |
| Id / dialect registration | [`DeckIds.tish`](../src/generators/DeckIds.tish) |
| Builtin macros | [`BuiltinMacros.tish`](../src/generators/BuiltinMacros.tish) |
| Ownership / skills | [`src/codj/`](../src/codj/) |
| HTML highlight | [`src/ui/SongEditorHighlight.tish`](../src/ui/SongEditorHighlight.tish) |

---

## Apply clamps (Deckard)

These are enforced when applying into a project, not by the language parser:

| Line | Deckard behaviour |
|------|-------------------|
| `bpm <n>` | Clamped **40–300** |
| `swing` | `0..1` |
| Scale | Snaps melodic triggers live; peers + offline renders agree ([`Scale.tish`](../src/model/Scale.tish)) |
| `@ perf_step <n>` | Stream / Co-DJ scheduling; JSON `effectivePerfStep` on `deck.block` overrides. Song parser treats as no-op |

---

## Generator id spellings (Deckard)

Registered in `ensureDeckGeneratorIds()`:

| deck / emit | host `generatorId` |
|-------------|-------------------|
| `noise_burst` | `noiseBurst` |
| `fm` / `fm_tone` | `fmTone` |
| `basic_osc` / `osc` | `basicOsc` |
| `matrix_fm` | `matrixFm` |
| `drum` / `drum_synth` | `drumSynth` |
| `patch` / `modular` / `synth` | `patch` |

Undeclared ids pass through. Other catalog ids use the host registry spelling. Macro names expand via `registerBuiltinMacros` ([`MacroVoice.tish`](../src/model/MacroVoice.tish)).

---

## Ownership & edit fragments

- **`remove_track <channelId>`** — incremental only (never in a full snapshot). **Ownership-gated** by `actorMayEditTrack` (lane removes own track; master removes any). UI × emits it; undo re-creates from captured deck.
- Master-scope lines (`bpm`, version header, `scale`, `swing`, `master_mix`, `actor_mix`, `auto`, `session_*`, `clip`, …) require `master_mixer` — see [DJ_SKILLS.md](DJ_SKILLS.md).
- Co-DJ lane subset: [DECK_AGENT_GRAMMAR.md](DECK_AGENT_GRAMMAR.md).

---

## Control directives in Co-DJ

Language `@ …` table: package grammar. Deckard wire + authority: [STREAM_PROTOCOL.md](STREAM_PROTOCOL.md), [WS_AND_AGENTS.md](WS_AND_AGENTS.md).

---

## Related

- [DECK_EXTENSION.md](DECK_EXTENSION.md) — Deckard `patch` / `matrix_fm` engines
- Package extension dialect syntax: `@spacedevin/deck/extension`
