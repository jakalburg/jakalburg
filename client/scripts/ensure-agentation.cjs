// Ensures the agentation Agent Sync server (HTTP on :4747 + MCP on stdio) is
// running before `next dev` starts, so the in-app feedback overlay connects
// (green dot) automatically. No-ops if the port is already served — so running
// both the client and admin dev servers won't spawn duplicates or fight over
// the port. The server is started detached so it persists across dev restarts;
// kill it manually with `pkill -f "agentation-mcp server"` if needed.
//
// Twin of admin/scripts/ensure-agentation.cjs — keep them in sync.
const net = require("net");
const { spawn } = require("child_process");

const PORT = 4747;

function isUp() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port: PORT });
    const done = (up) => {
      socket.destroy();
      resolve(up);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

(async () => {
  if (await isUp()) {
    console.log(`[agentation] already running on :${PORT}`);
    return;
  }
  console.log(`[agentation] starting server on :${PORT} …`);
  const child = spawn("npx", ["-y", "agentation-mcp", "server"], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  console.log(
    `[agentation] started (pid ${child.pid}); refresh the app to connect.`,
  );
})();
