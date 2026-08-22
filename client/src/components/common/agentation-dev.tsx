import dynamic from "next/dynamic";

// Agentation is a dev-only visual feedback overlay: click elements on the page,
// add notes, and hand structured context to the coding agent. We gate it on
// NODE_ENV so the branch is statically dead in production builds (the dynamic
// import is never referenced, so the package stays out of the prod bundle), and
// load it client-side only since it touches the DOM/clipboard.
const Agentation =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), {
        ssr: false,
      })
    : null;

// Local agentation-mcp server. The overlay POSTs annotations here; Claude Code
// reads them via the same server's MCP tools (Agent Sync).
const AGENT_SYNC_ENDPOINT = "http://localhost:4747";

export function AgentationDev() {
  if (!Agentation) return null;
  return <Agentation endpoint={AGENT_SYNC_ENDPOINT} />;
}
