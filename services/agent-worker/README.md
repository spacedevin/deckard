# Co-DJ agent worker

## Env vars (`.env` in **repo root** is auto-loaded)

| Variable | Use |
|----------|-----|
| **`GRADIENT_MODEL_ACCESS_KEY`** | **Serverless inference** (`Authorization: Bearer …` on `inference.do-ai.run`). Primary. |
| `MODEL_ACCESS_KEY` | Fallback if `GRADIENT_MODEL_ACCESS_KEY` is unset. |
| **`DIGITALOCEAN_API_TOKEN`** | **DigitalOcean API** (control plane: e.g. `api.digitalocean.com/v2/gen-ai/...`). Not used for chat inference. |
| `DO_MODEL` | Model id from `GET …/v1/models` (default `llama3-8b-instruct`). |
| `DO_INFERENCE_BASE` | Default `https://inference.do-ai.run/v1`. |

## Why nothing happened (demo mode)

1. Connect alone is not enough — send **Send test direct** to `ai-a`.
2. Session must match hub + agent `--session`.
3. Without **`GRADIENT_MODEL_ACCESS_KEY`**, only keyword demos work (**euclid/hat**, **bass/fm**).

## AI mode

[DigitalOcean serverless inference](https://docs.digitalocean.com/products/gradient-ai-platform/how-to/use-serverless-inference/): put the model access key in `.env` as `GRADIENT_MODEL_ACCESS_KEY`, then:

```bash
npm run agent -- --lane ai-a --session default
```

Shell variables override `.env` if both are set.
