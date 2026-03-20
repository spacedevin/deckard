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

When the human presses **Play**, the app sends **`playing_start`** then throttled **`tpl.line`** with `actorId`. The worker buffers those lines and, after a short debounce, calls the LLM (system prompt includes `docs/TPL_AGENT_GRAMMAR.md`) and emits **`tpl.stream_chunk`** then **`tpl.block`** with the agent's `actorId`. **Stop** sends **`playing_stop`**. Without an API key, the human-stream path still emits a small **euclid hat** demo patch.

## Why nothing happened (demo mode)

1. **Direct**: send **Send test direct** to `ai-a`, or use **Play** for human TPL streaming (see above).
2. Session must match gateway + agent `--session`.
3. Without **`GRADIENT_MODEL_ACCESS_KEY`**, **direct** only triggers keyword demos (**euclid/hat**, **bass/fm**); human stream always gets at least the euclid demo.

## AI mode

[DigitalOcean serverless inference](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/): put the model access key in `.env` as `GRADIENT_MODEL_ACCESS_KEY`, then:

```bash
npm run agent -- --actor-id agent-1 --session default
```

Shell variables override `.env` if both are set.

**Tish agent:** `npm run agent` runs `services/agent-worker/main.tish` (Tish). It responds to **direct** and **human play** with LLM-generated TPL (when `GRADIENT_MODEL_ACCESS_KEY` is set) or demo patches.

**Build tish first:** From the **tish** repo run `cargo build --features full`. Use that binary when running the agent (e.g. `../tish/target/debug/tish run services/agent-worker/main.tish` from tish-midi, or ensure `tish` on your PATH is that build). The agent uses `continue` in a `while(true)` loop; the bytecode compiler must be built with the fix for backward jump patching.

## Process exits / reconnect

The agent used to **exit when the WebSocket closed** (e.g. **gateway stopped**, laptop sleep, network blip). That looked like “it ran then died.”

Now it **reconnects every 3s** by default. Keep **`npm run gateway`** running in another terminal.

- **`CODJ_AGENT_EXIT_ON_CLOSE=1`** — old behavior: exit when the hub drops.
- **`CODJ_AGENT_RECONNECT_MS=5000`** — reconnect delay (ms).
