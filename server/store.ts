// In-memory store for request codes and the public proof log.
// Codes live 24 hours. If the server restarts, codes are lost but nothing breaks:
// the paid scan also accepts the market link directly.

import { newCode, type ScanRequest } from "../src/lib/codes.ts";

const DAY = 86_400_000;
const codes = new Map<string, ScanRequest & { createdAt: number }>();

export function saveRequest(req: ScanRequest): string {
  let code = newCode();
  while (codes.has(code)) code = newCode();
  codes.set(code, { ...req, createdAt: Date.now() });
  if (codes.size > 50_000) sweep();
  return code;
}

export function getRequest(code: string): ScanRequest | null {
  const r = codes.get(code);
  if (!r) return null;
  if (Date.now() - r.createdAt > DAY) {
    codes.delete(code);
    return null;
  }
  return r;
}

function sweep() {
  const now = Date.now();
  for (const [k, v] of codes) if (now - v.createdAt > DAY) codes.delete(k);
}

// Every paid scan, newest first: the public on-chain proof that people and agents pay for this.
export type PaidScan = { at: string; market: string; verdict: string; txHash: string | null; payer: string | null };
const paid: PaidScan[] = [];
export function recordPaid(entry: PaidScan) {
  paid.unshift(entry);
  if (paid.length > 200) paid.pop();
}
export function paidScans(): PaidScan[] {
  return paid;
}
