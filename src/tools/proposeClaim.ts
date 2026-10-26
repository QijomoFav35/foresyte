import * as z from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/server";
import { encodeFunctionData } from "viem";
import { evmOutputSchema, proposeEvm } from "../paybox.ts";
import { Deadline } from "../lib/http.ts";
import { getPositions, marketLink, resolveProxy } from "../lib/polymarket.ts";
import { claimable } from "../lib/traps.ts";
import { usd } from "../lib/verdict.ts";
import { errorResult, messageOf, walletSchema } from "./common.ts";

// Polygon contracts. Standard markets redeem on the Conditional Tokens contract with USDC.e collateral;
// neg-risk markets redeem through the Neg Risk Adapter, which takes per-outcome amounts.
const CTF = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
const NEG_RISK_ADAPTER = "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296";
const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

const inputSchema = z
  .object({
    wallet: walletSchema.describe("The PayBox wallet address that will sign the claim."),
    conditionId: z.string().regex(/^0x[0-9a-fA-F]{64}$/).describe("conditionId from check_unclaimed."),
  })
  .strict();

export function registerProposeClaim(server: McpServer) {
  server.registerTool(
    "propose_claim",
    {
      title: "Prepare a Polymarket claim for PayBox approval",
      description:
        "Builds an unsigned Polygon transaction that redeems winning Polymarket positions, only when those positions sit in the PayBox wallet itself. If the winnings sit in a Polymarket account wallet, it refuses and returns the link to claim them on Polymarket instead. PayBox handles approval and signing.",
      inputSchema,
      outputSchema: evmOutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ wallet, conditionId }) => {
      const deadline = new Deadline();
      try {
        const own = claimable(await getPositions(wallet.toLowerCase(), deadline, { redeemable: true })).filter(
          (p) => p.conditionId.toLowerCase() === conditionId.toLowerCase(),
        );
        if (own.length === 0) {
          const proxy = await resolveProxy(wallet, deadline);
          if (proxy !== wallet.toLowerCase()) {
            const elsewhere = claimable(await getPositions(proxy, deadline, { redeemable: true })).find(
              (p) => p.conditionId.toLowerCase() === conditionId.toLowerCase(),
            );
            if (elsewhere) {
              return errorResult(
                `These winnings (${usd(elsewhere.currentValue)}) sit in your Polymarket account wallet ${proxy}, which only Polymarket's site can claim from. Nothing was prepared. Claim them here while signed in to Polymarket: ${marketLink(elsewhere.eventSlug, elsewhere.slug)}`,
              );
            }
          }
          return errorResult("This wallet holds no unclaimed winnings for that market. Nothing was prepared.");
        }

        const negRisk = own.some((p) => p.negativeRisk);
        let data: `0x${string}`;
        if (negRisk) {
          const amounts = [0n, 0n];
          for (const p of own) {
            const index = p.outcomeIndex === 1 ? 1 : 0;
            amounts[index] = (amounts[index] ?? 0n) + BigInt(Math.floor(p.size * 1e6));
          }
          data = encodeFunctionData({
            abi: [
              {
                name: "redeemPositions",
                type: "function",
                stateMutability: "nonpayable",
                inputs: [
                  { name: "conditionId", type: "bytes32" },
                  { name: "amounts", type: "uint256[]" },
                ],
                outputs: [],
              },
            ],
            functionName: "redeemPositions",
            args: [conditionId as `0x${string}`, amounts],
          });
        } else {
          data = encodeFunctionData({
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
            args: [USDC_E as `0x${string}`, ZERO_BYTES32 as `0x${string}`, conditionId as `0x${string}`, [1n, 2n]],
          });
        }
        return proposeEvm({ chain: "eip155:137", to: negRisk ? NEG_RISK_ADAPTER : CTF, value: "0", data });
      } catch (error) {
        return errorResult(`Couldn't prepare the claim: ${messageOf(error)}`);
      }
    },
  );
}
