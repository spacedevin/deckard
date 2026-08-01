---
title: Co-DJ quickstart
description: Gateway + agent worker + browser loop.
---

**Order:** gateway → worker → browser.

## 1. Gateway

```bash
npm run gateway
# listens on ws://127.0.0.1:35987 (or $PORT / CODJ_HUB_PORT)
```

On deckard.lol the gateway is same-origin at `wss://deckard.lol/codj`.

## 2. Agent worker

```bash
npm run agent
# or: npm run agent:host / npm run agent:client
```

Set `GRADIENT_MODEL_ACCESS_KEY` for real LLM replies. Without a key the worker falls back to a demo patch so the loop still runs offline.

## 3. Browser

Open the DAW (`npm run dev` or deckard.lol) → **Co-DJ** → **Connect** (session `default`) → **Play**.

On Play the host streams the project as `deck.line`. The worker buffers, calls the LLM, and replies with `deck.stream_chunk` / `deck.block`. The browser applies the block and you hear the new pattern.

## Direct test

In Co-DJ, set **Direct→** to the worker's actor, type e.g. `euclid hi-hat`, **Send test direct**. Expect a `deck.block` reply.

## Specs

- [WebSocket & actors](/docs/agents/websocket/)
- [Stream protocol](/docs/agents/stream-protocol/)
- [DJ skills](/docs/agents/skills/)
- [Token stream demo](/docs/reference/token-stream-demo/)
