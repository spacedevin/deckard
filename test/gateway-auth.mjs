// Gateway identity gate: tokenless joins are refused unless --allow-anon, bogus Hypery tokens are refused always.
// Runs the real gateway (`tish run services/gateway/main.tish`) on random ports with HYPERY_URL pointed at a
// dead address, so token verification fails closed without touching the network.
import { spawn } from "node:child_process";
import { connect } from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  ok   " + name); } else { fail++; console.log("  FAIL " + name); }
}

function startGateway(port, allowAnon) {
  const args = ["run", "services/gateway/main.tish"];
  if (allowAnon) args.push("--allow-anon");
  const child = spawn("node_modules/.bin/tish", args, {
    env: { ...process.env, CODJ_HUB_PORT: String(port), HYPERY_URL: "http://127.0.0.1:1", CODJ_ALLOW_ANON: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  return { child, ready: async () => {
    for (let i = 0; i < 600; i++) {
      if (child.exitCode !== null) return false;
      if (await portOpen(port)) return true;
      await sleep(100);
    }
    return false;
  }, log: () => out };
}

// The gateway's stdout is block-buffered on a pipe, so probe the port instead of waiting for its banner.
function portOpen(port) {
  return new Promise((resolve) => {
    const s = connect(port, "127.0.0.1");
    s.once("connect", () => { s.destroy(); resolve(true); });
    s.once("error", () => resolve(false));
  });
}

function joinOnce(port, extra) {
  return new Promise((resolve) => {
    const ws = new WebSocket("ws://127.0.0.1:" + port);
    const done = (v) => { try { ws.close(); } catch {} resolve(v); };
    const timer = setTimeout(() => done({ type: "timeout" }), 8000);
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", sessionId: "auth-test", actorId: "agent-t", skillIds: [], displayName: "T", kind: "agent", ...extra }));
    ws.onmessage = (e) => {
      const m = JSON.parse(String(e.data));
      if (m.type === "joined" || m.type === "error") { clearTimeout(timer); done(m); }
    };
    ws.onerror = () => { clearTimeout(timer); done({ type: "socket-error" }); };
  });
}

const base = 36000 + Math.floor(Math.random() * 2000);
const strict = startGateway(base, false);
const open = startGateway(base + 1, true);
try {
  const up = (await strict.ready()) && (await open.ready());
  check("gateways start", up);
  if (!up) console.log(strict.log() + "\n" + open.log());

  const anon = await joinOnce(base, {});
  check("tokenless join refused without --allow-anon", anon.type === "error" && anon.code === "AUTH");

  const bogus = await joinOnce(base, { token: "not-a-real-token" });
  check("bogus token refused", bogus.type === "error" && bogus.code === "AUTH");

  const allowed = await joinOnce(base + 1, {});
  check("tokenless join accepted with --allow-anon", allowed.type === "joined");

  const bogusOpen = await joinOnce(base + 1, { token: "not-a-real-token" });
  check("bogus token refused even with --allow-anon", bogusOpen.type === "error" && bogusOpen.code === "AUTH");
} finally {
  strict.child.kill();
  open.child.kill();
}

console.log("\nPASS=" + pass + " FAIL=" + fail);
process.exit(fail > 0 ? 1 : 0);
