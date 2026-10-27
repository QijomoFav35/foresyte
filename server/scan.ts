// Fetches live Polymarket data and runs the shared trap logic from src/lib.
// The plugin and this server use the exact same functions, so the free check, the paid scan
// and the PayBox tools always agree.

import { Deadline } from "../src/lib/http.ts";
import { MarketChoiceNeeded, findMarket, getBook, marketLink, type Market } from "../src/lib/polymarket.ts";
import { assessEntry } from "../src/lib/traps.ts";
import { deepScan } from "../src/lib/deepScan.ts";
import { VERDICT } from "../src/lib/plain.ts";
import type { ScanRequest } from "../src/lib/codes.ts";

const BUDGET_MS = 15_000; // a web request can wait longer than a PayBox plugin call

export class UserError extends Error {
  readonly status: number;
  readonly options?: Array<{ question: string; slug: string }>;
  constructor(message: string, status = 400, options?: Array<{ question: string; slug: string }>) {
    super(message);
    this.status = status;
    this.options = options;
  }
}

export function parseRequest(q: Record<string, unknown>): ScanRequest {
  const market = typeof q.market === "string" ? q.market.trim() : "";
  if (!market || market.length > 500) throw new UserError("Paste a Polymarket market link (market=...).");
  const outcome = typeof q.outcome === "string" && q.outcome.trim() ? q.outcome.trim().slice(0, 120) : null;
  const rawStake = q.stake ?? q.stakeUsdc;
  const stake = rawStake === undefined || rawStake === "" ? 50 : Number(rawStake);
  if (!Number.isFinite(stake) || stake <= 0 || stake > 1_000_000) throw new UserError("Stake must be between $1 and $1,000,000.");
  return { market, outcome, stakeUsdc: Math.round(stake * 100) / 100 };
}

async function load(req: ScanRequest) {
  const deadline = new Deadline(BUDGET_MS);
  let market: Market;
  try {
    market = await findMarket(req.market, deadline);
  } catch (error) {
    if (error instanceof MarketChoiceNeeded) {
      throw new UserError(`${error.message} Pick one and paste its link.`, 409, error.options.map((o) => ({ question: o.question, slug: o.slug })));
    }
    throw new UserError(error instanceof Error ? error.message : String(error), 404);
  }
  if (market.closed) throw new UserError(`"${market.question}" has already closed.`, 410);
  let index = 0;
  if (req.outcome) {
    index = market.outcomes.findIndex((o) => o.toLowerCase() === req.outcome!.toLowerCase());
    if (index < 0) throw new UserError(`"${req.outcome}" is not an outcome here. Choose one of: ${market.outcomes.join(", ")}.`);
  }
  const tokenId = market.tokenIds[index];
  if (!tokenId) throw new UserError("Polymarket returned no order book for this market.", 502);
  const otherId = market.tokenIds.length === 2 ? market.tokenIds[index === 0 ? 1 : 0] : undefined;
  const [book, otherBook] = await Promise.all([
    getBook(tokenId, deadline),
    otherId ? getBook(otherId, deadline).catch(() => null) : Promise.resolve(null),
  ]);
  return { market, index, book, otherBook, link: marketLink(market.eventSlug, market.slug) };
}

function marketInfo(market: Market, link: string) {
  return { question: market.question, link, endDate: market.endDate, outcomes: market.outcomes, prices: market.prices };
}

// Free: the same verdict as trap_check. The same market, side and amount within 20 s is served from cache.
const CACHE_MS = 20_000;
const cache = new Map<string, { at: number; value: Promise<Awaited<ReturnType<typeof runQuickCheck>>> }>();
export function quickCheck(req: ScanRequest) {
  const key = `${req.market}|${req.outcome ?? ""}|${req.stakeUsdc}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.value;
  const value = runQuickCheck(req);
  cache.set(key, { at: now, value });
  value.catch(() => cache.delete(key)); // never cache a failure
  if (cache.size > 2000) for (const [k, v] of cache) if (now - v.at > CACHE_MS) cache.delete(k);
  return value;
}

async function runQuickCheck(req: ScanRequest) {
  const { market, index, book, link } = await load(req);
  const r = assessEntry(market, index, book, req.stakeUsdc);
  return {
    level: r.level,
    verdict: VERDICT[r.level],
    headline: r.headline,
    reasons: r.flags.map((f) => ({ level: f.level, check: f.check, message: f.message })),
    whatToDo: r.whatToDo,
    outcome: r.outcome,
    stakeUsdc: req.stakeUsdc,
    market: marketInfo(market, link),
    numbers: {
      shownPriceCents: r.shownPrice === null ? null : Math.round(r.shownPrice * 1000) / 10,
      fillPriceCents: r.fillPrice === null ? null : Math.round(r.fillPrice * 1000) / 10,
      sellBackNowUsdc: Math.round(r.sellBackNow * 100) / 100,
      buyersNearPriceUsdc: Math.round(r.exitDepthUsdc * 100) / 100,
      spreadCents: r.spreadCents === null ? null : Math.round(r.spreadCents * 10) / 10,
    },
    rules: { decidedBy: r.rules.basis === "confirmation" ? "what gets officially reported" : "what actually happens", deadline: r.rules.deadline?.label ?? null },
    checkedAt: new Date().toISOString(),
  };
}

// Paid: the full deep scan.
export async function fullScan(req: ScanRequest) {
  const { market, index, book, otherBook, link } = await load(req);
  const d = deepScan(market, index, book, req.stakeUsdc, otherBook);
  return {
    level: d.level,
    verdict: d.verdict,
    report: d.report,
    plan: d.plan,
    headline: d.headline,
    reasons: d.entry.flags.map((f) => ({ level: f.level, message: f.message })),
    ladder: d.ladder.map((s) => ({
      betUsdc: s.betUsdc,
      canBuyAll: s.canBuyAll,
      getBackUsdc: Math.round(s.getBackUsdc * 100) / 100,
      lossPct: Math.round(s.lossPct * 1000) / 10,
      partStuck: s.stuckShares >= 0.05,
    })),
    safeBetUsdc: d.safeBetUsdc,
    sellBy: d.sellBy,
    otherSide: d.otherSide,
    outcome: d.entry.outcome,
    stakeUsdc: req.stakeUsdc,
    market: marketInfo(market, link),
    checkedAt: new Date().toISOString(),
    note: "Show the person the 'report' text exactly as written. Not betting advice.",
  };
}
