import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { proposeX402, x402OutputSchema } from "../paybox.ts";
import { normalizeCode } from "../lib/codes.ts";
import { errorResult, messageOf } from "./common.ts";

// The paid deep scan runs on Foresyte's server; this tool only builds the x402 request for PayBox.
// No network call here: PayBox fetches the live 402 price, shows it to the person, and pays on approval.
export const FORESYTE_URL = "https://foresyte.onrender.com"; // change to the Render URL after deploy, and allowlist its host
const PRICE_ATOMIC = "100000"; // 0.10 USDC (6 decimals)
const CHAINS = { solana: "solana:mainnet", base: "eip155:8453" } as const; // USDC on either; Solana is the default

const inputSchema = z
  .object({
    code: z.string().max(20).optional().describe("A Foresyte request code like FSY-7K2QXM from the Foresyte page. Use this if the person gives one."),
    market: z.string().min(1).max(500).optional().describe("A Polymarket market link, if there is no code."),
    outcome: z.string().min(1).max(120).optional().describe("Outcome they would buy, e.g. Yes or No. Only with market."),
    stakeUsdc: z.number().positive().max(1_000_000).optional().describe("Position size to analyze, in USDC. Only with market. Defaults to 50."),
    payWith: z.enum(["solana", "base"]).optional().describe("Pay in USDC on solana (default) or base. Use base only if the person asks or has no USDC on Solana."),
  })
  .strict();

export function registerDeepScan(server: McpServer) {
  server.registerTool(
    "deep_scan",
    {
      title: "Foresyte deep scan (0.10 USDC)",
      description:
        "Paid, 0.10 USDC over x402, on Solana by default or Base if the person prefers. The full Foresyte report for one Polymarket market: what you'd get back at every position size, the largest size that can still exit, the start of the 3-day deadline window, the other side, and a numbered plain-English risk read. " +
        "Use it when the person pastes a Foresyte code (FSY-XXXXXX) or asks for a deep scan of a market. Use the free trap_check for a quick verdict. " +
        "This returns a payment proposal; after PayBox pays and the request returns, show the person the 'report' field exactly as written, without rewording or adding numbers.",
      inputSchema,
      outputSchema: x402OutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ code, market, outcome, stakeUsdc, payWith }) => {
      try {
        let url: string;
        if (code) {
          const c = normalizeCode(code);
          if (!c) return errorResult(`"${code}" isn't a Foresyte code. Codes look like FSY-7K2QXM. Ask the person to copy it again, or pass the market link instead.`);
          url = `${FORESYTE_URL}/api/deep-scan?code=${c}`;
        } else if (market) {
          const q = new URLSearchParams({ market, stake: String(stakeUsdc ?? 50) });
          if (outcome) q.set("outcome", outcome);
          url = `${FORESYTE_URL}/api/deep-scan?${q}`;
        } else {
          return errorResult("Give a Foresyte code (FSY-XXXXXX) or a Polymarket market link.");
        }
        return proposeX402({ chain: CHAINS[payWith ?? "solana"], url, maxAmount: PRICE_ATOMIC });
      } catch (error) {
        return errorResult(`Couldn't prepare the deep scan: ${messageOf(error)}`);
      }
    },
  );
}
