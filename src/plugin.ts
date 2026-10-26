// Foresyte: tells you if a Polymarket market is a trap before you buy, and when to get out while you can.
// Each tool lives in src/tools; all math lives in src/lib (pure, unit-tested).

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { registerTrapCheck } from "./tools/trapCheck.ts";
import { registerTrapWatch } from "./tools/trapWatch.ts";
import { registerCheckUnclaimed } from "./tools/unclaimed.ts";
import { registerProposeClaim } from "./tools/proposeClaim.ts";
import { registerPatternSummary } from "./tools/patternSummary.ts";
import { registerDeepScan } from "./tools/deepScan.ts";

// How agents should use Foresyte (PayBox starter 1.0.4 shows tools instructions here)
const INSTRUCTIONS = [
  "Foresyte checks Polymarket markets for traps. It reads public data only and never places, blocks or signs a bet.",
  "Before someone buys: call trap_check with the market link, the outcome and their amount. While they hold: call trap_watch with their wallet. For their history: pattern_summary.",
  "If they paste a Foresyte code (FSY-XXXXXX) or ask for a deep scan or full audit: call deep_scan. It costs 0.10 USDC, paid on Solana by default; use payWith base only if they ask or have no USDC on Solana. After payment, show the report text exactly as written.",
  "Show the person Foresyte's text as written. Never round, change or invent a number. Lead with the worst case. This is information, not financial advice.",
].join(" ");

serveStdio(() => {
  const server = new McpServer(
    { name: "foresyte", version: "1.2.0" },
    {
      supportedProtocolVersions: ["2026-07-28"],
      instructions: INSTRUCTIONS,
    },
  );
  registerTrapCheck(server);
  registerTrapWatch(server);
  registerCheckUnclaimed(server);
  registerProposeClaim(server);
  registerPatternSummary(server);
  registerDeepScan(server);
  return server;
}, { legacy: "reject" });
