// Ensures the agentation Agent Sync server (HTTP on :4747 + MCP on stdio) is
// running before `next dev` starts, so the in-app feedback overlay connects
// (green dot) automatically and Claude Code can read annotations back.
//
// `agentation-mcp server` starts BOTH halves, and on EADDRINUSE it silently
// drops the HTTP half and keeps the MCP bridge pointed at :4747. So whoever
// loses the port race becomes a bridge to nothing — which is why a bare TCP
// probe is not enough: we verify GET /health actually answers, then wait for
// the spawned server to be reachable before handing off to `next dev`.
//
// Exactly one process owns :4747. Claude Code's own MCP entry also runs
// `agentation-mcp server`; when this script already holds the port, that
// instance correctly degrades to an MCP-only bridge. Server output goes to
// LOG_FILE. Kill it with `pkill -f "agentation-mcp server"`.
//
// Twin of admin/scripts/ensure-agentation.cjs — keep them in sync.
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const PORT = 4747;
const LOG_FILE = path.join(os.tmpdir(), "agentation-server.log");
const READY_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// "ok" = our server answered /health; "foreign" = something else holds the
// port; "down" = nothing listening.
function probe(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: "127.0.0.1", port: PORT, path: "/health", timeout: timeoutMs },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body).status === "ok" ? "ok" : "foreign");
          } catch {
            resolve("foreign");
          }
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve("foreign");
    });
    req.on("error", () => resolve("down"));
  });
}

// Prefer the pinned local binary so we never re-enter npx; two concurrent
// `npx -y agentation-mcp` runs share one cache dir and can tear each other
// down mid-run. Falls back to npx where the package isn't a local dep.
function serverCommand() {
  const local = path.join(__dirname, "..", "node_modules", ".bin", "agentation-mcp");
  if (fs.existsSync(local)) {
    return { command: local, args: ["server", "--port", String(PORT)] };
  }
  return {
    command: "npx",
    args: ["-y", "agentation-mcp", "server", "--port", String(PORT)],
  };
}

(async () => {
  const state = await probe();

  if (state === "ok") {
    console.log(`[agentation] already running on :${PORT}`);
    return;
  }

  if (state === "foreign") {
    console.warn(
      `[agentation] :${PORT} is held by something that is not an agentation server — ` +
        `not starting one. Free the port, then restart dev.`,
    );
    return;
  }

  const { command, args } = serverCommand();
  console.log(`[agentation] starting server on :${PORT} …`);

  const log = fs.openSync(LOG_FILE, "a");
  const child = spawn(command, args, {
    detached: true,
    stdio: ["ignore", log, log],
  });
  child.on("error", (err) => {
    console.warn(`[agentation] failed to spawn server: ${err.message}`);
  });
  child.unref();

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    if ((await probe()) === "ok") {
      console.log(`[agentation] ready on :${PORT} (pid ${child.pid})`);
      return;
    }
  }

  // Never fail `npm run dev` over the overlay — just say where to look.
  console.warn(
    `[agentation] server did not become ready within ${READY_TIMEOUT_MS / 1000}s; ` +
      `see ${LOG_FILE}. Continuing without the overlay.`,
  );
})();
