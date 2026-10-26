// Pays for one deep scan on Base Sepolia (test network, free test USDC) to prove the whole x402 flow.
// Mainnet payments go through PayBox, not this script.
// Setup: run the server with NETWORK=testnet. Get test USDC at https://faucet.circle.com (Base Sepolia).
// Usage: TEST_BUYER_KEY=0x<test wallet private key> npm run buy -- "<payUrl from /api/code>"
// Use a throwaway test wallet only. Never a wallet holding real money.

import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const url = process.argv[2];
if (!url) {
  console.error('Usage: TEST_BUYER_KEY=0x... npm run buy -- "<payUrl>"');
  process.exit(1);
}
const key = process.env.TEST_BUYER_KEY;
if (!key?.startsWith("0x")) {
  console.error("Set TEST_BUYER_KEY to a throwaway Base Sepolia test wallet's private key.");
  process.exit(1);
}

const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(privateKeyToAccount(key as `0x${string}`)));
const pay = wrapFetchWithPayment(fetch, client);

const res = await pay(url, { method: "GET", headers: { accept: "application/json" } });
console.log("HTTP", res.status);
const settlement = res.headers.get("payment-response") ?? res.headers.get("x-payment-response");
if (settlement) console.log("Settlement:", JSON.parse(Buffer.from(settlement, "base64").toString("utf8")));
const body = await res.json().catch(() => null);
if (body?.report) console.log("\n" + body.report);
else console.log(JSON.stringify(body, null, 2));
process.exit(res.ok ? 0 : 1);
