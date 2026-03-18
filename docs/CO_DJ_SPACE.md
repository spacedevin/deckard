# Co-DJ space: lanes, overlays, master

## Lanes (default performance)

| Lane | Role |
|------|------|
| `ai-a` | AI agent stream → TPL |
| `ai-b` | Second AI agent |
| `human` | Human DJ: code + UI |

Each lane owns a **canonical TPL slice** (per-track or per-line stream). The **effective** project is a **merge** of lane canonicals plus optional **UI overlay**.

## Merge (browser / host)

1. **Track ownership**: each channel `id` has `ownerLane` + `authorId` in sidecar ([AUTHOR_TAGGING.md](./AUTHOR_TAGGING.md)).
2. **Merge order**: for each track, body lines come from **owner lane’s** last applied `tpl.line`/`tpl.block` for that track; if master has **taken** the track, human lane wins.
3. **Overlay**: `{ channelId, field, value, untilTs?, authorId }` — applied on top for playback/UI only until cleared or promoted.

## UI overlay semantics

- Human moves a fader on an **AI-owned** track → stored as overlay (temporary).
- **Promote**: write overlay value into human lane TPL (or target lane if permitted) and clear overlay.
- **Master clear overlay**: drop all overlays in scope.

## Master DJ

- Designated `authorId` (usually human session id) with `isMaster: true`.
- May emit `control` messages: `take_track`, `release_track`, `clear_overlay`, `overwrite_automation`.
- AI lanes cannot modify tracks the master has **taken** until `release_track`.

## Presentation modes

1. **Split panels**: Stream A | Stream B | Human — each with stream textarea + lane color.
2. **Unified**: single rack; tracks show **lane chip** (color); overlays show dashed border.

## Sync with code

- **Song** TPL = optional full export of merged state.
- **Per-lane buffers** = what each actor typed; merge engine produces `project` for audio engine.
