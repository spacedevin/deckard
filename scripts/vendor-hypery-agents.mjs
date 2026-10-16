#!/usr/bin/env node
// Bundles the Hypery agent core (@hyperyai/sdk/agents → runAgentLoop, createHyperyModel, …) into a classic script
// for the browser co-DJ worker: public/vendor/hypery-agents.js defines `self.HyperyAgents`. The worker is a Tish
// JS-target build (no dynamic import, no bare-specifier resolution), so it loads this with importScripts().
//
//   node scripts/vendor-hypery-agents.mjs

import { rolldown } from 'rolldown';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));
const input = join(dirname(require.resolve('@hyperyai/sdk/package.json')), 'dist/agents/core/index.js');
const file = join(root, 'public/vendor/hypery-agents.js');
mkdirSync(dirname(file), { recursive: true });

const bundle = await rolldown({ input, platform: 'browser' });
await bundle.write({ file, format: 'iife', name: 'HyperyAgents', minify: true, banner: '/* @hyperyai/sdk/agents core — vendored by scripts/vendor-hypery-agents.mjs */' });
console.log('wrote', file.replace(root + '/', ''));
