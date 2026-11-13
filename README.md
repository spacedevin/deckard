# Deckard

A **token-streamed, live-coding DAW** in **[Tish](https://github.com/tishlang/tish)** (JS target + JSX).
Humans and LLM agents **co-DJ** by streaming a small line-oriented language (**deck**) that the app
**decodes into live-synthesised stems** — never WAV/audio files. *MIDI × live-coding, designed for LLM
token streams, with a traditional DAW on top.*

FL-style surfaces sit on top of the language: step sequencer, piano roll (canvas), per-channel
**generator instruments** (basic osc / noise burst / FM / matrix FM) with per-generator ADSR, a
track → actor → master mixer (gain / pan / 3-band EQ / mute / solo), Ableton-style session/scene
launcher, master scope, and JSON + deck import/export.

**New here?** Read **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — the full overview, vision, and
end-to-end signal path. Run the tests with `npm test`.

## Dev

```bash
npm install      # one-time (Vite + tish CLI)
npm run dev      # Vite dev server — save a .tish file and the browser auto-reloads
```

`npm run dev` runs **Vite** with a small local plugin ([`vite-plugin-tish.js`](vite-plugin-tish.js))
that compiles `src/main.tish` → `dist/bundle.js` with `tish build --target js` and full-reloads on any
`.tish` / `styles.css` change. (Lattish re-mounts the whole tree each render, so a full reload is the
right strategy — there's no HMR state to preserve.) Open the printed URL and click **Play** once to
unlock audio.

## Build

Requires the `tish` CLI (from the Tish repo).

```bash
npm run build    # tish build --target js src/main.tish -o dist/bundle.js
npm run serve    # static-serve the built folder (npx serve .)
npm test         # headless smoke test (deck round-trip, streaming, skills, permissions)
```

JSX is built into `tish build --target js` and lowers to Lattish runtime calls — no separate JSX flag.
Click **Play** once to unlock audio.

## Layout

| Area | Tech |
|------|------|
| Transport, rack, mixer | DOM + CSS |
| Piano roll, scope | `<canvas>` |

**Reachability:** `src/main.tish` → `ui/App.tish` pulls in model, audio, schedule, generators, `@spacedevin/deck` + `src/deckfile/` (apply/emit/stream), and Lattish.

## Co-DJ (WebSocket + actors)

AI co-DJs are **agents that write code**: each one runs a small JS script against the `codj.*` API
([docs/CODJ_API.md](docs/CODJ_API.md)) — hooks that fire every bar/beat and on chat — and a Hypery-powered agent
rewrites that script as the set evolves. The host publishes every change as deck, so each co-DJ always sees the
whole room.

### In the browser (no setup)

1. Run the app (`npm run serve`, open **http://localhost:3456**) or use deckard.lol.
2. **Co-DJ** panel → **Log in with Hypery**.
3. **Add AI co-DJ** (or **Add script co-DJ** to write the script yourself). Press **Play**; talk to it in the chat
   (`@Name make the hats busier`). Without a gateway the page hosts the co-DJs itself.

### Headless (CLI / MCP)

1. **Terminal A — gateway:** `npm run gateway` (**ws://127.0.0.1:35987**; joins need a Hypery token unless the
   gateway runs with `--allow-anon`).
2. **Sign in once:** `npm run build:codj-cli && npm run codj:login` (opens a Hypery sign-in page; stored in
   `~/.deckard/credentials.json`).
3. **Terminal B — a co-DJ:** `npm run agent:client` (Hypery agent + script), or run a script you wrote:
   `npm run codj -- run examples/codj/hat-evolver.js`. The script file hot-reloads on save, so Cursor / Claude
   can edit it directly; or connect them through the MCP server ([services/mcp/README.md](services/mcp/README.md)).
4. In the app: **Co-DJ** panel → **Connect** (session `default`) → **Play**.

**Token stream demo** (see [docs/TOKEN_STREAM_DEMO.md](docs/TOKEN_STREAM_DEMO.md)): `npm run token-demo` — gateway + bot stream.

Specs: [docs/WS_AND_AGENTS.md](docs/WS_AND_AGENTS.md), [docs/STREAM_PROTOCOL.md](docs/STREAM_PROTOCOL.md), [docs/AUTHOR_TAGGING.md](docs/AUTHOR_TAGGING.md), [docs/DJ_SKILLS.md](docs/DJ_SKILLS.md), [docs/CONTROLLER_PROFILES.md](docs/CONTROLLER_PROFILES.md).

**Web MIDI**: note-on on MIDI channels maps note % 8 → channel index for **temporary gain overlay** (hear without committing deck).

## Docs

**Published (deckard.lol):** [https://deckard.lol/docs/](https://deckard.lol/docs/) · [`/llms.txt`](https://deckard.lol/llms.txt) · [`/llms-full.txt`](https://deckard.lol/llms-full.txt)

Build locally with `npm run build:docs` (also runs as part of `build:static` / `dev`). Sources live in [`content/docs/`](content/docs/) plus the canonical markdown under [`docs/`](docs/).

**In-repo:**

- [llms.txt](llms.txt) — llmstxt.org index for agents in a checkout  
- [AGENTS.md](AGENTS.md) — agent editing contract  
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — overview, vision, subsystem map  
- [`@spacedevin/deck` grammar](node_modules/@spacedevin/deck/docs/DECK_GRAMMAR.md) — canonical language
- [docs/DECK_GRAMMAR.md](docs/DECK_GRAMMAR.md) — Deckard overlay (UI / ownership / clamps)  
- [docs/DECK_AGENT_GRAMMAR.md](docs/DECK_AGENT_GRAMMAR.md) — co-DJ lane subset  
- [docs/GENERATORS.md](docs/GENERATORS.md) — adding a new generator module  
- [docs/schema/project-v2.json](docs/schema/project-v2.json) — project shape  
- [docs/FL_STUDIO_GENERATORS.md](docs/FL_STUDIO_GENERATORS.md) — FL-style mapping  
- [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md) — `new` for JS  
- [docs/LATTISH.md](docs/LATTISH.md) — Lattish hooks + `h()`

## Upstream Tish changes

Deckard relies on Tish’s **`new`** support for the JS target (`new AudioContext()`, `new Uint8Array(n)`). Use a `tish` build that includes the `new` expression in the compiler.

<!-- tish-test-dogfood -->
## Testing

- `npm test` — **JS-emit** suites (`tish build --target js` + node) plus the architecture ratchet. This is the browser-DAW contract.
- `npm run test:tish` — native `tish test` on `test/*.test.tish` (language-semantics). **Currently blocked** on the Tish VM because product sources still reference JS `undefined` (works under emit+node). Keep the JS leg; do not treat VM pass/fail as emit parity.
