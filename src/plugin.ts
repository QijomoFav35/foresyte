// Foresyte: tells you if a Polymarket market is a trap before you buy, and when to get out while you can.
// Each tool lives in src/tools; all math lives in src/lib (pure, unit-tested).

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTrapCheck } from "./tools/trapCheck.ts";
import { registerTrapWatch } from "./tools/trapWatch.ts";
import { registerCheckUnclaimed } from "./tools/unclaimed.ts";
import { registerProposeClaim } from "./tools/proposeClaim.ts";

serveStdio(() => {
  const server = new McpServer(
    { name: "foresyte", version: "1.1.0" },
    { supportedProtocolVersions: ["2026-07-28"] },
  );
  registerTrapCheck(server);
  registerTrapWatch(server);
  registerCheckUnclaimed(server);
  registerProposeClaim(server);
  return server;
});
