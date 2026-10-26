import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { Deadline } from "../lib/http.ts";
import { MarketChoiceNeeded, findMarket, getBook, marketLink } from "../lib/polymarket.ts";
import { assessEntry } from "../lib/traps.ts";
import { VERDICT } from "../lib/plain.ts";
import { errorResult, levelSchema, maybe, messageOf, money, nowIso, okResult, reasonSchema } from "./common.ts";

const inputSchema = z
  .object({
    market: z.string().min(1).max(500).describe("Polymarket market link or slug, e.g. https://polymarket.com/event/..."),
    outcome: z.string().min(1).max(120).optional().describe("Outcome you would buy, e.g. Yes, No, or a team name. Defaults to the first outcome."),
    stakeUsdc: z.number().positive().max(1_000_000).optional().describe("How much you would spend, in USDC. Defaults to 50."),
  })
  .strict();

const outputSchema = z.object({
  level: levelSchema,
  verdict: z.string(),
  headline: z.string(),
  whatToDo: z.string(),
  reasons: z.array(reasonSchema),
  market: z.object({ question: z.string(), slug: z.string(), link: z.string(), endDate: z.string().nullable() }),
  outcome: z.string(),
  stakeUsdc: z.number(),
  shownPrice: z.number().nullable(),
  fillPrice: z.number().nullable(),
  sharesBought: z.number(),
  sellBackNowUsdc: z.number(),
  exitDepthUsdc: z.number(),
  spreadCents: z.number().nullable(),
  rules: z.object({
    basis: z.enum(["event", "confirmation"]),
    reportingTerms: z.array(z.string()),
    deadline: z.string().nullable(),
    daysLeft: z.number().nullable(),
    clarificationAdded: z.boolean(),
  }),
  checkedAt: z.string(),
});

export function registerTrapCheck(server: McpServer) {
  server.registerTool(
    "trap_check",
    {
      title: "Is this Polymarket market a trap?",
      description:
        "Run before buying. Checks a Polymarket market at the user's stake for the liquidity trap (not enough buyers to cash out, real fill price worse than shown, wide spread) and the rules trap (pays on what is reported by a deadline that falls on a weekend or holiday, added clarifications, vague wording). Returns CLEAR, CAUTION or HIGH_RISK with the worst case first and every number behind it. Read-only; never places a trade.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ market: marketInput, outcome, stakeUsdc }) => {
      const deadline = new Deadline();
      const stake = stakeUsdc ?? 50;
      try {
        const market = await findMarket(marketInput, deadline);
        if (market.closed) return errorResult(`"${market.question}" is closed. There is nothing to buy.`);
        let index = 0;
        if (outcome) {
          index = market.outcomes.findIndex((o) => o.toLowerCase() === outcome.trim().toLowerCase());
          if (index < 0) return errorResult(`"${outcome}" is not an outcome of "${market.question}". Outcomes: ${market.outcomes.join(", ")}.`);
        }
        const tokenId = market.tokenIds[index];
        if (!tokenId) return errorResult(`Polymarket returned no order book id for "${market.question}".`);
        const book = await getBook(tokenId, deadline);
        const result = assessEntry(market, index, book, stake);
        const link = marketLink(market.eventSlug, market.slug);
        const lines = [result.headline];
        if (result.flags.length) lines.push("", "Why:", ...result.flags.map((f) => `- ${f.message}`));
        const ruleLine = result.rules.basis === "confirmation"
          ? `How it's decided: by what gets officially reported${result.rules.deadline ? ` by ${result.rules.deadline.label}` : ""}.`
          : `How it's decided: by what actually happens${result.rules.deadline ? `. Ends ${result.rules.deadline.label}` : ""}.`;
        lines.push(
          "",
          ruleLine,
          `Risk read: ${result.whatToDo}`,
          "",
          `Market: ${market.question}`,
          link,
          `Checked ${nowIso()} using Polymarket's live prices. Not financial advice.`,
        );
        return okResult(lines.join("\n"), {
          level: result.level,
          verdict: VERDICT[result.level],
          headline: result.headline,
          whatToDo: result.whatToDo,
          reasons: result.flags,
          market: { question: market.question, slug: market.slug, link, endDate: market.endDate },
          outcome: result.outcome,
          stakeUsdc: money(stake),
          shownPrice: maybe(result.shownPrice),
          fillPrice: maybe(result.fillPrice),
          sharesBought: maybe(result.sharesBought, 2) ?? 0,
          sellBackNowUsdc: money(result.sellBackNow),
          exitDepthUsdc: money(result.exitDepthUsdc),
          spreadCents: maybe(result.spreadCents, 1),
          rules: {
            basis: result.rules.basis,
            reportingTerms: result.rules.reportingTerms,
            deadline: result.rules.deadline?.label ?? null,
            daysLeft: result.rules.deadline?.daysLeft ?? null,
            clarificationAdded: result.rules.clarificationAdded,
          },
          checkedAt: nowIso(),
        });
      } catch (error) {
        if (error instanceof MarketChoiceNeeded) {
          const options = error.options.map((o) => `- ${o.question} (slug: ${o.slug})`).join("\n");
          return errorResult(`${error.message} Ask the user which one:\n${options}`);
        }
        return errorResult(`Couldn't check this market: ${messageOf(error)}`);
      }
    },
  );
}
