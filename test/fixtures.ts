// Fixtures for unit tests. Markets are shaped like Gamma's normalized output.
// The Strategy (MicroStrategy) rules text below is reconstructed from news coverage of the May 2026 dispute
// (The Block, DeFi Rate). Replace it with the exact text saved from Gamma before publishing test counts.

import type { Market, Position } from "../src/lib/polymarket.ts";

export const NOW_MAY_20_2026 = new Date("2026-05-20T12:00:00Z");
export const NOW_OCT_26_2026 = new Date("2026-10-26T12:00:00Z");

function market(partial: Partial<Market>): Market {
  return {
    question: "Test market",
    slug: "test-market",
    eventSlug: null,
    conditionId: "0x" + "ab".repeat(32),
    description: "",
    resolutionSource: null,
    endDate: null,
    outcomes: ["Yes", "No"],
    prices: [0.5, 0.5],
    tokenIds: ["1", "2"],
    closed: false,
    negRisk: false,
    ...partial,
  };
}

export const strategyMay31 = market({
  question: "MicroStrategy sells any Bitcoin by May 31?",
  slug: "microstrategy-sells-any-bitcoin-by-may-31",
  description:
    'This market will resolve to "Yes" if MicroStrategy sells any of its Bitcoin by 11:59 PM ET on the date specified in the title. Otherwise, this market will resolve to "No".\n\nThe resolution source for this market will be official information from MicroStrategy, however a consensus of credible reporting will also be used.',
  endDate: "2026-05-31T12:00:00Z", // Sunday May 31, 2026; the 8-K came Monday June 1
  prices: [0.12, 0.88],
});

export const sportsGame = market({
  question: "Lakers vs. Celtics",
  slug: "nba-lal-bos-2026-10-28",
  description:
    "In the upcoming NBA game, scheduled for October 28, 2026 at 7:30 PM ET: If the Lakers win, the market will resolve to Lakers. If the Celtics win, the market will resolve to Celtics. If the game is postponed, this market will remain open until the game has been completed. The result will be determined by the official NBA statistics.",
  endDate: "2026-11-04T23:30:00Z",
  outcomes: ["Lakers", "Celtics"],
  prices: [0.41, 0.59],
});

export const btcPrice = market({
  question: "Will Bitcoin be above $120,000 on November 6?",
  slug: "bitcoin-above-120k-on-november-6",
  description:
    "This market will resolve to Yes if the Binance 1 minute candle for BTC/USDT 12:00 in the ET timezone on the date specified in the title has a final Close price higher than the price specified. Resolution source: https://www.binance.com/en/trade/BTC_USDT",
  endDate: "2026-11-06T17:00:00Z", // Friday, but price markets pay on the candle, not a report
  prices: [0.5, 0.5],
});

export const appleSplitWednesday = market({
  question: "Will Apple announce a stock split by October 28?",
  slug: "apple-stock-split-by-october-28",
  description:
    "This market will resolve to Yes if Apple officially announces a stock split by October 28, 2026, 11:59 PM ET. The resolution source will be official information from Apple, however a consensus of credible reporting may also be used.",
  endDate: "2026-10-29T03:59:00Z", // Wednesday Oct 28 in New York
});

export const fedBeforeThanksgiving = market({
  question: "Will the Treasury announce new tariffs by November 25?",
  slug: "treasury-tariffs-by-november-25",
  description: "Resolves Yes if the US Treasury publicly announces new tariffs by November 25, 2026, 11:59 PM ET, per official press release.",
  endDate: "2026-11-26T04:59:00Z", // Wednesday Nov 25 in New York, day before Thanksgiving
});

export const withClarification = market({
  question: "Will the CEO step down by December 31?",
  slug: "ceo-step-down-by-december-31",
  description:
    "Resolves Yes if the CEO steps down by December 31, 2026, 11:59 PM ET.\n\nAdditional context: A resignation announced but effective after the deadline does not qualify.",
  endDate: "2027-01-01T04:59:00Z",
});

export const vagueRules = market({
  question: "Will the album be considered a hit by December?",
  slug: "album-hit-december",
  description: "Resolution is at the discretion of the market creator based on chart performance.",
  endDate: "2026-12-16T05:00:00Z",
});

export function position(partial: Partial<Position>): Position {
  return {
    asset: "123",
    conditionId: "0x" + "cd".repeat(32),
    title: "Test position",
    slug: "test-market",
    eventSlug: null,
    outcome: "Yes",
    outcomeIndex: 0,
    size: 100,
    avgPrice: 0.4,
    initialValue: 40,
    currentValue: 60,
    cashPnl: 20,
    curPrice: 0.6,
    redeemable: false,
    negativeRisk: false,
    endDate: null,
    ...partial,
  };
}
