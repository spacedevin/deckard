# Author tagging and track metadata

## Sidecar model (v1)

Stored in project as `coDjMeta` (parallel to channels):

```json
{
  "coDjMeta": {
    "tracks": {
      "c0": { "ownerActorId": "agent-1", "authorId": "agent-a", "masterLock": false, "lastTouchedPerfStep": 0 },
      "c3": { "ownerActorId": "human-xyz", "authorId": "u1", "masterLock": true, "lastTouchedPerfStep": 240 }
    }
  }
}
```

`ensureCoDjMeta` in `src/codj/CoDjMeta.tish` only ever builds the `tracks` object, keyed by `channelId`. A `lanes` object is _not_ created (Planned).

- **`ownerActorId`**: which lane’s TPL is authoritative for this channel’s body (after merge).
- **`masterLock`**: if true, only master/human actor may change this track until released. Now has a UI toggle: a per-track **LOCK/OPEN** button in the channel rack (`src/ui/ChannelRack.tish`) calls `setMasterLock`.
- **`authorId`**: last writer or creator.
- **`lastTouchedPerfStep`**: performance step at which the track was last written (`setTrackTouched`).

## Merge precedence

1. If `masterLock` and actor is not master → ignore non-master TPL for that `channelId` from other actors (or require `control` overwrite).
2. Else use **ownerActorId**’s latest TPL for that track id.
3. New track from actor X → `ownerActorId = X`, `authorId = emitter`.

## Planned: inline TPL

Optional parser extension (still unimplemented):

```
track Kick id c0 gen noise_burst @lane ai-a
```

The inline `@lane ai-a` tag form is not yet parsed; the sidecar (`coDjMeta.tracks`) remains the source of truth.

## UI

- Channel rack badge: color by `ownerActorId`.
- Mixer strip: tint if overlay active.
