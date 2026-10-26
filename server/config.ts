// Server settings, all from environment variables. No secrets: the server never holds keys or funds.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

// USDC on Solana (default) and on Base. CAIP-2 ids: solana.com x402 docs and eip155 chain ids.
export const NETWORK = process.env.NETWORK === "testnet" ? "testnet" : "mainnet";
const main = NETWORK === "mainnet";
export const SOLANA = main ? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" : "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const BASE = main ? "eip155:8453" : "eip155:84532";
export const FACILITATOR_URL = process.env.FACILITATOR_URL || ""; // empty = PayAI's hosted facilitator

// Wallets that receive the $0.25. Solana is required; Base is optional (leave it out to accept Solana only).
export const PAY_TO_SOLANA = process.env.PAY_TO_SOLANA || required("PAY_TO");
if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(PAY_TO_SOLANA)) throw new Error("PAY_TO_SOLANA must be a Solana wallet address with a USDC token account.");
export const PAY_TO_BASE = process.env.PAY_TO_BASE || "";
if (PAY_TO_BASE && !/^0x[0-9a-fA-F]{40}$/.test(PAY_TO_BASE)) throw new Error("PAY_TO_BASE must be a 0x Base wallet address.");
export const CHAIN_NAME = PAY_TO_BASE ? (main ? "Solana or Base" : "Solana Devnet or Base Sepolia") : (main ? "Solana" : "Solana Devnet");

export function explorerFor(network: string | undefined, tx: string): string {
  if (network?.startsWith("eip155:")) return (network === "eip155:8453" ? "https://basescan.org/tx/" : "https://sepolia.basescan.org/tx/") + tx;
  return `https://solscan.io/tx/${tx}${main ? "" : "?cluster=devnet"}`;
}
export const PUBLIC_URL = required("PUBLIC_URL").replace(/\/+$/, "");
export const SCAN_PRICE = process.env.SCAN_PRICE || "$0.25";
export const PORT = Number(process.env.PORT || "3000");
