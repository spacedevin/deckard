# Author tagging and track metadata

## Sidecar model (v1)

Stored in project as `coDjMeta` (parallel to channels):

```json
{
  "coDjMeta": {
    "lanes": { "ai-a": {}, "ai-b": {}, "human": {} },
    "tracks": {
      "c0": { "ownerLane": "ai-a", "authorId": "agent-a", "masterLock": false },
      "c3": { "ownerLane": "human", "authorId": "u1", "masterLock": true }
    }
  }
}
```

- **`ownerLane`**: which lane’s TPL is authoritative for this channel’s body (after merge).
- **`masterLock`**: if true, only master/human lane may change this track until released.
- **`authorId`**: last writer or creator.

## Merge precedence

1. If `masterLock` and lane ≠ `human` → ignore non-human TPL for that `channelId` from other lanes (or require `control` overwrite).
2. Else use **ownerLane**’s latest TPL for that track id.
3. New track from lane X → `ownerLane = X`, `authorId = emitter`.

## Future: inline TPL

Optional parser extension:

```
track Kick id c0 gen noise_burst @lane ai-a
```

Deferred until parser change; sidecar is source of truth in v1.

## UI

- Channel rack badge: color by `ownerLane`.
- Mixer strip: tint if overlay active.
