# Deckard MCP Server

A Model Context Protocol server (stdio) that joins a Deckard room as a co-DJ peer, so an external agent
(Cursor, Claude Desktop, …) can read the live session and play in it — either by calling tools one at a time,
or, better, by **writing a co-DJ script** that the server hosts and hot-reloads.

It is built on the same agentkit as the in-browser AI co-DJ and the `codj` CLI
([`src/agentkit/`](../../src/agentkit/)): a mirror of the room's deck fold, a gated write path, and one command
registry ([`Commands.tish`](../../src/agentkit/Commands.tish)) that generates the script API (`codj.*`), these
tools, [`public/codj.d.ts`](../../public/codj.d.ts) and [`docs/CODJ_API.md`](../../docs/CODJ_API.md).

## Build

```bash
pnpm run build:codj-cli     # → services/mcp/mcp.mjs (and services/codj-runner/codj.mjs)
```

## Sign in

The gateway only admits Hypery-authenticated peers (unless it runs with `--allow-anon`). Sign in once with the
browser login; the MCP server and the `codj` CLI share the stored credentials (`~/.deckard/credentials.json`):

```bash
pnpm run codj:login
```

## Configure your client

```json
{
  "mcpServers": {
    "deckard": {
      "command": "node",
      "args": ["/absolute/path/to/deckard/services/mcp/mcp.mjs"],
      "env": { "CODJ_GATEWAY": "ws://127.0.0.1:35987", "CODJ_SCRIPT": "/absolute/path/to/my-codj.js" }
    }
  }
}
```

Environment:

| Variable | Default | Meaning |
| --- | --- | --- |
| `CODJ_GATEWAY` | `ws://127.0.0.1:35987` | Gateway WebSocket (`CODJ_HUB_URL` also accepted) |
| `CODJ_SESSION_ID` | `default` | Room to join |
| `CODJ_NAME` | `MCP` | Display name in the room |
| `CODJ_SCRIPT` | — | Script file to host + hot-reload; `write_script` persists here |
| `CODJ_ANON` | — | `1` = join without a token (gateway must allow anon) |
| `HYPERY_TOKEN` | — | Use this access token instead of the stored login |

## Tools

- **Registry tools** (one per `codj.*` command; full reference in [`docs/CODJ_API.md`](../../docs/CODJ_API.md)):
  reads — `get_deck`, `list_tracks`, `get_track`, `list_owned`, `get_clock`, `get_room`, `list_instruments`,
  `get_grammar`, `preview_deck`; writes — `send_deck`, `add_track`, `set_steps`, `set_notes`, `set_mix`,
  `set_param`, `set_global`, `remove_track`, `launch_scene`, `say`.
- **Script tools**: `write_script` (replace + hot-reload; the old script is kept if the new one fails to compile
  or its `setup` throws), `read_script`, `run_script` (evaluate a JS snippet against `codj`), `script_logs`,
  `codj_api` (the `.d.ts`), `read_chat`.
- **Legacy aliases**: `get_session_deck` (= `get_deck`), `send_deck_block` (= `send_deck`), `send_direct`
  (a chat message, optionally `to` one peer).

Writes are gated exactly like the host gates them — you own only the tracks you create, and master-scope lines
(`bpm`, `scale`, `swing`, …) need the `master_mixer` skill — and each write result reports what was accepted
and what was rejected and why. See [`examples/codj/`](../../examples/codj/) for scripts.
