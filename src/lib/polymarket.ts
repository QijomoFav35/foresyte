const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const DATA = "https://data-api.polymarket.com";
const TIMEOUT_MS = 2500;

export { GAMMA, CLOB, DATA, TIMEOUT_MS };

export async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return res.json();
}

export function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export async function resolveProxy(wallet: string): Promise<string> {
  try {
    const p = await getJson(`${GAMMA}/public-profile?address=${wallet}`);
    if (typeof p?.proxyWallet === "string" && /^0x[a-fA-F0-9]{40}$/.test(p.proxyWallet)) {
      return p.proxyWallet.toLowerCase();
    }
  } catch {
    /* fall through */
  }
  return wallet.toLowerCase();
}

export function marketSlugFromInput(market: string): string {
  const trimmed = market.trim();
  try {
    const u = new URL(trimmed);
    const parts = u.pathname.split("/").filter(Boolean);
    const eventIdx = parts.findIndex((p) => p === "event" || p === "market");
    if (eventIdx >= 0 && parts[eventIdx + 1]) return parts[eventIdx + 1]!;
    return parts[parts.length - 1] || trimmed;
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, "");
  }
}

export async function findMarket(slugOrUrl: string): Promise<any> {
  const slug = marketSlugFromInput(slugOrUrl);
  const markets = await getJson(`${GAMMA}/markets?slug=${encodeURIComponent(slug)}`);
  if (Array.isArray(markets) && markets.length > 0) return markets[0];
  const events = await getJson(`${GAMMA}/events?slug=${encodeURIComponent(slug)}`);
  const ms: any[] = Array.isArray(events) && events[0]?.markets ? events[0].markets : [];
  if (ms.length === 1) return ms[0];
  if (ms.length > 1) {
    throw new Error(`"${slug}" is an event with ${ms.length} markets. Pass the specific market's slug.`);
  }
  throw new Error(`No Polymarket market found for "${slug}".`);
}

export type Level = { price: number; size: number };

export function levels(raw: unknown): Level[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l: any) => ({ price: num(l?.price), size: num(l?.size) }))
    .filter((l) => l.price > 0 && l.size > 0);
}

export function walkAsks(asks: Level[], stakeUsdc: number) {
  const sorted = [...asks].sort((a, b) => a.price - b.price);
  let spent = 0;
  let shares = 0;
  for (const lvl of sorted) {
    if (spent >= stakeUsdc) break;
    const take = Math.min(lvl.price * lvl.size, stakeUsdc - spent);
    spent += take;
    shares += take / lvl.price;
  }
  return {
    spent,
    shares,
    filled: spent >= stakeUsdc - 1e-9,
    avgPrice: shares > 0 ? spent / shares : NaN,
    bestAsk: sorted[0]?.price ?? NaN,
  };
}

export function sellProceeds(bids: Level[], shares: number) {
  const sorted = [...bids].sort((a, b) => b.price - a.price);
  let remaining = shares;
  let proceeds = 0;
  for (const lvl of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(lvl.size, remaining);
    proceeds += take * lvl.price;
    remaining -= take;
  }
  return { proceeds, filledShares: shares - Math.max(remaining, 0) };
}

export function exitDepth(bids: Level[]) {
  const sorted = [...bids].sort((a, b) => b.price - a.price);
  const best = sorted[0]?.price ?? NaN;
  if (!Number.isFinite(best)) return { bestBid: NaN, depthUsdc: 0 };
  return {
    bestBid: best,
    depthUsdc: sorted.filter((l) => l.price >= best - 0.05).reduce((s, l) => s + l.price * l.size, 0),
  };
}

export async function fetchBook(tokenId: string): Promise<{ bids: Level[]; asks: Level[] }> {
  const book = await getJson(`${CLOB}/book?token_id=${encodeURIComponent(tokenId)}`);
  return { bids: levels(book?.bids), asks: levels(book?.asks) };
}

export function money(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function cents(price: number): string {
  if (!Number.isFinite(price)) return "?";
  return String(Math.round(price * 100));
}

export function marketUrl(slug?: string, conditionId?: string): string {
  if (slug) return `https://polymarket.com/event/${slug}`;
  if (conditionId) return `https://polymarket.com`;
  return "https://polymarket.com";
}
