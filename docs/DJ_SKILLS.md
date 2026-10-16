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
| `master_mixer` | the master-scope denylist — `bpm`, `tpl`, `auto`, `transpose`, `scale`, `swing`, `master_mix`, `actor_mix`, `xfade`, `deck_mix`, `session_scenes`, `session_slot`, `clip`, `launch_quant`, `song_seed`, `main_deck`, `song`, `follow`. Held by the **master browser** and by an **AI host added in that browser**. |
| `transpose_track` | `transpose` in body |
| `promote_song` | Append to full song doc |

## Agent presets & synthesis vocabulary

AI co-DJs ([`src/agentkit/`](../src/agentkit/), run in the browser via **Add AI co-DJ**, or headless with
`pnpm run agent:client` / `agent:host`) contribute by **writing a co-DJ script** — JS over the `codj.*` API
([CODJ_API.md](CODJ_API.md)) whose hooks run every bar/beat — rather than one-shot blocks. A script may still lay
down a whole preset in one write (`codj.send(deckText)`); every track it creates is id-prefixed with its actorId,
so the whole lane is **owned by that agent**, and writes are gated exactly as below (the write result lists any
rejected lines with `SKILL_DENIED` / `NOT_OWNER` / `PARSE_FAIL`).

**Synthesis vocabulary a preset (or the LLM) may emit** — all of these are non-master, so they apply on the
receiver. The **full, current palette** the agent should use lives in **[DECK_AGENT_GRAMMAR.md](DECK_AGENT_GRAMMAR.md)**
(baked into the agent prompt); in brief:

- **33 fixed generators** by role — perc (`drumSynth`/`clap`/`cymbal`/`noise_burst`), bass (`acid303`/`sub808`/`reeseBass`), lead (`basic_osc`/`fm`/`aether`/`syncLead`/`obSync`/`laserSync`), keys (`tine`/`halo`/`bell`), pad (`pad`), strings (`guitar`/`arco`), chip (`chiptune`/`nes2a03`/`gameBoyDmg`/`c64sid`/`ym2612`/`sn76489`/`spc700`/`gbaDirectSound`), vocal (`formantVocal`/`ttsVocal`/`meSpeakVocal`/`syncChoir`), modular (`matrixFm`/`patch`).
- **8 macro voices** — kick (`kick_edm`/`kick_deep`/`kick_distorted`), bass (`bass_reese_punch`/`bass_reese_sc`/`bass_wobble`; `bass_acid`/`bass_reese` are legacy, superseded in the picker by the `acid303`/`reeseBass` generators — see project memory *macro-generator-boundary-policy*). Catalog: [`src/model/MacroVoice.tish`](../src/model/MacroVoice.tish) / [`BuiltinMacros.tish`](https://github.com/spacedevin/deck/blob/main/packages/synths/src/BuiltinMacros.tish).
- **Modular voices**: `gen_block patch` (`osc`/`noise`/`string`/`filter`/`shaper`/`gain`/`conn`/`env`/`dur`) and `gen_block matrix_fm`.
- **Per-track**: `steps`/`steps euclid`/`step_pitch` (`bar <sel>`), `note` (with `p`/`r`/`n` locks), `step_vel|prob|ratchet|nudge` lock lanes, `mix … eq_*`, `fx cutoff|res|drive|reverb_send|lfo_rate|lfo_depth|filter_type`, `voice octave|chord|arp|arprate|inversion|strum`, `adsr`, `* <bars>`, `loops`.

A **client** agent's declared skills are `add_track`, `adjust_instrument`, `pattern_steps`, `pattern_piano`, `channel_mix` (no `master_mixer`). A **host-role** agent (`Add AI host` in the master browser, or `codj run --role host`) also holds `master_mixer`: it may run the session, the 4-way fader, booth EQ and the master echo/filter throws. The gateway grants that skill to the human tab that hosts the room and to an AI host of the same owner. A client join, a follower tab, and anyone else have it stripped.

## Lane matrix (default)

Same skill ids for every row; **human** and **ai-a** columns show who may use each skill today. Toggling AI access later = flip flags in code, not new skill types.

| skill id | human | ai-a / ai-b |
|----------|-------|-------------|-------------------|
| `add_track` | yes | yes |
| `adjust_instrument` | yes | yes |
| `pattern_steps` | yes | yes |
| `pattern_piano` | yes | yes |
| `channel_mix` | yes | yes |
| `master_mixer` | yes, in the master browser | yes for an AI **host** in that browser; no for a client |
| `transpose_track` | no* | no |
| `promote_song` | no* | no |
| `remove_track` | yes (UI ×) | no |

\*Same registry entry shape for future use.

Actors with **`master_mixer`** may stream full project shape including `bpm` / `tpl` / `auto`, plus the booth: `xfade`, `deck_mix`, and `@ fx` / `@ transport` / `@ launch`. Client agents (without `master_mixer`) must not emit any master-scope head — `bpm`, `tpl`, top-level `auto`, `transpose`, **`scale`**, **`swing`**, `master_mix`, `actor_mix`, `xfade`, `deck_mix`, `session_scenes`, `session_slot`, `clip` (enforced in [`coDjLineAllowedForSkills`](../src/codj/Skills.tish), with [`skillAllowsLine`](../src/codj/Skills.tish) as a back-compat facade). `scale`/`swing` are master-scope because they re-key / re-shuffle the **whole** session for every player. A host-role agent is the exception: it holds `master_mixer` on purpose.

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

Enforcement = the **receiver skips disallowed lines** (master-scope lines without `master_mixer`). The edit gate reports that skip as `SKILL_DENIED` (`coDjGateReport` in [`src/codj/Gate.tish`](../src/codj/Gate.tish)).

## Denied examples

- AI emits `bpm 200` without `master_mixer` skill → receiver **silently skips** the line (planned: `SKILL_DENIED`).
- AI edits `c0` when `ownerActorId` is another actor and not leased → skipped by `actorMayEditTrack` (planned error: `LEASE_CONFLICT`).

## Implementation

- `src/codj/Skills.tish` — `coDjLineAllowedForSkills`, `skillIdsAllowMaster`, `hasSkill`, `actorHasSkill`, `skillAllowsLine`.
- `src/codj/Merge.tish` — `applyCoDjTplSource` gates master-scope lines; `actorMayEditTrack` enforces per-track ownership / master-lock.
- `src/deckfile/Stream.tish` — incremental line decoder gates every streamed line.
- Hub duplicate check optional.
