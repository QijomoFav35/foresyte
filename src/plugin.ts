import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import * as z from "zod/v4";
import { encodeFunctionData } from "viem";
import { evmOutputSchema, proposeEvm } from "./paybox.js";
import { DATA, GAMMA, getJson, marketUrl, money, num, resolveProxy } from "./lib/polymarket.js";
import { registerTrapCheck } from "./trapCheck.js";
import { registerTrapWatch } from "./trapWatch.js";

const CTF = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

serveStdio(() => {
  const server = new McpServer(
    { name: "foresyte", version: "1.1.0" },
    { supportedProtocolVersions: ["2026-07-28"] },
  );

  server.registerTool(
    "search_markets",
    {
      title: "Search Polymarket markets",
      description: "Search active Polymarket markets by keyword. Returns question, odds, volume, and end date.",
      inputSchema: z.object({ query: z.string().min(1).max(100) }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ query }) => {
      try {
        const url = `${GAMMA}/markets?active=true&closed=false&limit=8&query=${encodeURIComponent(query)}`;
        const markets = await getJson(url);
        const list = (Array.isArray(markets) ? markets : []).slice(0, 6).map((m: any) => ({
          question: m.question,
          slug: m.slug,
          outcomes: m.outcomes,
          outcomePrices: m.outcomePrices,
          volume: m.volume,
          endDate: m.endDate,
          conditionId: m.conditionId,
        }));
        return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err?.message ?? String(err) }] };
      }
    },
  );

  server.registerTool(
    "check_unclaimed",
    {
      title: "Check unclaimed Polymarket winnings",
      description:
        "Scans a wallet (via Polymarket proxy if needed) for redeemable positions with positive value. Returns a plain total and Polymarket claim links. Does not claim.",
      inputSchema: z.object({ wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ wallet }) => {
      try {
        const proxy = await resolveProxy(wallet);
        const data = await getJson(`${DATA}/positions?user=${proxy}&limit=50`);
        const positions: any[] = Array.isArray(data) ? data : data?.positions || [];
        const claimable = positions
          .filter((p) => p.redeemable === true && num(p.currentValue) > 0)
          .slice(0, 10)
          .map((p) => ({
            market: p.title || p.question || "Untitled market",
            conditionId: p.conditionId,
            outcome: p.outcome,
            size: p.size,
            valueUsdc: num(p.currentValue),
            proxy,
            negativeRisk: p.negativeRisk ?? p.negRisk ?? false,
            slug: p.slug,
            link: marketUrl(p.slug, p.conditionId),
          }));

        const total = claimable.reduce((s, p) => s + (Number.isFinite(p.valueUsdc) ? p.valueUsdc : 0), 0);
        const n = claimable.length;

        let text: string;
        if (n === 0) {
          text = `Foresyte found $0.00 in unclaimed winnings for ${proxy}. Nothing to claim right now.`;
        } else {
          const links = claimable.map((p) => `- ${p.market} ($${money(p.valueUsdc)}): ${p.link}`).join("\n");
          text = `Foresyte found $${money(total)} in unclaimed winnings across ${n} market${n === 1 ? "" : "s"}. Claim them on Polymarket:\n${links}\n\nNote: One-tap claim from PayBox only works if these positions sit in your PayBox wallet. Most Polymarket accounts hold positions in a Proxy/Safe wallet — use the links above.`;
        }

        return {
          content: [{ type: "text", text }],
          structuredContent: { proxy, totalUsdc: total, count: n, positions: claimable },
        };
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err?.message ?? String(err) }] };
      }
    },
  );

  server.registerTool(
    "propose_claim",
    {
      title: "Propose Polymarket claim (PayBox wallet only)",
      description:
        "Builds an unsigned Polygon redeemPositions proposal ONLY when the given PayBox wallet itself holds the redeemable position. Refuses with an explanation and Polymarket link for Proxy/Safe accounts (most users).",
      inputSchema: z
        .object({
          wallet: z
            .string()
            .regex(/^0x[0-9a-fA-F]{40}$/)
            .describe("PayBox wallet address that should hold the position"),
          conditionId: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
          negativeRisk: z.boolean().optional().default(false),
        })
        .strict(),
      outputSchema: evmOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ wallet, conditionId, negativeRisk }) => {
      try {
        const addr = wallet.toLowerCase();
        const data = await getJson(`${DATA}/positions?user=${addr}&limit=50`);
        const positions: any[] = Array.isArray(data) ? data : data?.positions || [];
        const hit = positions.find(
          (p) =>
            String(p.conditionId || "").toLowerCase() === conditionId.toLowerCase() &&
            p.redeemable === true &&
            num(p.currentValue) > 0,
        );

        if (!hit) {
          const proxy = await resolveProxy(wallet);
          const link = "https://polymarket.com/portfolio";
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Cannot propose a one-tap claim from PayBox wallet ${wallet}. No redeemable position for this conditionId sits in that address (checked without proxy redirect). Polymarket Proxy/Safe accounts must claim on Polymarket itself: ${link}. Resolved proxy for info only: ${proxy}.`,
              },
            ],
          };
        }

        const neg = Boolean(negativeRisk ?? hit.negativeRisk ?? hit.negRisk ?? false);
        const calldata = encodeFunctionData({
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
          to: neg ? "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296" : CTF,
          value: "0",
          data: calldata,
        });
      } catch (err: any) {
        return { isError: true, content: [{ type: "text", text: err?.message ?? String(err) }] };
      }
    },
  );

  registerTrapCheck(server);
  registerTrapWatch(server);

  return server;
});
