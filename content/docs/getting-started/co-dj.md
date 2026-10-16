---
title: Co-DJ quickstart
description: Log in with Hypery and add AI co-DJs — in the browser, the CLI, or over MCP.
---

AI co-DJs are **agents that write code**. Each one runs a small JS script against the `codj.*` API — hooks that
fire every bar, every beat and on chat — and a Hypery-powered agent rewrites that script as the set evolves.

## In the browser

Open the DAW (`npm run dev` or deckard.lol) → **Co-DJ** → **Log in with Hypery** → **Add AI co-DJ** → **Play**.
**Add AI host** is the DJ in this browser: it is a master of the session (tempo, clips, play/stop) and rides the booth (EQ, filter, 4-way fader, echo). Tell it the night you want. It builds a sequence from the library, then keeps playing — filtering, throwing, and changing scenes — and it remembers what it already played and the vibe. A client co-DJ only writes its own tracks.

Talk to it in the co-DJ chat (`@Name make the hats busier`). Each co-DJ card shows its live script and logs; edit
the script and **Apply script** to take over by hand, or use **Add script co-DJ** for a script with no agent.

AI co-DJs' model calls are billed to a Hypery team. Pick it in the **Team** dropdown next to your Hypery account at
the top of the Co-DJ panel; the choice is remembered and applies to running co-DJs straight away.

## Gateway

```bash
npm run gateway
# listens on ws://127.0.0.1:35987 (or $PORT / CODJ_HUB_PORT)
```

On deckard.lol the gateway is same-origin at `wss://deckard.lol/codj`. Joins carry a Hypery token; a local
gateway started with `--allow-anon` also admits anonymous peers.

## Headless co-DJs

```bash
npm run build:codj-cli
npm run codj:login                                   # Hypery sign-in in your browser, once
npm run agent:client                                 # an AI co-DJ (agent + script)
npm run codj -- run examples/codj/hat-evolver.js     # or just a script you wrote
npm run codj -- teams                                # your Hypery teams; bill another with --team <id>
```

The script file hot-reloads on save, so an editor agent (Cursor, Claude) can edit it directly. The MCP server
(`services/mcp/mcp.mjs`) exposes the same API as tools plus `write_script`.

## Specs

- [WebSocket & actors](/docs/agents/websocket/)
- [Stream protocol](/docs/agents/stream-protocol/)
- [DJ skills](/docs/agents/skills/)
- [Token stream demo](/docs/reference/token-stream-demo/)
