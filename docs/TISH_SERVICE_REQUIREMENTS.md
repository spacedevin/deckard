# Tish service requirements (gaps for gateway + agent)

This document describes the **capabilities the Tish runtime must provide** so that the Co-DJ **gateway** and **agent** can be implemented and run entirely in Tish (no Node/JS). It is written from the perspective of the tish-midi app; the Tish implementation lives in the sibling **tish** repo.

## P0 — WebSocket (blocking both gateway and agent)

- **WebSocket server**: Accept connections, associate each with a room (e.g. by sessionId from first message or from URL path if HTTP upgrade is supported). Broadcast JSON messages to other clients in the same room. Per-lane sequence numbers.
- **WebSocket client**: Connect to a URL, send and receive JSON text frames. Used by the agent to connect to the gateway.

**Status:** Implemented in Tish as **`tish:ws`** (feature flag `ws`): `WebSocket(url)` client, `Server({ port })` with `.on('connection', fn)` and `.listen()`. Build with `--features ws` or `full`. Gateway and agent can use this.

## P1 — Optional

- **Random UUID**: Gateway assigns a `clientId` per connection (e.g. for presence). Workaround: use a string like `"tish-" + Date.now()` or similar until a UUID builtin exists.
- **SQLite**: Agent can persist messages/chunks; optional. Workaround: use **tish:fs** (append to JSON or skip persistence for a minimal agent).
- **process.on("SIGINT")**: Agent may exit on Ctrl+C. Workaround: run without signal handling, or document that the process is killed by the terminal.

## Summary (gaps only)

| Priority | Requirement              | Blocks      | Status / workaround                    |
| -------- | ------------------------ | ----------- | -------------------------------------- |
| P0       | WebSocket server + client| Gateway, Agent | **Done** — `tish:ws` with Server + WebSocket |
| P1       | Random UUID              | Gateway     | Use `"tish-" + Date.now()` or similar  |
| P1       | SQLite                   | Agent       | Optional; use tish:fs or skip          |
| P1       | process.on("SIGINT")     | Agent       | Optional; exit via terminal            |

## Running gateway and agent as Tish

- **Gateway**: `tish run services/gateway/main.tish` (with `--features ws`). Listens on port 8765 (or `CODJ_HUB_PORT`).
- **Agent**: `tish run services/agent-worker/main.tish` (with `--features ws,http,fs,process`). Uses `--lane`, `--hub`, `--session` (argv), env `GRADIENT_MODEL_ACCESS_KEY`, `DO_BASE`, etc.

No JavaScript in the service implementations; no Node.
