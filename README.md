# tish-midi

Minimal FL-style hybrid web DAW in **[Tish](https://github.com/tishlang/tish)** (JS target + JSX): step sequencer, piano roll (canvas), mixer (gain, pan, ADSR, mute/solo), per-channel waveform, master waveform scope, JSON import/export.

## Build

Requires the `tish` CLI (from the Tish repo):

```bash
tish compile --target js src/main.tish -o dist/bundle.js
```

Serve the folder (e.g. `npx serve .`) and open `index.html`. Click **Play** once to unlock audio.

## Layout

| Area | Tech |
|------|------|
| Transport, rack, mixer | DOM + CSS |
| Piano roll, scope | `<canvas>` |

## Docs

- [docs/FL_STUDIO_GENERATORS.md](docs/FL_STUDIO_GENERATORS.md) — how this maps to FL-style channel instruments  
- [docs/GENERATORS.md](docs/GENERATORS.md) — adding a new generator module  
- [docs/schema/project-v2.json](docs/schema/project-v2.json) — project shape (v1 `waveform` auto-migrates)  
- [docs/TISH_JS_BUILTINS.md](docs/TISH_JS_BUILTINS.md) — `webAudioCreateContext` / `jsUint8Array`  
- [AGENTS.md](AGENTS.md) — agent editing contract  

## Upstream Tish changes

This project adds JS intrinsics in `tish_compile_js` (`webAudioCreateContext`, `jsUint8Array`) — see `crates/tish_compile_js/src/js_intrinsics.rs`. Rebuild `tish` from a tree that includes those files.
