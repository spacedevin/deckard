#!/usr/bin/env node
/**
 * Co-DJ agent worker (Node.js): connects to gateway, handles direct, human play.
 * Event-driven WebSocket — no polling. Run: node index.js
 * Env: GRADIENT_MODEL_ACCESS_KEY, CODJ_AGENT_RECONNECT_MS (pass via shell)
 */
const WebSocket = require('ws');

// Config
let actorId = 'agent-1';
let hub = 'ws://127.0.0.1:35987';
let session = 'default';
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--actor-id' && argv[i + 1]) { actorId = argv[i + 1]; i++; }
  else if (argv[i] === '--lane' && argv[i + 1]) { actorId = 'agent-' + argv[i + 1]; i++; }
  else if (argv[i] === '--hub' && argv[i + 1]) { hub = argv[i + 1]; i++; }
  else if (argv[i] === '--session' && argv[i + 1]) { session = argv[i + 1]; i++; }
}

const SKILL_IDS = ['add_track', 'adjust_instrument', 'pattern_steps', 'pattern_piano', 'channel_mix'];
const reconnectMs = parseInt(process.env.CODJ_AGENT_RECONNECT_MS || '3000', 10);
const exitOnClose = process.env.CODJ_AGENT_EXIT_ON_CLOSE === '1';

function buildDemoPatch(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('euclid') || lower.includes('hat') || lower.includes('hihat')) {
    return `tpl 1\ntrack AgentHat id ${actorId}_hat gen noise_burst\n  noise attack 0.001 decay 0.04 tone 0.9 pitch_follow 0.1\n  steps euclid 5 16`;
  }
  if (lower.includes('bass') || lower.includes('fm')) {
    return `tpl 1\ntrack AgentBass id ${actorId}_bass gen fm\n  fm ratio 2 mod_index 5 carrier sine mod square\n  adsr a 0.01 d 0.1 s 0.3 r 0.15\n  steps x . x . x . x . x . x . x . x .`;
  }
  return null;
}

// Human play flow
let playingActorId = null;
let humanLineBuffer = [];
let lastLineAt = 0;
let respondedSincePlay = false;
const DEBOUNCE_MS = 1300;

function streamChunkThenBlock(ws, lines, perfStep) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const text = lines.join('\n');
  for (let i = 0; i < text.length; i++) {
    ws.send(JSON.stringify({ type: 'tpl.stream_chunk', actorId, authorId: actorId, chunk: text[i] }));
  }
  ws.send(JSON.stringify({
    type: 'tpl.block',
    actorId,
    authorId: actorId,
    lines,
    effectivePerfStep: perfStep,
    asap: true
  }));
}

function handleHumanStream(ws) {
  const demo = buildDemoPatch('euclid hi-hat');
  if (!demo) return;
  const lines = demo.split('\n');
  console.log('[agent] play response: streaming', lines.length, 'lines ->', playingActorId || '?');
  streamChunkThenBlock(ws, lines, 0);
  console.log('[agent] sent tpl.stream_chunk + tpl.block');
}

let debounceTimer = null;

function connect() {
  const url = hub.endsWith('/') ? hub.slice(0, -1) : hub;
  console.log('[agent] connecting to', url);

  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('[agent] WebSocket connected, sending join');
    ws.send(JSON.stringify({
      type: 'join',
      sessionId: session,
      actorId,
      channelIds: ['default'],
      skillIds: SKILL_IDS
    }));
    console.log('[agent] joined', session, 'as', actorId);
  });

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      return;
    }
    if (!msg || !msg.type) return;

    if (msg.type === 'presence') {
      const al = msg.actors || [];
      console.log('[agent] presence: actors=' + JSON.stringify(al));
    }
    if (msg.type === 'joined') {
      console.log('[agent] received joined, ready');
    }

    if (msg.type === 'direct') {
      const tgt = msg.targetActorId;
      if (tgt === actorId || (tgt == null && msg.laneId === actorId)) {
        const text = msg.text || 'add hi-hat';
        const demo = buildDemoPatch(text);
        if (demo) {
          const ps = (msg.perfStep != null && typeof msg.perfStep === 'number') ? msg.perfStep : 0;
          ws.send(JSON.stringify({
            type: 'tpl.block',
            actorId,
            authorId: actorId,
            lines: demo.split('\n'),
            effectivePerfStep: ps,
            asap: true
          }));
          console.log('[agent] got direct:', text, '-> sent tpl.block');
        }
      }
    } else if (msg.type === 'control') {
      const op = msg.op || '';
      if (op === 'human_play' || op === 'playing_start') {
        playingActorId = msg.actorId || msg.authorId || null;
        respondedSincePlay = false;
        humanLineBuffer = [];
        lastLineAt = Date.now();
        console.log('[agent] playing_start, buffering tpl.line from', playingActorId || '?');
      } else if (op === 'human_stop' || op === 'playing_stop') {
        playingActorId = null;
        humanLineBuffer = [];
        respondedSincePlay = false;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        console.log('[agent] playing_stop');
      }
    } else if (msg.type === 'tpl.line') {
      const from = msg.actorId || msg.authorId || msg.laneId || '';
      if (playingActorId != null && (from === playingActorId || (playingActorId === '' && from !== actorId))) {
        const line = msg.line;
        if (typeof line === 'string') {
          humanLineBuffer.push(line);
          lastLineAt = Date.now();

          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            debounceTimer = null;
            if (playingActorId != null && !respondedSincePlay && humanLineBuffer.length > 0) {
              respondedSincePlay = true;
              handleHumanStream(ws);
            }
          }, DEBOUNCE_MS);
        }
      }
    }
  });

  ws.on('close', () => {
    console.log('[agent] WebSocket closed');
    if (exitOnClose) {
      process.exit(0);
    }
    console.log('[agent] reconnecting in', reconnectMs, 'ms');
    setTimeout(connect, reconnectMs);
  });

  ws.on('error', (err) => {
    console.error('[agent] WebSocket error:', err.message);
  });
}

connect();
