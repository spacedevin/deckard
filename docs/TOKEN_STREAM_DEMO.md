# Token stream demo (WebSocket → gateway → browser → audio)

End-to-end flow:

1. **`services/token-stream-demo`** connects to the gateway as lane **`demo-stream`**.
2. For each cycle it sends **`tpl.stream_chunk`** (single characters) so the Co-DJ panel shows a live “token” preview.
3. Then it sends **`tpl.block`** with **`asap: true`** so the patch applies immediately (no perf-step queue).
4. You **Play** in the app to hear **WsKick** / **WsHat** on channel ids **`wsdemo_k1`** / **`wsdemo_h1`**.

## Run

```bash
# Terminal A
npm run gateway                     # from repo root (Tish gateway)

# Terminal B
cd services/token-stream-demo && npm install   # once
npm run token-demo                             # or: npm run token-demo from repo root
```

Open the app (e.g. `npm run serve` → http://localhost:3456), go to **Co-DJ**, **Connect** (session **default**), click **Play**.

## Human in the loop

- Open **Song** and edit steps / mix on **`wsdemo_k1`** or **`wsdemo_h1`**, then **Apply** (human lane). That sets **human ownership** on those tracks.
- After that, the stream service **no longer overwrites** those tracks (lane rules in `Merge.tish`), but it still updates any tracks it still owns.
- Add your own tracks in Song as usual; they stay yours.

## Env

| Variable | Default | Meaning |
|----------|---------|---------|
| `CODJ_HUB` | `ws://127.0.0.1:8765` | Gateway base URL |
| `CODJ_SESSION` | `default` | Session id (must match browser) |
| `TOKEN_CHUNK_MS` | `12` | Delay between stream chunks (ms) |
