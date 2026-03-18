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

## Default bundles

- **AI lane (typical)**: `adjust_instrument`, `pattern_steps`, `channel_mix`, `pattern_piano` on leased tracks only.
- **Human**: all + master.
- **Viewer**: none (read-only).

## Denied examples

- AI emits `bpm 200` without `master_mixer` → **SKILL_DENIED**.
- AI edits `c0` when `ownerLane` is `human` and not leased → **LEASE_CONFLICT**.

## Implementation

- `src/codj/Skills.tish` — allowlist check (browser).
- Hub duplicate check optional.
