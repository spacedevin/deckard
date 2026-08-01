---
title: Deckard Documentation
description: Token-streamed live-coding DAW — humans and LLM agents co-DJ in deck.
---

**Deckard** is a browser DAW written in [Tish](https://tishlang.com). Humans and LLM agents **co-DJ** by streaming a small line-oriented language called **deck**. The app decodes deck into live-synthesised stems — never WAV/audio files.

## Start here

- **Humans:** [Install & run](/docs/getting-started/install/) → [Co-DJ quickstart](/docs/getting-started/co-dj/)
- **Agents / LLMs:** read [`/llms.txt`](/llms.txt) first, then [Agent contract](/docs/agents/overview/) and [Agent grammar](/docs/deck/agent-grammar/)
- **Language reference:** [deck overview](/docs/deck/overview/) → [full grammar](/docs/deck/grammar/)

## Naming (do not confuse these)

| Term | Meaning |
|------|---------|
| **Deckard** | The DAW product / this app |
| **deck** | The streamable patch language (`.deck` files, header `deck 1`) |
| **DJ deck A/B/C/D** | Player lanes in the mixer (`deck A` inside a track body) |

## Mental model

1. Every UI edit **round-trips through deck** (emit → apply). The UI is a deck client.
2. Co-DJ peers speak deck over WebSocket (`deck.line`, `deck.block`, `deck.stream_chunk`).
3. Agents compose prompts from [skills](/docs/agents/roles/) + [agent grammar](/docs/deck/agent-grammar/) and are gated by [DJ skills](/docs/agents/skills/).
4. Beats are **quarter notes**. Step `i` (0–15) = beat `i * 0.25` in a 4/4 bar.

## LLM entry points

- [`/llms.txt`](/llms.txt) — curated index (llmstxt.org)
- [`/llms-full.txt`](/llms-full.txt) — concatenated docs for large context
- Repo checkout: root `llms.txt` + `AGENTS.md` + `docs/`
