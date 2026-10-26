// Polymarket's public, read-only APIs. No keys, no auth.
// Hosts to allowlist in the PayBox portal: gamma-api.polymarket.com, clob.polymarket.com, data-api.polymarket.com

import { Deadline, getJson } from "./http.ts";
import { parseLevels, type Level } from "./book.ts";

export const GAMMA = "https://gamma-api.polymarket.com";
export const CLOB = "https://clob.polymarket.com";
export const DATA = "https://data-api.polymarket.com";

export type Market = {
  question: string;
  slug: string;
  eventSlug: string | null;
  conditionId: string | null;
  description: string;
  resolutionSource: string | null;
  endDate: string | null;
  outcomes: string[];
  prices: number[];
  tokenIds: string[];
  closed: boolean;
  negRisk: boolean;
};

export type Position = {
  asset: string;
  conditionId: string;
  title: string;
  slug: string;
  eventSlug: string | null;
  outcome: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  curPrice: number;
  redeemable: boolean;
  negativeRisk: boolean;
  endDate: string | null;
};

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function normalizeMarket(raw: unknown): Market {
  const m = (raw ?? {}) as Record<string, unknown>;
  const events = Array.isArray(m.events) ? (m.events as Array<Record<string, unknown>>) : [];
  return {
    question: str(m.question) ?? str(m.title) ?? "(untitled market)",
    slug: str(m.slug) ?? "",
    eventSlug: str(events[0]?.slug) ?? null,
    conditionId: str(m.conditionId),
    description: str(m.description) ?? "",
    resolutionSource: str(m.resolutionSource),
    endDate: str(m.endDate) ?? str(m.endDateIso),
    outcomes: parseList(m.outcomes),
    prices: parseList(m.outcomePrices).map(num),
    tokenIds: parseList(m.clobTokenIds),
    closed: m.closed === true,
    negRisk: m.negRisk === true,
  };
}

export function normalizePosition(raw: unknown): Position {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    asset: String(p.asset ?? ""),
    conditionId: String(p.conditionId ?? ""),
    title: str(p.title) ?? "(untitled market)",
    slug: str(p.slug) ?? "",
    eventSlug: str(p.eventSlug),
    outcome: str(p.outcome) ?? "",
    outcomeIndex: num(p.outcomeIndex),
    size: num(p.size),
    avgPrice: num(p.avgPrice),
    initialValue: num(p.initialValue),
    currentValue: num(p.currentValue),
    cashPnl: num(p.cashPnl),
    curPrice: num(p.curPrice),
    redeemable: p.redeemable === true,
    negativeRisk: p.negativeRisk === true || p.negRisk === true,
    endDate: str(p.endDate),
  };
}

// Accepts a slug or any polymarket.com link: /event/<event>/<market>, /event/<event>, /market/<market>.
export function slugCandidates(input: string): { market: string | null; event: string | null } {
  const trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.includes("/")) return { market: trimmed, event: trimmed };
  let path = trimmed;
  try {
    path = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).pathname;
  } catch {
    // keep the raw text
  }
  const parts = path.split("/").filter(Boolean);
  const eventAt = parts.indexOf("event");
  if (eventAt >= 0) {
    const event = parts[eventAt + 1] ?? null;
    const market = parts[eventAt + 2] ?? null;
    return { market: market ?? event, event };
  }
  const marketAt = parts.indexOf("market");
  if (marketAt >= 0) return { market: parts[marketAt + 1] ?? null, event: null };
  const last = parts.at(-1) ?? null;
  return { market: last, event: last };
}

export class MarketChoiceNeeded extends Error {
  readonly options: Array<{ question: string; slug: string }>;
  constructor(eventSlug: string, options: Array<{ question: string; slug: string }>) {
    super(`"${eventSlug}" is an event with ${options.length} markets. Pass one market's slug.`);
    this.options = options;
  }
}

export async function findMarket(input: string, deadline: Deadline): Promise<Market> {
  const { market, event } = slugCandidates(input);
  if (market) {
    const found = await getJson(`${GAMMA}/markets?slug=${encodeURIComponent(market)}`, deadline);
    if (Array.isArray(found) && found.length > 0) return normalizeMarket(found[0]);
  }
  if (event) {
    const found = await getJson(`${GAMMA}/events?slug=${encodeURIComponent(event)}`, deadline);
    const first = Array.isArray(found) ? (found[0] as Record<string, unknown> | undefined) : undefined;
    const rawMarkets = Array.isArray(first?.markets) ? (first.markets as Array<Record<string, unknown>>) : [];
    const open = rawMarkets.filter((m) => m.closed !== true);
    const pool = open.length ? open : rawMarkets;
    if (pool.length === 1) return { ...normalizeMarket(pool[0]), eventSlug: event };
    const sameSlug = pool.find((m) => m.slug === event);
    if (sameSlug) return { ...normalizeMarket(sameSlug), eventSlug: event };
    const moneyline = pool.filter((m) => m.sportsMarketType === "moneyline");
    if (moneyline.length === 1) return { ...normalizeMarket(moneyline[0]), eventSlug: event };
    if (pool.length > 1) {
      throw new MarketChoiceNeeded(
        event,
        pool.slice(0, 12).map((m) => ({ question: String(m.question ?? m.slug), slug: String(m.slug ?? "") })),
      );
    }
  }
  throw new Error(`No Polymarket market found for "${input}". Paste the market's link or slug.`);
}

export async function getBook(tokenId: string, deadline: Deadline): Promise<{ bids: Level[]; asks: Level[] }> {
  const raw = (await getJson(`${CLOB}/book?token_id=${encodeURIComponent(tokenId)}`, deadline)) as Record<string, unknown>;
  return { bids: parseLevels(raw?.bids), asks: parseLevels(raw?.asks) };
}

// Polymarket positions sit in a proxy wallet tied to the user's login address.
// Returns the proxy if Polymarket knows one, otherwise the address as given.
export async function resolveProxy(wallet: string, deadline: Deadline): Promise<string> {
  try {
    const profile = (await getJson(`${GAMMA}/public-profile?address=${wallet}`, deadline)) as Record<string, unknown>;
    const proxy = profile?.proxyWallet;
    if (typeof proxy === "string" && /^0x[0-9a-fA-F]{40}$/.test(proxy)) return proxy.toLowerCase();
  } catch {
    // no profile: the address may already be the proxy wallet
  }
  return wallet.toLowerCase();
}

export async function getPositions(
  user: string,
  deadline: Deadline,
  options: { redeemable?: boolean } = {},
): Promise<Position[]> {
  const params = new URLSearchParams({ user, limit: "100", sizeThreshold: "0.01" });
  if (options.redeemable !== undefined) params.set("redeemable", String(options.redeemable));
  const raw = await getJson(`${DATA}/positions?${params}`, deadline);
  const list = Array.isArray(raw) ? raw : [];
  return list.map(normalizePosition);
}

export function marketLink(eventSlug: string | null, marketSlug: string): string {
  if (eventSlug && marketSlug && eventSlug !== marketSlug) return `https://polymarket.com/event/${eventSlug}/${marketSlug}`;
  return `https://polymarket.com/event/${eventSlug ?? marketSlug}`;
}
