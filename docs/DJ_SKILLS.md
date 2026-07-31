# DJ skills → deck / UI mapping

Skills limit what a **lane** (especially AI) may emit. Hub or browser validates.

| skill id | Allowed deck / ops |
|----------|-------------------|
| `add_track` | New `track ... id <id> gen <generator|macro>` (id allocation may be server-assisted) |
| `remove_track` | `remove_track <id>` — delete a channel. NOT master-scope (not in the denylist); per-track **ownership-gated** by `actorMayEditTrack` (a lane removes its own; a master removes any). Round-trips as absence (a deleted channel is simply not emitted). |
| `adjust_instrument` | `gen <generator|macro>`, `gen_block patch` (`osc`/`noise`/`filter`/`shaper`/`gain`/`conn`/`env`/`dur`), `osc`, `fm`, `noise`, `adsr`, `fx cutoff|reverb_send` on **owned** tracks |
| `pattern_steps` | `steps`, `steps euclid`, `step_pitch` (incl. `bar <sel>`) on owned tracks |
| `pattern_piano` | `note` lines on owned tracks |
| `channel_mix` | `mix gain|pan|mute|solo|eq_lo|eq_mid|eq_hi`, `fx`, `voice`, `step_vel|prob|ratchet|nudge` locks on owned tracks |
| `master_mixer` | the master-scope denylist — `bpm`, `tpl`, `auto`, `transpose`, `scale`, `swing`, `master_mix`, `actor_mix`, `session_scenes`, `session_slot`, `clip` — usually **human + master** only |
| `transpose_track` | `transpose` in body |
| `promote_song` | Append to full song doc |

## Agent presets & synthesis vocabulary

The agent's **primary contribution is a deck preset** on its own lane, not a single hand-written track. Implemented in [`services/agent-worker/main.tish`](../services/agent-worker/main.tish):

- On a styled/preset direct (`"play nebula pulse"`, `"give me something dark"`) or on **auto-jam** (when a peer presses Play), the agent picks one of the 15 deck sets in [`src/model/DeckSets.tish`](../src/model/DeckSets.tish) and streams it as one `deck.block`.
- **Selection order:** `matchDeckSetId` (keyword/name match on the directive) → `llmPickDeckSetId` (LLM chooses an id from the catalog, only when `GRADIENT_MODEL_ACCESS_KEY` is set) → `rotateDeckSetId` (round-robin, for variety).
- `prefixTrackIds` rewrites every `track … id <id>` → `<actorId>_<id>`, so the whole preset is **owned by this lane** and lands on **Deck B** (the human stays on Deck A; the crossfader blends them).
- A **fine single-element** direct (`"add a hihat"`) still produces one LLM/demo track instead of a full preset (`looksLikeSingleElement`).

**Synthesis vocabulary a preset (or the LLM) may emit** — all of these are non-master, so they apply on the
receiver. The **full, current palette** the agent should use lives in **[DECK_AGENT_GRAMMAR.md](DECK_AGENT_GRAMMAR.md)**
(kept in lockstep with the agent `SYSTEM_PROMPT`); in brief:

- **33 fixed generators** by role — perc (`drumSynth`/`clap`/`cymbal`/`noise_burst`), bass (`acid303`/`sub808`/`reeseBass`), lead (`basic_osc`/`fm`/`aether`/`syncLead`/`obSync`/`laserSync`), keys (`tine`/`halo`/`bell`), pad (`pad`), strings (`guitar`/`arco`), chip (`chiptune`/`nes2a03`/`gameBoyDmg`/`c64sid`/`ym2612`/`sn76489`/`spc700`/`gbaDirectSound`), vocal (`formantVocal`/`ttsVocal`/`meSpeakVocal`/`syncChoir`), modular (`matrixFm`/`patch`).
- **8 macro voices** — kick (`kick_edm`/`kick_deep`/`kick_distorted`), bass (`bass_reese_punch`/`bass_reese_sc`/`bass_wobble`; `bass_acid`/`bass_reese` are legacy, superseded in the picker by the `acid303`/`reeseBass` generators — see project memory *macro-generator-boundary-policy*). Catalog: [`src/model/MacroVoice.tish`](../src/model/MacroVoice.tish) / [`src/deckfile/Macros.tish`](../src/deckfile/Macros.tish).
- **Modular voices**: `gen_block patch` (`osc`/`noise`/`string`/`filter`/`shaper`/`gain`/`conn`/`env`/`dur`) and `gen_block matrix_fm`.
- **Per-track**: `steps`/`steps euclid`/`step_pitch` (`bar <sel>`), `note` (with `p`/`r`/`n` locks), `step_vel|prob|ratchet|nudge` lock lanes, `mix … eq_*`, `fx cutoff|res|drive|reverb_send|lfo_rate|lfo_depth|filter_type`, `voice octave|chord|arp|arprate|inversion|strum`, `adsr`, `* <bars>`, `loops`.

