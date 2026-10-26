import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { Deadline } from "../lib/http.ts";
import { getClosedPositions, getTrades, resolveProxy } from "../lib/polymarket.ts";
import { analyzeHistory, renderReport, type GroupStats, type Insight } from "../lib/history.ts";
import { errorResult, messageOf, money, nowIso, okResult, walletSchema } from "./common.ts";

const inputSchema = z
  .object({
    wallet: walletSchema.describe("The user's Polymarket wallet address (login or proxy wallet)."),
  })
  .strict();

const groupSchema = z.object({
  name: z.string(),
  bets: z.number(),
  stakedUsdc: z.number(),
  netUsdc: z.number(),
  resolved: z.number(),
  wins: z.number(),
  pricedInWinRate: z.number(),
});

const insightSchema = z.object({
  kind: z.enum(["leak", "strength", "habit"]),
  key: z.string(),
  label: z.string(),
  dollars: z.number(),
  finding: z.string(),
  plan: z.string().nullable(),
});

const outputSchema = z.object({
  wallet: z.string(),
  positionsWallet: z.string(),
  enoughData: z.boolean(),
  bets: z.number(),
  trades: z.number(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  stakedUsdc: z.number(),
  netUsdc: z.number(),
  resolved: z.number(),
  wins: z.number(),
  bottomLine: z.string(),
  byTopic: z.array(groupSchema),
  byPrice: z.array(groupSchema),
  byMarketType: z.array(groupSchema),
  leaks: z.array(insightSchema),
  strengths: z.array(insightSchema),
  habits: z.array(insightSchema),
  plan: z.array(z.string()),
  shareLine: z.string(),
  checkedAt: z.string(),
});

const groupOut = (g: GroupStats) => ({
  name: g.name,
  bets: g.bets,
  stakedUsdc: money(g.staked),
  netUsdc: money(g.net),
  resolved: g.resolved,
  wins: g.wins,
  pricedInWinRate: Math.round(g.avgEntry * 1000) / 1000,
});

const insightOut = (i: Insight) => ({
  kind: i.kind,
  key: i.key,
  label: i.label,
  dollars: money(i.dollars),
  finding: i.finding,
  plan: i.plan ?? null,
});

export function registerPatternSummary(server: McpServer) {
  server.registerTool(
    "pattern_summary",
    {
      title: "Review my Polymarket trading patterns",
      description:
        "Reads the wallet's own Polymarket history (up to 200 closed bets and the last 500 trades) across every kind of market: sports, crypto, politics, economy, world affairs, culture, science. Finds where the money is made and lost by topic, by entry price (longshots to heavy favorites, compared with the odds paid) and by market type (live games, short-term crypto, price targets, deadline markets), plus habits like chasing losses, riding losers to zero and averaging down. Returns a plain-English review with the biggest leaks ranked by dollars and a short plan tied to the numbers. Describes past results; not financial advice. Read-only.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ wallet }) => {
      const deadline = new Deadline();
      try {
        const proxy = await resolveProxy(wallet, deadline);
        const [closed, trades] = await Promise.all([
          getClosedPositions(proxy, deadline),
          getTrades(proxy, deadline).catch(() => []),
        ]);
        const report = analyzeHistory(closed, trades);
        return okResult(renderReport(report), {
          wallet,
          positionsWallet: proxy,
          enoughData: report.enoughData,
          bets: report.bets,
          trades: report.trades,
          from: report.from,
          to: report.to,
          stakedUsdc: money(report.staked),
          netUsdc: money(report.net),
          resolved: report.resolved,
          wins: report.wins,
          bottomLine: report.bottomLine,
          byTopic: report.categories.map(groupOut),
          byPrice: report.bands.map(groupOut),
          byMarketType: report.kinds.map(groupOut),
          leaks: report.leaks.map(insightOut),
          strengths: report.strengths.map(insightOut),
          habits: report.habits.map(insightOut),
          plan: report.plan,
          shareLine: report.shareLine,
          checkedAt: nowIso(),
        });
      } catch (error) {
        return errorResult(`Couldn't read this wallet's history: ${messageOf(error)}`);
      }
    },
  );
}
