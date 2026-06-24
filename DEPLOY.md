# Deploying to DigitalOcean App Platform

Deckard is a **client-side DAW** — it compiles to a static bundle that runs entirely in the browser and works
offline. The cheapest, simplest way to host it is App Platform's **Static Site** component (CDN-served, free
tier eligible). The optional co-DJ multiplayer gateway is a separate service (see the bottom).

## What gets deployed

`npm run build:static` produces a self-contained `./build` directory:

```
build/
  index.html
  styles.css
  dist/bundle.js          # the compiled Tish app (tish build)
  scope-worker.js         # waveform/meter worker
  clock-worklet.js        # transport clock AudioWorklet
  scratch-worklet.js      # turntable scratch AudioWorklet
  sync-worklet.js
  mespeak-worker.js       # TTS vocal worker
  mespeak/                # mespeak engine + voices (TTS)
```

These mirror the absolute paths the app loads at runtime (`/scope-worker.js`, `/mespeak/mespeak.js`, …), so the
folder can be served as-is by any static host. The build script is [`scripts/build-static.mjs`](scripts/build-static.mjs).

## Verify the build locally first

```bash
npm install
npm run build:static     # compiles + assembles ./build
npm run serve:static     # serves ./build at http://localhost:3456
```

Open http://localhost:3456 — the DAW should boot exactly like `npm run dev`.

## Deploy

Prereqs: the repo is on GitHub (`spacedevin/deckard`, branch `main`) and the **DigitalOcean GitHub app** is
authorized for it (you'll be prompted on first deploy, or install it from the DO console → Settings → Integrations).

### Option A — DO console (no CLI)

1. DO console → **Apps → Create App**.
2. Choose **GitHub** → pick `spacedevin/deckard` → branch `main`.
3. When detected, either accept the auto-detected **Static Site** or click **Edit your App Spec** and paste
   [`.do/app.yaml`](.do/app.yaml).
4. Confirm: **Build command** `npm run build:static`, **Output directory** `build`.
5. Create. Subsequent pushes to `main` auto-deploy (`deploy_on_push`).

### Option B — doctl (CLI)

```bash
doctl apps create --spec .do/app.yaml
# later updates:
doctl apps update <APP_ID> --spec .do/app.yaml
```

## How the build resolves the `tish` compiler

`npm run build` shells out to `tish` (the Tish compiler). That binary is installed by the **postinstall** script
of the `@tishlang/tish` dependency, which downloads the right binary for the build host's OS/arch — so the
install step MUST be allowed to run that script.

- **npm** runs postinstall automatically — nothing to configure.
- **pnpm v10+** made dependency build scripts **opt-in** (it prints `ERR_PNPM_IGNORED_BUILDS: @tishlang/tish` and
  the build fails with no `tish`), and it **no longer reads `pnpm.onlyBuiltDependencies` from `package.json`**.
  **Fix:** `package.json` pins **`"packageManager": "pnpm@9.15.4"`** — pnpm 9 reads `pnpm.onlyBuiltDependencies`
  from `package.json` and runs the `@tishlang/tish` postinstall. The lockfile is `lockfileVersion 9.0` (pnpm-9
  native), so the pin is fully compatible. There is **no `pnpm-workspace.yaml`** — pnpm 9 treats that file as a
  monorepo definition and errors `packages field missing or empty` if it has no `packages:` key (this is not a
  workspace), so the allow-list lives only in `package.json`.
- `engines.node` is pinned to **`22.x`** (the Active LTS) rather than a wide `>=20` range, which the Heroku/DO
  Node buildpack flags as a "dangerous range".

If a build ever fails with `tish: not found` or `ERR_PNPM_IGNORED_BUILDS`, the install skipped the postinstall —
confirm the `packageManager` pin is present, or switch the App Platform build to npm.

## No special headers needed

The app does not use `SharedArrayBuffer`, so it does **not** require cross-origin isolation (COOP/COEP). A plain
static host is sufficient. Fonts load from Google Fonts over HTTPS.

---

## Optional: co-DJ multiplayer gateway

Solo/offline play needs nothing else. **Multiplayer** (the Co-DJ panel) needs the WebSocket gateway in
[`services/gateway/main.tish`](services/gateway/main.tish), which runs on the Tish runtime — not a Node static
build — so it deploys as a separate **Service**, not a static site. To add it:

- It listens on `CODJ_HUB_PORT` (default `35987`); App Platform injects `$PORT`, so run it as
  `CODJ_HUB_PORT=$PORT npm run gateway` (`tish run services/gateway/main.tish`).
- In the deployed app, point the Co-DJ panel's **WS** field at the gateway's public URL (`wss://…`).
- The LLM co-DJ agent ([`services/agent-worker`](services/agent-worker/main.tish)) is a third process; it reads
  `GRADIENT_MODEL_ACCESS_KEY` (DO serverless inference) and falls back to an offline demo patch without a key.

These services need the `tish` runtime on PATH at *run* time (not just build), so a Dockerfile-based service is
the most reliable route for them. They're out of scope for the static-site deploy above.
