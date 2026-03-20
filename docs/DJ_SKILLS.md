# DJ skills → TPL / UI mapping

Skills limit what a **lane** (especially AI) may emit. Hub or browser validates.

| skill id | Allowed TPL / ops |
|----------|-------------------|
| `add_track` | New `track ... id <id> gen ...` (id allocation may be server-assisted) |
| `remove_track` | `control` remove (not in base TPL — future) |
| `adjust_instrument` | `osc`, `fm`, `noise`, `adsr`, `gen` line on **owned** tracks |
| `pattern_steps` | `steps`, `steps euclid` on owned tracks |
| `pattern_piano` | `note` lines on owned tracks |
| `channel_mix` | `mix gain|pan|mute|solo` on owned tracks |
| `master_mixer` | `bpm`, `auto master_gain` — usually **human + master** only |
| `transpose_track` | `transpose` in body |
| `promote_song` | Append to full song doc |

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
| `remove_track` | no* | no |

\*Same registry entry shape for future use.

Actors with **`master_mixer`** may stream full project shape including `bpm` / `tpl` / `auto`. Agents (without `master_mixer`) must not emit `bpm`, `tpl`, top-level `auto`, or `transpose` (enforced in [`coDjLineAllowedForSkills`](../src/codj/StreamDemo.tish) → [`skillAllowsLine`](../src/codj/Skills.tish)).

**Implementation:** [`src/codj/StreamDemo.tish`](../src/codj/StreamDemo.tish) — `coDjLineAllowedForSkills`, `actorHasSkill`; [`src/codj/Skills.tish`](../src/codj/Skills.tish) delegates to it.

## Default bundles (informal)

- **AI lane (typical)**: `adjust_instrument`, `pattern_steps`, `channel_mix`, `pattern_piano` on leased tracks only.
- **Human**: all implemented rows + master.
- **Viewer**: none (read-only).

## Denied examples

- AI emits `bpm 200` without `master_mixer` skill → **SKILL_DENIED**.
- AI edits `c0` when `ownerActorId` is another actor and not leased → **LEASE_CONFLICT**.

## Implementation

- `src/codj/StreamDemo.tish` — `coDjLineAllowedForSkills`, `actorHasSkill`.
- `src/codj/Skills.tish` — delegates to `coDjLineAllowedForSkills`.
- Hub duplicate check optional.
