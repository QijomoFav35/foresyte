// Pays for one deep scan on Solana Devnet (free test USDC) to prove the whole x402 flow.
// Mainnet payments go through PayBox, not this script.
// Setup: run the server with NETWORK=testnet and a Devnet PAY_TO. Get Devnet USDC at https://faucet.circle.com (Solana Devnet).
// Usage: SOLANA_PRIVATE_KEY=<base58 secret of a throwaway Devnet wallet> npm run buy -- "<payUrl from /api/code>"
// Use a throwaway test wallet only. Never a wallet holding real money.

import { base58 } from "@scure/base";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";

const url = process.argv[2];
const secret = process.env.SOLANA_PRIVATE_KEY;
if (!url || !secret) {
  console.error('Usage: SOLANA_PRIVATE_KEY=<base58 secret> npm run buy -- "<payUrl>"');
  process.exit(1);
}

const signer = await createKeyPairSignerFromBytes(base58.decode(secret));
const client = new x402Client();
// Only ever pay on Devnet, and never more than 0.10 USDC
client.registerPolicy((_version, requirements) =>
  requirements.filter(({ network, amount }) => network === "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" && BigInt(amount) <= 100_000n),
);
client.register("solana:*", new ExactSvmScheme(signer));
const pay = wrapFetchWithPayment(fetch, client);

const res = await pay(url, { method: "GET", headers: { accept: "application/json" } });
console.log("HTTP", res.status);
const settlement = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
if (settlement) console.log("Settlement:", JSON.parse(Buffer.from(settlement, "base64").toString("utf8")));
const body = await res.json().catch(() => null);
if (body?.report) console.log("\n" + body.report);
else console.log(JSON.stringify(body, null, 2));
process.exit(res.ok ? 0 : 1);
