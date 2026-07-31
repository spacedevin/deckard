# Deckard MCP Server (Pure Tish)

This is a zero-dependency Model Context Protocol (MCP) server for Deckard, written in pure Tish (`.tish`).
It allows external LLMs (like Claude Desktop or Cursor) to natively view and edit the live session in Deckard.

## How it works

The server operates over standard Stdio (using `process.stdin` / `process.stdout`) and communicates with the Deckard Gateway (`ws://127.0.0.1:35987`) using the built-in Node.js v22+ WebSocket global object.

Because it relies on Node built-ins for Stdio and WebSockets, it has **zero NPM dependencies**. No `package.json` is required.

## Installation / Compilation

To use this MCP server, simply compile the Tish source file into vanilla JavaScript:
```bash
tish build --target js services/mcp/main.tish -o services/mcp/mcp.js
```

## Configuring your LLM UIs

### Cursor IDE
1. Open Cursor Settings.
2. Go to **Features** -> **MCP**.
3. Click **+ Add New MCP Server**.
4. Set:
   - **Name**: `deckard-mcp`
   - **Type**: `command`
   - **Command**: `node /absolute/path/to/tish-midi/services/mcp/mcp.js`
5. Save and reload. Cursor's Composer will now have access to the live DAW!

### Claude Desktop
Add this to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "deckard-mcp": {
      "command": "node",
      "args": [
        "/absolute/path/to/tish-midi/services/mcp/mcp.js"
      ]
    }
  }
}
```

## Exposed Tools

- `get_session_deck`: Reads the current live deck buffer. Your LLM can use this to understand what tracks, synths, and patterns are currently playing in the session.
- `send_deck_block`: Emits a block of deck to the gateway. This will instantly change the synth parameters, sequence, or mix in the live DAW.
- `send_direct`: Sends a natural language string (e.g., "add a heavy kick drum") to Deckard's internal `agent-worker`.
