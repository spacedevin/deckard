---
title: Install & run
description: Dev server, static build, and deploy overview.
---

## Prerequisites

- **Node 22.x** (see `engines` in `package.json`)
- **pnpm 9.15.4** (pinned via `packageManager`) or npm
- A `tish` CLI from `@tishlang/tish` (installed by postinstall)

## Dev

```bash
npm install      # or pnpm install
npm run dev      # Vite — opens the DAW; edits to .tish hot-reload the page
```

Click **Play** once to unlock audio.

## Production static site (deckard.lol)

```bash
npm run build:docs     # generate /docs HTML + llms-full.txt
npm run build:static   # compile DAW + assemble ./build (includes public/docs)
npm run serve:static   # http://localhost:3456
```

`build:static` produces `./build` with the DAW at `/` and docs at `/docs/`. DigitalOcean App Platform deploys that folder (see [DEPLOY.md](https://github.com/spacedevin/deckard/blob/main/DEPLOY.md)).

## Tests

```bash
npm test
```

Headless smoke covers deck round-trip, streaming, skills, and co-DJ permissions.
