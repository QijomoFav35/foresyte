import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { encodeFunctionData } from "viem";
import { evmOutputSchema, proposeEvm } from "./paybox.js";

const GAMMA = "https://gamma-api.polymarket.com";
const DATA = "https://data-api.polymarket.com";
const CTF = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function fetchJson(url: string, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

serveStdio(() => {
  const server = new McpServer(
    { name: "odds-agent", version: "1.0.0" },
    { supportedProtocolVersions: ["2026-07-28"] },
  );

  // 1. Search markets
  server.registerTool(
    "search_markets",
    {
      title: "Search Polymarket markets",
      description: "Search active Polymarket markets by keyword. Returns question, odds, volume, and end date.",
      inputSchema: z.object({ query: z.string().min(1).max(100) }).strict(),
    },
    async ({ query }) => {
      const url = `${GAMMA}/markets?active=true&closed=false&limit=8&query=${encodeURIComponent(query)}`;
      const markets = await fetchJson(url);
      const list = (Array.isArray(markets) ? markets : []).slice(0, 6).map((m: any) => ({
        question: m.question,
        slug: m.slug,
        outcomes: m.outcomes,
        outcomePrices: m.outcomePrices,
        volume: m.volume,
        endDate: m.endDate,
        conditionId: m.conditionId,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  // 2. Check unclaimed positions
  server.registerTool(
    "check_unclaimed",
    {
      title: "Check unclaimed Polymarket winnings",
      description: "Given a wallet address, returns resolved markets where the user may have unclaimed positions.",
      inputSchema: z.object({ wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).strict(),
    },
    async ({ wallet }) => {
      const url = `${DATA}/positions?user=${wallet.toLowerCase()}&limit=50`;
      let positions: any[] = [];
      try {
        const data = await fetchJson(url);
        positions = Array.isArray(data) ? data : data.positions || [];
      } catch {
        positions = [];
      }
      const claimable = positions.filter((p) => p.resolved === true || p.redeemable === true || p.status === "resolved");
      const summary = claimable.slice(0, 10).map((p) => ({
        market: p.title || p.question || p.market,
        conditionId: p.conditionId,
        outcome: p.outcome,
        size: p.size || p.currentValue,
        resolved: true,
      }));
      const text = summary.length
        ? `Found ${summary.length} potentially claimable position(s):\n${JSON.stringify(summary, null, 2)}`
        : "No clearly claimable positions found for this wallet (or data unavailable).";
      return { content: [{ type: "text", text }] };
    },
  );

  // 3. Pattern summary
  server.registerTool(
    "pattern_summary",
    {
      title: "Personal prediction pattern summary",
      description: "Pulls recent activity for a wallet and returns simple pattern notes (category lean, recent results).",
      inputSchema: z.object({ wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).strict(),
    },
    async ({ wallet }) => {
      const url = `${DATA}/activity?user=${wallet.toLowerCase()}&limit=30`;
      let activity: any[] = [];
      try {
        const data = await fetchJson(url);
        activity = Array.isArray(data) ? data : [];
      } catch {
        activity = [];
      }
      const notes: string[] = [];
      if (activity.length === 0) {
        notes.push("No recent activity found for this wallet.");
      } else {
        notes.push(`Reviewed ${activity.length} recent actions.`);
        const sports = activity.filter((a) => /sport|nfl|nba|soccer|football/i.test(JSON.stringify(a))).length;
        if (sports > activity.length * 0.4) notes.push("Heavy activity on sports markets.");
        notes.push("Tip: avoid late entries into low-volume markets if that pattern has lost before.");
      }
      return { content: [{ type: "text", text: notes.join("\n") }] };
    },
  );

  // 4. Propose claim (EVM proposal)
server.registerTool(
  "propose_claim",
  {
    title: "Propose Polymarket claim",
    description: "Builds an unsigned Polygon redeemPositions transaction for a resolved position. PayBox handles approval and signing.",
    inputSchema: z
      .object({
        conditionId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
        negRisk: z.boolean().optional().default(false),
      })
      .strict(),
    outputSchema: evmOutputSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  async ({ conditionId, negRisk }) => {
    const data = encodeFunctionData({
      abi: [
        {
          name: "redeemPositions",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "collateralToken", type: "address" },
            { name: "parentCollectionId", type: "bytes32" },
            { name: "conditionId", type: "bytes32" },
            { name: "indexSets", type: "uint256[]" },
          ],
          outputs: [],
        },
      ],
      functionName: "redeemPositions",
      args: [
        USDC_E as `0x${string}`,
        ZERO_BYTES32 as `0x${string}`,
        conditionId as `0x${string}`,
        [1n, 2n],
      ],
    });

    return proposeEvm({
      chain: "eip155:137",
      to: negRisk
        ? "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296"
        : CTF,
      value: "0",
      data,
    });
  },
);
