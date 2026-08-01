---
title: Agent contract
description: Surfaces agents should edit; invariants.
---

This is the editing contract for LLM agents working on Deckard (same intent as repo `AGENTS.md`).

## Prefer these surfaces

1. **Project shape** — `docs/schema/project-v2.json` (`generatorId` + `generatorParams`)
2. **Load / model** — `src/model/Project.tish`, `ProjectLoad.tish` (`loadProjectFromTpl`), default song `projects/default.deckard.deck`
3. **Generators** — `src/generators/` ([docs](/docs/architecture/generators/))
4. **Safe mutators** — `src/model/Edits.tish`
5. **deck language** — [grammar](/docs/deck/grammar/), [agent subset](/docs/deck/agent-grammar/), `src/deckfile/`

## Co-DJ

- Agents emit **only their lane** (track ids prefixed with `actorId`, e.g. `ai-a_hat`)
- Master-scope lines (`bpm`, version header, `master_mix`, `auto`, …) need `master_mixer` — see [skills](/docs/agents/skills/)
- Prompt composition: [roles & skills](/docs/agents/roles/) + agent grammar

## Invariants

- Project `version`: use `2` for generator-based projects
- Times: `startBeat` / `durBeats` are **quarter-note beats**
- Preserve channel `id` strings
- Do **not** put sequencing rules in JSX-only UI files — keep logic in `model/`, schedule, `audio/`
- UI is a **deck client**: edits go through emit/apply, not silent project mutation

## Audio / Tish JS

Use `new AudioContext()` and `new Uint8Array(n)` on the JS target (see `docs/TISH_JS_BUILTINS.md` in the repo).
