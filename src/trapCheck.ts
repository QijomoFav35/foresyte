import * as z from "zod/v4";
import {
  cents,
  exitDepth,
  fetchBook,
  findMarket,
  money,
  parseList,
  walkAsks,
} from "./lib/polymarket.js";
import { analyzeRules, worstLevel, type FlagLevel } from "./lib/rules.js";

const InputSchema = z
  .object({
    market: z.string().min(1).max(300).describe("Polymarket market slug or URL"),
    outcome: z.string().min(1).max(80).describe("Outcome to buy, e.g. Yes or No"),
    stakeUsdc: z.number().positive().max(1_000_000).describe("Stake size in USDC"),
    wallet: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/)
      .optional()
      .describe("Optional wallet (reserved for future personalization)"),
  })
  .strict();

type Input = z.infer<typeof InputSchema>;

type Flag = { level: FlagLevel; message: string; trap: "liquidity" | "rules" };

function pickOutcomeIndex(outcomes: string[], outcome: string): number {
  const want = outcome.trim().toLowerCase();
  const exact = outcomes.findIndex((o) => o.toLowerCase() === want);
  if (exact >= 0) return exact;
  const partial = outcomes.findIndex((o) => o.toLowerCase().includes(want) || want.includes(o.toLowerCase()));
  if (partial >= 0) return partial;
  throw new Error(`Outcome "${outcome}" not found. Available: ${outcomes.join(", ") || "(none)"}`);
}

export function registerTrapCheck(server: any) {
  server.registerTool(
    "trap_check",
    {
      title: "Check if a Polymarket market is a trap before you buy",
      description:
        "Before buying, checks liquidity at your exact stake and resolution rules/timing. Returns CLEAR, CAUTION, or HIGH_RISK with plain-English reasons and real numbers. Informs only — never blocks.",
      inputSchema: InputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async (raw: Input) => {
      try {
        const { market, outcome, stakeUsdc } = raw;
        const m = await findMarket(market);
        const outcomes = parseList(m.outcomes);
        const tokenIds = parseList(m.clobTokenIds);
        const prices = parseList(m.outcomePrices).map(Number);
        const idx = pickOutcomeIndex(outcomes, outcome);
        const tokenId = tokenIds[idx];
        if (!tokenId) {
          return {
            isError: true,
            content: [{ type: "text", text: `No CLOB token id for outcome "${outcomes[idx] ?? outcome}".` }],
          };
        }

        const book = await fetchBook(tokenId);
        const fill = walkAsks(book.asks, stakeUsdc);
        const depth = exitDepth(book.bids);
        const displayed = Number.isFinite(prices[idx]) ? prices[idx]! : fill.bestAsk;
        const flags: Flag[] = [];

        if (!fill.filled) {
          flags.push({
            level: "HIGH_RISK",
            trap: "liquidity",
            message: `Only $${money(fill.spent)} of ${outcomes[idx]} is for sale. A $${money(stakeUsdc)} bet can't fill.`,
          });
        }

        if (!Number.isFinite(depth.bestBid) || book.bids.length === 0) {
          flags.push({
            level: "HIGH_RISK",
            trap: "liquidity",
            message: "Nobody is buying this market right now. Once you're in, you're in until it resolves.",
          });
        } else if (depth.depthUsdc < stakeUsdc) {
          flags.push({
            level: "HIGH_RISK",
            trap: "liquidity",
            message: `Only $${money(depth.depthUsdc)} of buyers exist on this market. If you buy $${money(stakeUsdc)}, you won't be able to cash out until it resolves.`,
          });
        } else if (depth.depthUsdc < 2 * stakeUsdc) {
          flags.push({
            level: "CAUTION",
            trap: "liquidity",
            message: "Few buyers here. Selling early would push the price against you.",
          });
        }

        if (fill.filled && Number.isFinite(displayed) && displayed > 0 && fill.avgPrice > displayed * 1.05) {
          flags.push({
            level: "CAUTION",
            trap: "liquidity",
            message: `Shows ${cents(displayed)}¢, but your size fills at ${cents(fill.avgPrice)}¢ on average.`,
          });
        }

        if (Number.isFinite(fill.bestAsk) && Number.isFinite(depth.bestBid)) {
          const spread = fill.bestAsk - depth.bestBid;
          if (spread > 0.05) {
            flags.push({
              level: "CAUTION",
              trap: "liquidity",
              message: `Buying and selling right now are ${cents(spread)}¢ apart.`,
            });
          }
        }

        const rulesText = String(m.description ?? m.resolutionSource ?? "");
        for (const rf of analyzeRules(rulesText, m.endDate)) {
          flags.push({ level: rf.level, trap: "rules", message: rf.message });
        }

        const level = worstLevel(flags.map((f) => f.level));
        const header =
          level === "CLEAR"
            ? "CLEAR — No traps found at this size."
            : level === "CAUTION"
              ? "CAUTION — Worth a second look before you buy."
              : "HIGH_RISK — This market can trap you.";

        const lines = [
          header,
          `Market: ${m.question ?? market}`,
          `Outcome: ${outcomes[idx]} | Stake: $${money(stakeUsdc)}`,
          Number.isFinite(displayed) ? `Displayed price: ${cents(displayed)}¢` : null,
          fill.filled && Number.isFinite(fill.avgPrice) ? `Fill at your size: ~${cents(fill.avgPrice)}¢` : null,
          Number.isFinite(depth.bestBid) ? `Exit depth near best bid: $${money(depth.depthUsdc)}` : null,
          m.endDate ? `Ends: ${m.endDate}` : null,
          "",
          ...(flags.length ? flags.map((f, i) => `${i + 1}. [${f.level}] ${f.message}`) : ["No liquidity or rules traps at this size."]),
        ].filter((x) => x !== null) as string[];

        const text = lines.join("\n");
        return {
          content: [{ type: "text", text }],
          structuredContent: {
            level,
            market: m.question,
            slug: m.slug,
            outcome: outcomes[idx],
            stakeUsdc,
            displayedPrice: displayed,
            avgFillPrice: fill.avgPrice,
            exitDepthUsdc: depth.depthUsdc,
            flags,
          },
        };
      } catch (err: any) {
        return {
          isError: true,
          content: [{ type: "text", text: err?.message ?? String(err) }],
        };
      }
    },
  );
}
