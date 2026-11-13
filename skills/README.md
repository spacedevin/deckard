# Deckard AI skills

This directory is the **knowledge library the co-DJ agents are prompted with**. Each `.md` is one *musical
skill* — the agent ([`src/agentkit/Agent.tish`](../src/agentkit/Agent.tish) `composeAgentPrompt`) builds its
system prompt from a **role file** + a **persona-selected subset of capability skills** + the shared deck grammar
(`docs/DECK_AGENT_GRAMMAR.md`) + the co-DJ script API (`public/codj.d.ts`). The files are bundled into
[`src/agentkit/PromptAssets.tish`](../src/agentkit/PromptAssets.tish) so the browser worker has them too: after
editing a skill run `node scripts/gen-codj-api.mjs` and rebuild (`npm test` fails if the bundle is stale).

## Roles
- **`_role-host.md`** — the host agent (`--role host`, joins with `master_mixer`). Owns the **mix + master +
  cohesion**: balances levels/EQ/pan across every lane, sets tempo/key/swing, arranges, and *responds* to what
  clients add (clients steer style/genre by CONTENT; the host adapts the master/mix to fit).
- **`_role-client.md`** — a client agent (`--role client`, follower, no master). Owns **production**: adds
  beats/bass/melody/texture, fills gaps, pushes the arrangement, and *steers* genre/energy by what it ADDS
  (a halftime break, a key-implying line, a genre pivot) — never by touching master.

## Capability skills (composable persona library)
`beats` · `bass` · `melody` · `harmony-chords` · `texture-atmos` · `vocal` · `groove-humanize` ·
`mixing` · `arrangement` · `style-genre`. Every agent is prompted with the **whole library** — a realistic
track needs drums, bass, harmony and a hook at once, so withholding skills made agents shallow. `seededSkillBlend`
remains for a caller that wants a narrower persona.

## Taste cards (the creative director)
Each AI co-DJ has a **creative director**: a second model with no tools
([`src/agentkit/Director.tish`](../src/agentkit/Director.tish)) that is asked for a brief before the opening,
every request and every evolve move. It decides what the music does next and why. The producer, the tool-calling model,
gets that brief under its situation and carries it out. The director reads these files:
- **`_personas.md`**: who is playing (`## id: Title` + outlook, signature moves, never, palette). One per agent,
  seeded by actorId or chosen with `--persona <id>`. The producer prompt carries it too.
- **`_constraints.md`**: one-rule cards (`## id` + the rule). Three are offered per brief; the director plays 0–2.
- **`_idioms.md`**: what makes each style feel like itself, as techniques.

The set memory (one entry per pass, read from the room: deck, bpm, instruments, the brief's title and cards) lives
on `codj.state.setMemory`. `noveltyNotes` turns it into sentences ("the tempo has sat at 124 bpm since bar 0")
for the director and `check_my_work`. Models: `--director-model <id>|off` (`HYPERY_DIRECTOR_MODEL`), or the
Director menu in the co-DJ panel.

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

Rules: every track id is prefixed `<me>_` (the agent substitutes its actorId). Examples must be **valid
co-DJ-lane deck** (non-master-scope unless the file's `role: host`). The body is injected verbatim into the
prompt, so keep it tight and imperative.
```
