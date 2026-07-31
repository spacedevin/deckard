# Deckard AI skills

This directory is the **knowledge library the co-DJ agents read at boot** (`services/agent-worker/main.tish`,
via `readFile` from `tish:fs`). Each `.md` is one *musical skill* — the agent composes its system prompt from
a **role file** + a **persona-selected subset of capability skills** + the shared deck grammar
(`docs/DECK_AGENT_GRAMMAR.md`). Editing a skill changes the agent on its next boot — no rebuild.

## Roles
- **`_role-host.md`** — the host agent (`--role host`, joins with `master_mixer`). Owns the **mix + master +
  cohesion**: balances levels/EQ/pan across every lane, sets tempo/key/swing, arranges, and *responds* to what
  clients add (clients steer style/genre by CONTENT; the host adapts the master/mix to fit).
- **`_role-client.md`** — a client agent (`--role client`, follower, no master). Owns **production**: adds
  beats/bass/melody/texture, fills gaps, pushes the arrangement, and *steers* genre/energy by what it ADDS
  (a halftime break, a key-implying line, a genre pivot) — never by touching master.

## Capability skills (composable persona library)
`beats` · `bass` · `melody` · `harmony-chords` · `texture-atmos` · `vocal` · `groove-humanize` ·
`mixing` · `arrangement` · `style-genre`. At boot each agent assembles a **unique persona** by selecting +
weighting a subset of these (the LLM picks the blend from the library + the live session; falls back to a
seeded blend keyed on the actorId when no inference key is set).

## File format
Each skill file is YAML frontmatter + a markdown body:

```
---
id: beats
role: client          # host | client | any
gates: pattern_steps, channel_mix   # the Skills.tish gating skills this maps to (enforcement layer)
weight: 1.0           # default persona-selection weight (higher = more likely chosen)
---

# Beats — drums & percussion

## Intent
<one sentence: the musical job>

## How to think
- <bullets: when to reach for it, how it fits the whole, what to avoid>

## deck it emits
- <the specific deck lines this skill uses — a SUBSET of docs/DECK_AGENT_GRAMMAR.md>

## Examples
\`\`\`tpl
track Hat id <me>_hat gen drumSynth
  steps . . x . . . x . . . x . . . x .
\`\`\`
```

Rules: every track id is prefixed `<me>_` (the worker substitutes the actorId). Examples must be **valid
co-DJ-lane deck** (non-master-scope unless the file's `role: host`). The body is injected verbatim into the
prompt, so keep it tight and imperative.
```