The agent's declared skills are `add_track`, `adjust_instrument`, `pattern_steps`, `pattern_piano`, `channel_mix` (no `master_mixer`) — exactly the set a preset needs, since presets never emit master-scope lines.

## Lane matrix (default)

Same skill ids for every row; **human** and **ai-a** columns show who may use each skill today. Toggling AI access later = flip flags in code, not new skill types.

| skill id | human | ai-a / ai-b |
|----------|-------|-------------|-------------------|
| `add_track` | yes | yes |
| `adjust_instrument` | yes | yes |
| `pattern_steps` | yes | yes |
| `pattern_piano` | yes | yes |
| `channel_mix` | yes | yes |
| `master_mixer` | yes | no (`bpm`, `auto`) |
| `transpose_track` | no* | no |
| `promote_song` | no* | no |
| `remove_track` | yes (UI ×) | no |

\*Same registry entry shape for future use.

Actors with **`master_mixer`** may stream full project shape including `bpm` / `tpl` / `auto`. Agents (without `master_mixer`) must not emit any master-scope head — `bpm`, `tpl`, top-level `auto`, `transpose`, **`scale`**, **`swing`**, `master_mix`, `actor_mix`, `session_scenes`, `session_slot`, `clip` (enforced in [`coDjLineAllowedForSkills`](../src/codj/Skills.tish), with [`skillAllowsLine`](../src/codj/Skills.tish) as a back-compat facade). `scale`/`swing` are master-scope because they re-key / re-shuffle the **whole** session for every player.

**Implementation:** [`src/codj/Skills.tish`](../src/codj/Skills.tish) — `coDjLineAllowedForSkills`, `skillIdsAllowMaster`, `hasSkill`, `actorHasSkill`, `skillAllowsLine`.

## Default bundles (informal)

- **AI lane (typical)**: `adjust_instrument`, `pattern_steps`, `channel_mix`, `pattern_piano` on leased tracks only.
- **Human**: all implemented rows + master.
- **Viewer**: none (read-only).

## Enforcement

Skill-gating **is now enforced**, on the **receiver** side:

- The gateway stamps the sender's declared `skillIds` onto every fanned-out message (`out.skillIds = conn.skillIds` in [`services/gateway/main.tish`](../services/gateway/main.tish)).
- The browser ([`src/ui/CoDjPanel.tish`](../src/ui/CoDjPanel.tish)) threads `msg.skillIds` into [`applyCoDjTplSource`](../src/codj/Merge.tish) and `coDjHandleIncomingTplBlock`.
- [`applyCoDjTplSource`](../src/codj/Merge.tish) gates master-scope lines (`bpm`, top-level `auto`, session clips, scenes) via [`skillIdsAllowMaster`](../src/codj/Skills.tish), falling back to the legacy `actorId.indexOf("human")` check **only** when `skillIds` are absent.
- The incremental line decoder ([`src/deckfile/Stream.tish`](../src/deckfile/Stream.tish)) gates **every** streamed line via [`coDjLineAllowedForSkills`](../src/codj/Skills.tish).

Enforcement = the **receiver silently skips disallowed lines** (master-scope lines without `master_mixer`). There is **no `SKILL_DENIED` error code** yet — see [WS_AND_AGENTS.md §1.3](./WS_AND_AGENTS.md) for the error codes actually emitted.

## Denied examples

- AI emits `bpm 200` without `master_mixer` skill → receiver **silently skips** the line (planned: `SKILL_DENIED`).
- AI edits `c0` when `ownerActorId` is another actor and not leased → skipped by `actorMayEditTrack` (planned error: `LEASE_CONFLICT`).

## Implementation

- `src/codj/Skills.tish` — `coDjLineAllowedForSkills`, `skillIdsAllowMaster`, `hasSkill`, `actorHasSkill`, `skillAllowsLine`.
- `src/codj/Merge.tish` — `applyCoDjTplSource` gates master-scope lines; `actorMayEditTrack` enforces per-track ownership / master-lock.
- `src/deckfile/Stream.tish` — incremental line decoder gates every streamed line.
- Hub duplicate check optional.
