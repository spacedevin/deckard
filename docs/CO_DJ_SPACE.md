# Co-DJ space: actors, overlays, master

## Actors (default performance)

Actors join channels and declare skills. Examples: browser user (`human-*`), AI agents (`agent-1`, `agent-2`). Each actor owns a **canonical deck slice** (per-track or per-line stream). The **effective** project is a **merge** of actor canonicals plus optional **UI overlay**.

## Merge (browser / host)

1. **Track ownership**: each channel `id` has `ownerActorId` + `authorId` in sidecar ([AUTHOR_TAGGING.md](./AUTHOR_TAGGING.md)).
2. **Merge order**: for each track, body lines come from **owner lane’s** last applied `deck.line`/`deck.block` for that track; if master has **taken** the track, master wins.
3. **Overlay**: `{ channelId, field, value, untilTs?, authorId }` — applied on top for playback/UI only until cleared or promoted.

## UI overlay semantics

- Human moves a fader on an **AI-owned** track → stored as overlay (temporary).
- **Promote**: write overlay value into target actor deck (if permitted) and clear overlay.
- **Master clear overlay**: drop all overlays in scope.

## Master DJ

- Designated `authorId` (usually human session id) with `isMaster: true`.
- May emit `control` messages: `take_track`, `release_track`, `clear_overlay`, `set_master`, `master_overwrite` (see [STREAM_PROTOCOL.md §4](./STREAM_PROTOCOL.md#4-control-ops-master)). Of these only `clear_overlay` is implemented today; `take_track` / `release_track` / `set_master` / `master_overwrite` are **Planned**.
- AI actors cannot modify tracks the master has **taken** until `release_track`.
- **Master lock** has a UI: a per-track LOCK/OPEN toggle in the channel rack ([src/ui/ChannelRack.tish](../src/ui/ChannelRack.tish)) calls `setMasterLock`, setting `coDjMeta.tracks[channelId].masterLock`. The merge read path honors it — `actorMayEditTrack` ([src/codj/Merge.tish](../src/codj/Merge.tish)) refuses edits to a locked track regardless of ownership.

## Presentation modes

1. **Split panels**: Stream A | Stream B | Human — each with stream textarea + lane color.
2. **Unified**: single rack; tracks show **actor chip** (color); overlays show dashed border.

## Sync with code

- **Song** deck = optional full export of merged state.
- **Per-actor buffers** = what each actor typed; merge engine produces `project` for audio engine.
