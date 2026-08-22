"use client";

import dynamic from "next/dynamic";

const Agentation = dynamic(
  () => import("agentation").then((mod) => mod.Agentation),
  { ssr: false }
);

// Local agentation-mcp server the overlay POSTs annotations to (Claude Code
// reads them back via the same server's MCP tools). Must match the client app
// (client/src/components/common/agentation-dev.tsx) so both feed one server.
// Without this prop the overlay stays "disconnected" and never creates a
// session — which is why admin annotations weren't reaching the MCP.
const AGENT_SYNC_ENDPOINT = "http://localhost:4747";

export function AgentationProvider() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <Agentation endpoint={AGENT_SYNC_ENDPOINT} />;
}
