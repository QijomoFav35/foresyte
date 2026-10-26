// Server settings, all from environment variables. No secrets: the server never holds keys or funds.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// USDC on Solana. CAIP-2 ids from solana.com/docs/payments/agentic-payments/x402
export const NETWORK = process.env.NETWORK === "testnet" ? "testnet" : "mainnet";
export const CAIP2 = NETWORK === "mainnet" ? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" : "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const CHAIN_NAME = NETWORK === "mainnet" ? "Solana" : "Solana Devnet";
export const EXPLORER_TX = NETWORK === "mainnet" ? "https://solscan.io/tx/" : "https://solscan.io/tx/";
export const EXPLORER_SUFFIX = NETWORK === "mainnet" ? "" : "?cluster=devnet";
export const FACILITATOR_URL = process.env.FACILITATOR_URL || ""; // empty = PayAI's hosted facilitator

export const PUBLIC_URL = required("PUBLIC_URL").replace(/\/+$/, "");
export const PAY_TO = required("PAY_TO"); // Solana wallet that receives the deep-scan fee (it needs a USDC token account)
if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(PAY_TO)) throw new Error("PAY_TO must be a Solana wallet address.");
export const SCAN_PRICE = process.env.SCAN_PRICE || "$0.25";
export const PORT = Number(process.env.PORT || "3000");
