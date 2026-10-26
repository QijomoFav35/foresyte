import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { Deadline, PER_REQUEST_MS } from "../lib/http.ts";
import { findMarket, getBook, getPositions, marketLink, resolveProxy } from "../lib/polymarket.ts";
import { assessHolding, openPositions, type HoldingAssessment } from "../lib/traps.ts";
import { combine, usd } from "../lib/verdict.ts";
import { errorResult, levelSchema, messageOf, money, nowIso, okResult, reasonSchema, walletSchema } from "./common.ts";

const inputSchema = z
  .object({
    wallet: walletSchema.describe("The user's Polymarket wallet address (login or proxy wallet)."),
  })
  .strict();

const positionSchema = z.object({
  level: levelSchema,
  title: z.string(),
  outcome: z.string(),
  link: z.string(),
  shares: z.number(),
  costBasisUsdc: z.number(),
  displayedValueUsdc: z.number(),
  pnlUsdc: z.number(),
  sellNowUsdc: z.number(),
  unsellableShares: z.number(),
  daysLeft: z.number().nullable(),
  notes: z.array(z.string()),
  reasons: z.array(reasonSchema),
});

const outputSchema = z.object({
  level: levelSchema,
  wallet: z.string(),
  positionsWallet: z.string(),
  openPositions: z.number(),
  checked: z.number(),
  skipped: z.number(),
  positions: z.array(positionSchema),
  checkedAt: z.string(),
});

const MAX_POSITIONS = 5;

export function registerTrapWatch(server: McpServer) {
  server.registerTool(
    "trap_watch",
    {
      title: "Check my open Polymarket positions for traps",
      description:
        "Run while holding. For the wallet's five largest open Polymarket positions: paper profit or loss, what selling everything right now would actually return, whether buyers are thinning out (exit closing), deadline and rules risk, and when locking in profit beats waiting. Judged from the live order book at the moment of the call; it does not run in the background. Read-only.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ wallet }) => {
      const deadline = new Deadline();
      try {
        const proxy = await resolveProxy(wallet, deadline);
        const all = await getPositions(proxy, deadline, { redeemable: false });
        const open = openPositions(all, MAX_POSITIONS);
        if (open.length === 0) {
          return okResult(`No open Polymarket positions found for ${wallet}.`, {
            level: "CLEAR" as const,
            wallet,
            positionsWallet: proxy,
            openPositions: 0,
            checked: 0,
            skipped: 0,
            positions: [],
            checkedAt: nowIso(),
          });
        }

        // Books and rules for every position in parallel; each request is bounded by the shared deadline.
        const results = await Promise.all(
          open.map(async (position) => {
            if (!deadline.hasTimeFor(PER_REQUEST_MS / 2)) return null;
            const [book, market] = await Promise.all([
              getBook(position.asset, deadline).catch(() => null),
              position.slug ? findMarket(position.slug, deadline).catch(() => null) : Promise.resolve(null),
            ]);
            const link = marketLink(position.eventSlug ?? market?.eventSlug ?? null, position.slug);
            return assessHolding(position, book, market, link);
          }),
        );
        const done = results.filter((r): r is HoldingAssessment => r !== null);
        const skipped = open.length - done.length;
        const level = combine(done.flatMap((d) => d.flags));

        const lines: string[] = [];
        const risky = done.filter((d) => d.level !== "CLEAR").length;
        lines.push(
          risky > 0
            ? `${level}. ${risky} of your ${done.length} largest open positions ${risky === 1 ? "needs" : "need"} attention.`
            : `CLEAR. No traps on your ${done.length} largest open positions right now.`,
        );
        for (const d of done) {
          lines.push("", `${d.level}: ${d.title} (${d.outcome}), ${d.shares.toFixed(1)} shares, shown at ${usd(d.displayedValue)}`);
          for (const f of d.flags) lines.push(`- ${f.message}`);
          for (const n of d.notes) lines.push(`- ${n}`);
          lines.push(`- ${d.link}`);
        }
        if (skipped > 0) lines.push("", `Ran out of time before checking ${skipped} more position${skipped === 1 ? "" : "s"}. Ask again to check them.`);
        lines.push("", `Checked ${nowIso()} against Polymarket's live order books.`);

        return okResult(lines.join("\n"), {
          level,
          wallet,
          positionsWallet: proxy,
          openPositions: open.length,
          checked: done.length,
          skipped,
          positions: done.map((d) => ({
            level: d.level,
            title: d.title,
            outcome: d.outcome,
            link: d.link,
            shares: money(d.shares),
            costBasisUsdc: money(d.costBasis),
            displayedValueUsdc: money(d.displayedValue),
            pnlUsdc: money(d.pnl),
            sellNowUsdc: money(d.sellNow),
            unsellableShares: money(d.unsoldShares),
            daysLeft: d.daysLeft,
            notes: d.notes,
            reasons: d.flags,
          })),
          checkedAt: nowIso(),
        });
      } catch (error) {
        return errorResult(`Couldn't check this wallet's positions: ${messageOf(error)}`);
      }
    },
  );
}
