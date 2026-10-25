import * as z from "zod/v4";
import {
  DATA,
  exitDepth,
  fetchBook,
  getJson,
  money,
  num,
  resolveProxy,
  sellProceeds,
} from "./lib/polymarket.js";
import { analyzeRules, daysLeft } from "./lib/rules.js";

const InputSchema = z
  .object({
    wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/).describe("Wallet to watch (EOA or Polymarket proxy)"),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

export function registerTrapWatch(server: any) {
  server.registerTool(
    "trap_watch",
    {
      title: "Watch open Polymarket positions for exit and deadline traps",
      description:
        "While you hold positions, shows P&L, what selling now returns, EXIT CLOSING warnings, DEADLINE RISK from rules/timing, and LOCK-IN notes when locking profit beats waiting.",
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (raw: Input) => {
      try {
        const proxy = await resolveProxy(raw.wallet);
        const data = await getJson(`${DATA}/positions?user=${proxy}&limit=50`);
        const positions: any[] = Array.isArray(data) ? data : data?.positions || [];

        const open = positions
          .filter((p) => {
            const price = num(p.curPrice);
            return price > 0 && price < 1 && p.redeemable !== true;
          })
          .map((p) => ({
            ...p,
            value: num(p.currentValue ?? p.size * p.curPrice),
          }))
          .filter((p) => Number.isFinite(p.value) && p.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        if (open.length === 0) {
          const text = `No open (unresolved) positions found for ${proxy}.`;
          return { content: [{ type: "text", text }], structuredContent: { proxy, positions: [] } };
        }

        const reports: any[] = [];
        const blocks: string[] = [`Watching ${open.length} open position(s) for ${proxy}`, ""];

        for (const p of open) {
          const title = p.title || p.question || "Untitled market";
          const size = num(p.size);
          const cur = num(p.curPrice);
          const avg = num(p.avgPrice ?? p.initialValue / (size || 1));
          const value = num(p.currentValue ?? size * cur);
          const cost = Number.isFinite(avg) && Number.isFinite(size) ? avg * size : num(p.initialValue);
          const pnl = Number.isFinite(value) && Number.isFinite(cost) ? value - cost : NaN;

          const tokenId = String(p.asset || p.tokenId || p.clobTokenId || "");
          let sellNow = { proceeds: 0, filledShares: 0 };
          let depthUsdc = 0;
          let bestBid = NaN;
          let notes: string[] = [];

          if (tokenId) {
            try {
              const book = await fetchBook(tokenId);
              sellNow = sellProceeds(book.bids, size);
              const depth = exitDepth(book.bids);
              depthUsdc = depth.depthUsdc;
              bestBid = depth.bestBid;

              if (book.bids.length === 0 || !Number.isFinite(bestBid)) {
                notes.push("EXIT CLOSING: No buyers right now. You can't exit until someone bids.");
              } else if (sellNow.filledShares + 1e-9 < size) {
                notes.push(
                  `EXIT CLOSING: Buyers are thinning out. Cash out now while you still can. About ${money(sellNow.filledShares)} of ${money(size)} shares can sell for ~$${money(sellNow.proceeds)}.`,
                );
              } else if (Number.isFinite(value) && value > 0 && sellNow.proceeds < value * 0.97) {
                const pct = ((value - sellNow.proceeds) / value) * 100;
                notes.push(
                  `EXIT CLOSING: Selling now returns about $${money(sellNow.proceeds)}, ${pct.toFixed(1)}% below the displayed value because buyers are thin.`,
                );
              }
            } catch {
              notes.push("Could not read the order book for this position right now.");
            }
          }

          const rulesText = String(p.description ?? "");
          const endDate = p.endDate || p.endDateIso;
          const ruleFlags = analyzeRules(rulesText, endDate);
          const left = daysLeft(endDate);
          for (const rf of ruleFlags) {
            const dayNote = left != null ? ` (${left} day(s) left)` : "";
            notes.push(`DEADLINE RISK [${rf.level}]: ${rf.message}${dayNote}`);
          }

          const lockProfit = Number.isFinite(pnl) && pnl > 0;
          const risky = ruleFlags.length > 0 || depthUsdc < (value || 0) || sellNow.filledShares + 1e-9 < size;
          if (lockProfit && risky) {
            notes.push(
              `LOCK-IN: You could lock in about $${money(pnl)} profit now instead of waiting on an uncertain resolution.`,
            );
          }

          const pnlLine = Number.isFinite(pnl)
            ? pnl >= 0
              ? `Up $${money(pnl)}.`
              : `Down $${money(Math.abs(pnl))}.`
            : "P&L unavailable.";

          blocks.push(`• ${title} (${p.outcome ?? "?"})`);
          blocks.push(`  ${pnlLine} Displayed value ~$${money(value)}. Selling everything now ≈ $${money(sellNow.proceeds)}.`);
          for (const n of notes) blocks.push(`  ${n}`);
          blocks.push("");

          reports.push({
            title,
            outcome: p.outcome,
            pnl,
            value,
            sellNowProceeds: sellNow.proceeds,
            exitDepthUsdc: depthUsdc,
            notes,
            conditionId: p.conditionId,
            slug: p.slug,
          });
        }

        const text = blocks.join("\n").trim();
        return { content: [{ type: "text", text }], structuredContent: { proxy, positions: reports } };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: err?.message ?? String(err) }],
        };
      }
    },
  );
}
