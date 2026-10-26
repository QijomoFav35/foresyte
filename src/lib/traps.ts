// The two traps, computed from data the tools have already fetched. Pure and unit-tested.
//   Trap 1, liquidity: "you can't get out" — the app shows money you cannot sell.
//   Trap 2, rules: "you can be right and still lose" — see rules.ts.

import { EXIT_BAND, bestAsk, bestBid, exitDepth, sellProceeds, spread, walkAsks, type Level } from "./book.ts";
import { analyzeRules, type RulesResult } from "./rules.ts";
import type { Market, Position } from "./polymarket.ts";
import { cents, combine, finite, pct, sortFlags, usd, type Flag, type RiskLevel } from "./verdict.ts";

// Thresholds. Published in the README; every one of them is checked against live markets.
export const SLIPPAGE_LIMIT = 0.05; // average fill more than 5% worse than the shown price
export const SPREAD_LIMIT = 0.05; // best ask minus best bid above 5 cents
export const THIN_MULTIPLE = 2; // exit depth under 2x the stake
export const EXIT_DISCOUNT_LIMIT = 0.03; // selling now returns more than 3% under displayed value

export type EntryAssessment = {
  level: RiskLevel;
  headline: string;
  flags: Flag[];
  outcome: string;
  stakeUsdc: number;
  shownPrice: number | null;
  fillPrice: number | null;
  sharesBought: number;
  filled: boolean;
  sellBackNow: number; // USDC you would get selling those shares right after buying
  exitDepthUsdc: number;
  spreadCents: number | null;
  rules: RulesResult;
};

export function assessEntry(
  market: Market,
  outcomeIndex: number,
  book: { bids: Level[]; asks: Level[] },
  stakeUsdc: number,
  now: Date = new Date(),
): EntryAssessment {
  const outcome = market.outcomes[outcomeIndex] ?? "Yes";
  const flags: Flag[] = [];
  const fill = walkAsks(book.asks, stakeUsdc);
  const depth = exitDepth(book.bids);
  const gap = spread(book.bids, book.asks);
  const shown = finite(market.prices[outcomeIndex]) ?? bestAsk(book.asks);
  const sale = sellProceeds(book.bids, fill.shares);

  // Trap 1: liquidity
  if (book.asks.length === 0) {
    flags.push({ level: "HIGH_RISK", check: "no_sellers", message: `Nobody is selling ${outcome} right now, so a bet can't fill.` });
  } else if (!fill.filled) {
    flags.push({
      level: "HIGH_RISK",
      check: "cannot_fill",
      message: `Only ${usd(fill.available)} of ${outcome} is for sale. A ${usd(stakeUsdc)} bet can't fill.`,
    });
  }
  if (book.bids.length === 0) {
    flags.push({
      level: "HIGH_RISK",
      check: "no_buyers",
      message: "Nobody is buying this market right now. Once you're in, you're in until it resolves.",
    });
  } else if (depth < stakeUsdc) {
    flags.push({
      level: "HIGH_RISK",
      check: "exit_thinner_than_stake",
      message: `Only ${usd(depth)} of buyers exist within ${cents(EXIT_BAND)} of the price. If you buy ${usd(stakeUsdc)}, you can't cash out until it resolves.`,
    });
  } else if (depth < THIN_MULTIPLE * stakeUsdc) {
    flags.push({
      level: "CAUTION",
      check: "exit_thin",
      message: `Few buyers here (${usd(depth)} near the price). Selling early would push the price against you.`,
    });
  }
  if (fill.avgPrice !== null && shown !== null && shown > 0 && fill.avgPrice > shown * (1 + SLIPPAGE_LIMIT)) {
    flags.push({
      level: "CAUTION",
      check: "slippage",
      message: `Shows ${cents(shown)}, but your size fills at ${cents(fill.avgPrice)} on average.`,
    });
  }
  if (gap !== null && gap > SPREAD_LIMIT + 1e-9) {
    flags.push({
      level: "CAUTION",
      check: "wide_spread",
      message: `Buying and selling right now are ${cents(gap)} apart, so you start that far underwater.`,
    });
  }

  // Trap 2: rules
  const rules = analyzeRules(
    { question: market.question, description: market.description, endDate: market.endDate, resolutionSource: market.resolutionSource },
    now,
  );
  flags.push(...rules.flags);

  const sorted = sortFlags(flags);
  const level = combine(sorted);
  let headline: string;
  if (fill.shares > 0) {
    headline = `${level}. A ${usd(fill.spent)} bet on ${outcome} buys ${fill.shares.toFixed(1)} shares; selling them right back would return ${usd(sale.proceeds)}.`;
    if (sale.unsoldShares > 0.05) headline += ` ${sale.unsoldShares.toFixed(1)} shares would find no buyer at all.`;
  } else {
    headline = `${level}. A ${usd(stakeUsdc)} bet on ${outcome} can't be placed: there are no sellers.`;
  }
  if (level === "CLEAR") headline += " No traps found at this size.";

  return {
    level,
    headline,
    flags: sorted,
    outcome,
    stakeUsdc,
    shownPrice: shown,
    fillPrice: fill.avgPrice,
    sharesBought: fill.shares,
    filled: fill.filled,
    sellBackNow: sale.proceeds,
    exitDepthUsdc: depth,
    spreadCents: gap === null ? null : gap * 100,
    rules,
  };
}

