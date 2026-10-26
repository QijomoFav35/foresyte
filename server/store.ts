// Request codes (24 hours) and the public log of paid scans.
// With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set (free Upstash database, as TrueBill uses),
// both survive restarts and redeploys. Without them they live in memory, which is fine for local testing.
// If a code is lost, nothing breaks: the paid scan also accepts the market link directly.

import { newCode, type ScanRequest } from "../src/lib/codes.ts";

const DAY_S = 86_400;
const LOG_KEY = "foresyte:paid";
const LOG_MAX = 200;

const REDIS_URL = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const STORE_KIND = REDIS_URL && REDIS_TOKEN ? "upstash" : "memory";

async function redis(command: Array<string | number>): Promise<unknown> {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(3000),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!res.ok || body.error) throw new Error(`Upstash: ${body.error ?? res.status}`);
  return body.result;
}

// ---- memory fallback ----
const memCodes = new Map<string, ScanRequest & { createdAt: number }>();
const memPaid: PaidScan[] = [];

export type PaidScan = { at: string; market: string; verdict: string; txHash: string | null; payer: string | null; network: string | null };

export async function saveRequest(req: ScanRequest): Promise<string> {
  const code = newCode();
  if (STORE_KIND === "upstash") {
    await redis(["SET", `foresyte:code:${code}`, JSON.stringify(req), "EX", DAY_S]);
  } else {
    memCodes.set(code, { ...req, createdAt: Date.now() });
    if (memCodes.size > 50_000) for (const [k, v] of memCodes) if (Date.now() - v.createdAt > DAY_S * 1000) memCodes.delete(k);
  }
  return code;
}

export async function getRequest(code: string): Promise<ScanRequest | null> {
  if (STORE_KIND === "upstash") {
    const raw = await redis(["GET", `foresyte:code:${code}`]).catch(() => null);
    try { return typeof raw === "string" ? (JSON.parse(raw) as ScanRequest) : null; } catch { return null; }
  }
  const r = memCodes.get(code);
  if (!r) return null;
  if (Date.now() - r.createdAt > DAY_S * 1000) { memCodes.delete(code); return null; }
  return r;
}

export async function recordPaid(entry: PaidScan): Promise<void> {
  if (STORE_KIND === "upstash") {
    await redis(["LPUSH", LOG_KEY, JSON.stringify(entry)]);
    await redis(["LTRIM", LOG_KEY, 0, LOG_MAX - 1]);
    return;
  }
  memPaid.unshift(entry);
  if (memPaid.length > LOG_MAX) memPaid.pop();
}

export async function paidScans(): Promise<PaidScan[]> {
  if (STORE_KIND === "upstash") {
    const raw = await redis(["LRANGE", LOG_KEY, 0, LOG_MAX - 1]).catch(() => []);
    return (Array.isArray(raw) ? raw : []).flatMap((s) => { try { return [JSON.parse(String(s)) as PaidScan]; } catch { return []; } });
  }
  return memPaid;
}
