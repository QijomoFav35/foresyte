// Order-book math. Pure functions: no network, fully unit-tested.
// Prices are in USDC per share (0 to 1). Sizes are in shares.

export type Level = { price: number; size: number };

export const EXIT_BAND = 0.05; // bids within 5 cents of the best bid count as "near the price"

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function parseLevels(raw: unknown): Level[] {
  if (!Array.isArray(raw)) return [];
  const out: Level[] = [];
  for (const entry of raw) {
    const level = entry as { price?: unknown; size?: unknown } | null;
    const price = toNumber(level?.price);
    const size = toNumber(level?.size);
    if (price > 0 && price < 1 && size > 0) out.push({ price, size });
  }
  return out;
}

export function bestAsk(asks: Level[]): number | null {
  return asks.length ? Math.min(...asks.map((l) => l.price)) : null;
}

export function bestBid(bids: Level[]): number | null {
  return bids.length ? Math.max(...bids.map((l) => l.price)) : null;
}

export type Fill = {
  spent: number; // USDC actually spent
  shares: number; // shares received
  filled: boolean; // true when the whole stake was absorbed
  avgPrice: number | null; // USDC per share across the fill
  available: number; // USDC of asks on the whole book
};

// Buy `stakeUsdc` worth by taking asks cheapest-first.
export function walkAsks(asks: Level[], stakeUsdc: number): Fill {
  const sorted = [...asks].sort((a, b) => a.price - b.price);
  const available = sorted.reduce((sum, l) => sum + l.price * l.size, 0);
  let spent = 0;
  let shares = 0;
  for (const level of sorted) {
    const remaining = stakeUsdc - spent;
    if (remaining <= 1e-9) break;
    const take = Math.min(level.price * level.size, remaining);
    spent += take;
    shares += take / level.price;
  }
  return {
    spent,
    shares,
    filled: spent >= stakeUsdc - 1e-6,
    avgPrice: shares > 0 ? spent / shares : null,
    available,
  };
}

export type Sale = {
  proceeds: number; // USDC received
  soldShares: number; // shares the bids could absorb
  unsoldShares: number;
};

// Sell `shares` into bids, best price first.
export function sellProceeds(bids: Level[], shares: number): Sale {
  const sorted = [...bids].sort((a, b) => b.price - a.price);
  let remaining = shares;
  let proceeds = 0;
  for (const level of sorted) {
    if (remaining <= 1e-9) break;
    const take = Math.min(level.size, remaining);
    proceeds += take * level.price;
    remaining -= take;
  }
  const unsold = Math.max(remaining, 0);
  return { proceeds, soldShares: shares - unsold, unsoldShares: unsold };
}

// USDC of buyers within EXIT_BAND of the best bid.
export function exitDepth(bids: Level[]): number {
  const top = bestBid(bids);
  if (top === null) return 0;
  return bids
    .filter((l) => l.price >= top - EXIT_BAND - 1e-9)
    .reduce((sum, l) => sum + l.price * l.size, 0);
}

export function spread(bids: Level[], asks: Level[]): number | null {
  const bid = bestBid(bids);
  const ask = bestAsk(asks);
  return bid === null || ask === null ? null : ask - bid;
}