export type HoldingAssessment = {
  level: RiskLevel;
  title: string;
  outcome: string;
  link: string;
  shares: number;
  costBasis: number;
  displayedValue: number;
  pnl: number;
  sellNow: number;
  unsoldShares: number;
  daysLeft: number | null;
  notes: string[];
  flags: Flag[];
};

export function assessHolding(
  position: Position,
  book: { bids: Level[]; asks: Level[] } | null,
  market: Market | null,
  link: string,
  now: Date = new Date(),
): HoldingAssessment {
  const flags: Flag[] = [];
  const notes: string[] = [];
  const cost = finite(position.initialValue) ?? (finite(position.size) ?? 0) * (finite(position.avgPrice) ?? 0);
  const displayed = finite(position.currentValue) ?? 0;
  const pnl = displayed - cost;
  notes.push(pnl >= 0 ? `Up ${usd(pnl)} on paper.` : `Down ${usd(-pnl)} on paper.`);

  let sellNow = 0;
  let unsold = position.size;
  let thin = false;
  if (book) {
    const sale = sellProceeds(book.bids, position.size);
    sellNow = sale.proceeds;
    unsold = sale.unsoldShares;
    if (book.bids.length === 0 || bestBid(book.bids) === null) {
      thin = true;
      flags.push({ level: "HIGH_RISK", check: "no_buyers", message: "No buyers right now. You can't exit until someone bids." });
    } else if (sale.unsoldShares > 0.05) {
      thin = true;
      flags.push({
        level: "HIGH_RISK",
        check: "exit_closing",
        message: `Buyers are thinning out. Cash out now while you still can: only ${sale.soldShares.toFixed(1)} of your ${position.size.toFixed(1)} shares can be sold right now, for about ${usd(sale.proceeds)}.`,
      });
    } else if (displayed > 0 && sale.proceeds < displayed * (1 - EXIT_DISCOUNT_LIMIT)) {
      thin = true;
      flags.push({
        level: "CAUTION",
        check: "exit_discount",
        message: `Selling now returns about ${usd(sale.proceeds)}, ${pct(1 - sale.proceeds / displayed)} below the displayed ${usd(displayed)}, because buyers are thin.`,
      });
    } else {
      notes.push(`Selling everything now returns about ${usd(sale.proceeds)}.`);
    }
  } else {
    notes.push("Couldn't read this market's order book in time.");
  }

  let daysLeft: number | null = null;
  let rulesRisk = false;
  if (market) {
    const rules = analyzeRules(
      { question: market.question, description: market.description, endDate: market.endDate, resolutionSource: market.resolutionSource },
      now,
    );
    flags.push(...rules.flags);
    rulesRisk = rules.flags.some((f) => f.check === "reporting_deadline_near_weekend" || f.check === "reporting_dependent");
    daysLeft = rules.deadline?.daysLeft ?? null;
    if (daysLeft !== null && daysLeft >= 0) notes.push(`Resolves in ${daysLeft === 0 ? "less than a day" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}.`);
  }

  if (book && sellNow > cost && (rulesRisk || thin)) {
    notes.push(`You could lock in about ${usd(sellNow - cost)} profit now instead of waiting on an uncertain resolution.`);
  }

  const sorted = sortFlags(flags);
  return {
    level: combine(sorted),
    title: position.title,
    outcome: position.outcome,
    link,
    shares: position.size,
    costBasis: cost,
    displayedValue: displayed,
    pnl,
    sellNow,
    unsoldShares: unsold,
    daysLeft,
    notes,
    flags: sorted,
  };
}

// Open positions worth watching: not resolved, price strictly between 0 and 1, largest first.
export function openPositions(positions: Position[], limit = 5): Position[] {
  return positions
    .filter((p) => !p.redeemable && p.curPrice > 0 && p.curPrice < 1 && p.size > 0)
    .sort((a, b) => (finite(b.currentValue) ?? 0) - (finite(a.currentValue) ?? 0))
    .slice(0, limit);
}

// Winnings that can still be claimed: redeemable and worth something. Losing positions are redeemable too, at $0.
export function claimable(positions: Position[]): Position[] {
  return positions
    .filter((p) => p.redeemable && (finite(p.currentValue) ?? 0) > 0)
    .sort((a, b) => b.currentValue - a.currentValue);
}
