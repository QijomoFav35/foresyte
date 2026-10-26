// Server settings, all from environment variables. No secrets: the server never holds keys or funds.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const NETWORK = process.env.NETWORK === "testnet" ? "testnet" : "mainnet";
export const CAIP2 = NETWORK === "mainnet" ? "eip155:8453" : "eip155:84532";
export const CHAIN_NAME = NETWORK === "mainnet" ? "Base" : "Base Sepolia";
export const EXPLORER_TX = NETWORK === "mainnet" ? "https://basescan.org/tx/" : "https://sepolia.basescan.org/tx/";

export const PUBLIC_URL = required("PUBLIC_URL").replace(/\/+$/, "");
export const PAY_TO = required("PAY_TO"); // Base wallet that receives the deep-scan fee
if (!/^0x[0-9a-fA-F]{40}$/.test(PAY_TO)) throw new Error("PAY_TO must be a 0x Base wallet address.");
export const SCAN_PRICE = process.env.SCAN_PRICE || "$0.25";
export const PORT = Number(process.env.PORT || "3000");
