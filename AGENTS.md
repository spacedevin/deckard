# Agent / LLM editing contract — Deckard

**LLM index:** [llms.txt](llms.txt) (checkout) · [https://deckard.lol/llms.txt](https://deckard.lol/llms.txt) (site) · human docs at [https://deckard.lol/docs/](https://deckard.lol/docs/).

For the big picture (vision, subsystems, end-to-end signal path) read
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** first.

## Prefer these surfaces

0. **`@spacedevin/deck`** — `.deck` language (parse / format / registries / highlight). Canonical grammar: package `docs/DECK_GRAMMAR.md` (`@spacedevin/deck/grammar`). Host keepers: `src/deckfile/` (`Apply` / `Emit` / `Stream` / `LoopState` / `PatchGraph` / `MatrixFmGraph`), boot registries in `src/generators/DeckIds.tish` + `BuiltinMacros.tish`, co-DJ in `src/codj/`.

1. **[docs/schema/project-v2.json](docs/schema/project-v2.json)** — v2 shape (`generatorId` + `generatorParams` per channel). v1 JSON with `waveform` only is migrated on load.
2. **[src/model/Project.tish](src/model/Project.tish)** — `emptyProjectShell()`, `projectToJson` / `projectFromJson`. **`[src/model/ProjectLoad.tish](src/model/ProjectLoad.tish)`** — `loadProjectFromTpl(source)` builds a project from deck (use for multiple songs); bundled default text in **`[projects/default.deckard.deck](projects/default.deckard.deck)`** / `DefaultDeckardTpl.tish`.
3. **[src/generators/](src/generators/)** — modular instruments; see [docs/GENERATORS.md](docs/GENERATORS.md).
4. **[src/model/Edits.tish](src/model/Edits.tish)** — small safe mutators (`toggleStep`, `addPianoNote`, `setAdsr`, …).
5. **`instrumentPresets`** — project-level named patches; applying copies `generatorId` + deep-cloned `params` onto the **selected track only**.  
   **ADSR** is inside `generatorParams` (per generator), not on the channel object. Per-track mixer = gain / pan / mute / solo **plus** a 3-band EQ (`eqLo`/`eqMid`/`eqHi`) and channel FX (`filterCutoff`/`res`/`drive`/`reverbSend`/`filterType`). A track also carries pitch/voice fields (`octave`/`chord`/`inversion`/`arp`/`arpRate`/`strum`), per-step locks on `steps`, and per-note locks on `pianoNotes`.

## deck & co-DJ surface

The text protocol (deck) is the source-of-truth control language — every UI edit round-trips through it, and the
LLM co-DJ and multiplayer peers speak it. Don't learn the vocabulary from scattered UI files; use:

- **`@spacedevin/deck` grammar** — canonical language ([`node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md`](node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md)). Deckard overlay (UI / ownership / clamps): [docs/DECK_GRAMMAR.md](docs/DECK_GRAMMAR.md).
- **[docs/DECK_AGENT_GRAMMAR.md](docs/DECK_AGENT_GRAMMAR.md)** — the **co-DJ lane subset** (what an agent may emit), kept in lockstep with the agent `SYSTEM_PROMPT` in [services/agent-worker/main.tish](services/agent-worker/main.tish).
- **[docs/DJ_SKILLS.md](docs/DJ_SKILLS.md)** — skill-gating: which lines are **master-scope** (`bpm`/`deck`/`tpl`/`auto`/`transpose`/`scale`/`swing`/`master_mix`/`actor_mix`/`session_*`/`clip`) and thus require the `master_mixer` skill. Source of truth: [src/codj/Skills.tish](src/codj/Skills.tish) `coDjLineAllowedForSkills`; per-track ownership in [src/codj/Merge.tish](src/codj/Merge.tish) `actorMayEditTrack`.
- **[skills/README.md](skills/README.md)** — the AI agents are **role-based** (`--role host` = mixing/master/cohesion, joins with `master_mixer`; `--role client` = production) and **compose their system prompt at boot** from `skills/*.md` (a role file + a persona-selected subset of capability skills + `docs/DECK_AGENT_GRAMMAR.md`), read via `tish:fs` `readFile`. The persona is LLM-composed (seeded-by-actorId fallback) so same-role agents differ. Run: `pnpm run agent:host` / `pnpm run agent:client` (+ `pnpm run gateway`). The hardcoded `SYSTEM_PROMPT` in [services/agent-worker/main.tish](services/agent-worker/main.tish) is now only a fallback.

The instrument catalog (33 generators + 8 macros) is defined in [src/generators/Registry.tish](src/generators/Registry.tish) (`generatorCatalog`) + [src/model/MacroVoice.tish](src/model/MacroVoice.tish) (`macroCatalog`); the picker grouping is `VOICE_GROUPS` in [src/ui/InstrumentStack.tish](src/ui/InstrumentStack.tish). Generators and macros must never share a label (see project memory *macro-generator-boundary-policy*).

## Invariants

- **`version`**: use `2` for generator-based projects; bump when breaking `generatorParams` shapes.
- **Times**: `startBeat` / `durBeats` are in **quarter-note beats**. Step `i` (0–15) = beat `i * 0.25` in the looping bar.
- **Channels**: preserve `id` strings when editing; UI keys off array index + `id`.
- **Do not** put sequencing rules inside JSX-only files; keep logic in `model/`, `schedule/`, `audio/`.

## Audio / compiler

- **Web Audio / typed arrays**: use **`new AudioContext()`** and **`new Uint8Array(n)`** in JS-target builds (see [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md)). Do not replace with hand-written `.js` shims in app code.

## UI files

- **[src/ui/](src/ui/)** — layout and wiring only; business rules stay in model/schedule/audio.
