import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { Deadline } from "../lib/http.ts";
import { getPositions, marketLink, resolveProxy } from "../lib/polymarket.ts";
import { claimable } from "../lib/traps.ts";
import { usd } from "../lib/verdict.ts";
import { NO_WALLET, errorResult, messageOf, money, nowIso, okResult, walletSchema } from "./common.ts";

const inputSchema = z
  .object({
    wallet: walletSchema.optional().describe("The user's Polymarket wallet address (login or proxy wallet). Leave empty to use the wallet connected to PayBox."),
  })
  .strict();

const outputSchema = z.object({
  wallet: z.string(),
  positionsWallet: z.string(),
  totalUsdc: z.number(),
  count: z.number(),
  markets: z.array(
    z.object({
      title: z.string(),
      outcome: z.string(),
      valueUsdc: z.number(),
      shares: z.number(),
      conditionId: z.string(),
      negativeRisk: z.boolean(),
      link: z.string(),
    }),
  ),
  oneTapClaimPossible: z.boolean(),
  checkedAt: z.string(),
});

export function registerCheckUnclaimed(server: McpServer) {
  server.registerTool(
    "check_unclaimed",
    {
      title: "Find unclaimed Polymarket winnings",
      description:
        "Scans a wallet for resolved Polymarket positions that won and have not been claimed yet. Counts only winning positions with value above zero. Returns the total, each market, and the link to claim it on Polymarket. Read-only.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ wallet }) => {
      if (!wallet) return errorResult(NO_WALLET);
      const deadline = new Deadline();
      try {
        const proxy = await resolveProxy(wallet, deadline);
        const winners = claimable(await getPositions(proxy, deadline, { redeemable: true }));
        const total = winners.reduce((sum, p) => sum + p.currentValue, 0);
        const markets = winners.slice(0, 25).map((p) => ({
          title: p.title,
          outcome: p.outcome,
          valueUsdc: money(p.currentValue),
          shares: money(p.size),
          conditionId: p.conditionId,
          negativeRisk: p.negativeRisk,
          link: marketLink(p.eventSlug, p.slug),
        }));
        // One-tap claims only work when the positions sit in the wallet PayBox signs for.
        // Polymarket accounts hold positions in a separate proxy wallet, which only Polymarket's site can claim from.
        const oneTap = proxy === wallet.toLowerCase();

        let text: string;
        if (winners.length === 0) {
          text = `No unclaimed winnings found for ${wallet}.`;
        } else {
          const lines = [
            `Foresyte found ${usd(total)} in unclaimed winnings across ${winners.length} market${winners.length === 1 ? "" : "s"}.`,
            ...markets.map((m) => `- ${usd(m.valueUsdc)}: ${m.title} (${m.outcome}). Claim: ${m.link}`),
          ];
          if (winners.length > markets.length) lines.push(`- and ${winners.length - markets.length} smaller ones.`);
          lines.push(
            oneTap
              ? "These positions sit in this wallet itself, so propose_claim can prepare the claim for PayBox approval."
              : "These positions sit in your Polymarket account wallet. Open each link while signed in to Polymarket and press Claim.",
          );
          text = lines.join("\n");
        }
        return okResult(text, {
          wallet,
          positionsWallet: proxy,
          totalUsdc: money(total),
          count: winners.length,
          markets,
          oneTapClaimPossible: oneTap && winners.length > 0,
          checkedAt: nowIso(),
        });
      } catch (error) {
        return errorResult(`Couldn't check this wallet: ${messageOf(error)}`);
      }
    },
  );
}
