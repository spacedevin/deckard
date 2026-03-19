# Co-DJ agent worker

## Env vars (`.env` in **repo root** is auto-loaded)

| Variable | Use |
|----------|-----|
| **`GRADIENT_MODEL_ACCESS_KEY`** | **Serverless inference** (`Authorization: Bearer …` on `inference.do-ai.run`). Primary. |
| `MODEL_ACCESS_KEY` | Fallback if `GRADIENT_MODEL_ACCESS_KEY` is unset. |
| **`DIGITALOCEAN_API_TOKEN`** | **DigitalOcean API** (control plane: e.g. `api.digitalocean.com/v2/gen-ai/...`). Not used for chat inference. |
| `DO_MODEL` | Model id from `GET …/v1/models` (default `llama3-8b-instruct`). |
| `DO_INFERENCE_BASE` | Default `https://inference.do-ai.run/v1`. |

## Human TPL stream (browser **Play**)

When the human presses **Play**, the app sends **`human_play`** then throttled **`tpl.line`** with `laneId: human`. The worker buffers those lines and, after a short debounce, calls the LLM (system prompt includes `docs/TPL_AGENT_GRAMMAR.md`) and emits **`tpl.stream_chunk`** then **`tpl.block`** on this lane. **Stop** sends **`human_stop`**. Without an API key, the human-stream path still emits a small **euclid hat** demo patch.

## Why nothing happened (demo mode)

1. **Direct**: send **Send test direct** to `ai-a`, or use **Play** for human TPL streaming (see above).
2. Session must match hub + agent `--session`.
3. Without **`GRADIENT_MODEL_ACCESS_KEY`**, **direct** only triggers keyword demos (**euclid/hat**, **bass/fm**); human stream always gets at least the euclid demo.

## AI mode

[DigitalOcean serverless inference](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/): put the model access key in `.env` as `GRADIENT_MODEL_ACCESS_KEY`, then:

```bash
npm run agent -- --lane ai-a --session default
```

Shell variables override `.env` if both are set.

## Process exits / reconnect

The agent used to **exit when the WebSocket closed** (e.g. **ws-hub stopped**, laptop sleep, network blip). That looked like “it ran then died.”

Now it **reconnects every 3s** by default. Keep **`npm run ws-hub`** running in another terminal.

- **`CODJ_AGENT_EXIT_ON_CLOSE=1`** — old behavior: exit when the hub drops.
- **`CODJ_AGENT_RECONNECT_MS=5000`** — reconnect delay (ms).
