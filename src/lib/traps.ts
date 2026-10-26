// The two traps, computed from data the tools have already fetched. Pure and unit-tested.
//   Trap 1, liquidity: "you can't get out" — the app shows money you cannot sell.
//   Trap 2, rules: "you can be right and still lose" — see rules.ts.

import { bestAsk, bestBid, exitDepth, sellProceeds, spread, walkAsks, type Level } from "./book.ts";
import { analyzeRules, type RulesResult } from "./rules.ts";
import type { Market, Position } from "./polymarket.ts";
import { cents, combine, finite, pct, shareCount, sortFlags, usd, type Flag, type RiskLevel } from "./verdict.ts";
import { VERDICT, daysUntil, inExitWindow, timeLeft, whatToDoBeforeBuying, whatToDoWhileHolding } from "./plain.ts";

// Thresholds. Published in the README; every one of them is checked against live markets.
export const SLIPPAGE_LIMIT = 0.05; // average fill more than 5% worse than the shown price
export const SPREAD_LIMIT = 0.05; // best ask minus best bid above 5 cents
export const THIN_MULTIPLE = 2; // exit depth under 2x the stake
export const EXIT_DISCOUNT_LIMIT = 0.03; // selling now returns more than 3% under displayed value

export type EntryAssessment = {
  level: RiskLevel;
  headline: string;
  whatToDo: string;
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
    flags.push({ level: "HIGH_RISK", check: "no_sellers", message: `Nobody is selling ${outcome} right now, so a buy can't fill.` });
  } else if (!fill.filled) {
    flags.push({
      level: "HIGH_RISK",
      check: "cannot_fill",
      message: `Only ${usd(fill.available)} of ${outcome} is for sale, so a ${usd(stakeUsdc)} buy can't fill in full.`,
    });
  }
  if (book.bids.length === 0) {
    flags.push({
      level: "HIGH_RISK",
      check: "no_buyers",
      message: "Nobody is buying in this market right now. A position here can't be sold until bids return or the market resolves.",
    });
  } else if (depth < stakeUsdc) {
    flags.push({
      level: "HIGH_RISK",
      check: "exit_thinner_than_stake",
      message: `Only ${usd(depth)} of buyers exist near the current price. A ${usd(stakeUsdc)} position couldn't be sold before the market resolves.`,
    });
  } else if (depth < THIN_MULTIPLE * stakeUsdc) {
    flags.push({
      level: "CAUTION",
      check: "exit_thin",
      message: `Few buyers here (${usd(depth)} near the price). Selling early would fill below the price shown.`,
    });
  }
  if (fill.avgPrice !== null && shown !== null && shown > 0 && fill.avgPrice > shown * (1 + SLIPPAGE_LIMIT)) {
    flags.push({
      level: "CAUTION",
      check: "slippage",
      message: `Shows ${cents(shown)}, but this size fills at ${cents(fill.avgPrice)} on average, above the price on screen.`,
    });
  }
  if (gap !== null && gap > SPREAD_LIMIT + 1e-9) {
    flags.push({
      level: "CAUTION",
      check: "wide_spread",
      message: `The buy price and the sell price are ${cents(gap)} apart, so a position starts ${cents(gap)} down on every contract.`,
    });
  }

  // Trap 2: rules
  const rules = analyzeRules(
    { question: market.question, description: market.description, endDate: market.endDate, resolutionSource: market.resolutionSource },
    now,
  );
  flags.push(...rules.flags);

  // The exit window: a risky market within 3 days of its end. This is when buyers vanish and rules decide it.
  const liquidityTrap = flags.some((f) => f.level === "HIGH_RISK" && f.check !== "no_sellers" && f.check !== "cannot_fill");
  if ((rules.flags.length > 0 || liquidityTrap) && inExitWindow(market.endDate, now)) {
    flags.push({
      level: "HIGH_RISK",
      check: "exit_window",
      message: `This market ends in ${timeLeft(daysUntil(market.endDate, now))}. Near the end, buyers disappear and the rules decide who wins. Entries this late carry the highest risk.`,
    });
  }

  const sorted = sortFlags(flags);
  const level = combine(sorted);
  let headline: string;
  if (fill.shares > 0) {
    headline = `${VERDICT[level]} Buying ${usd(fill.spent)} of ${outcome} and selling straight back would return ${usd(sale.proceeds)}.`;
    if (sale.unsoldShares > 0.05) headline += ` Part of that position (${shareCount(sale.unsoldShares)} of ${shareCount(fill.shares)} contracts) would find no buyer at all.`;
  } else {
    headline = `${VERDICT[level]} A ${usd(stakeUsdc)} buy of ${outcome} can't fill: nobody is selling.`;
  }
  if (level === "CLEAR") headline += " No traps found at this size.";

  return {
    level,
    headline,
    whatToDo: whatToDoBeforeBuying(level, sorted),
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
  whatToDo: string;
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
  notes.push(pnl >= 0 ? `Up ${usd(pnl)} on paper.` : `Down ${usd(-pnl)} on paper.`);  // "on paper" = what the app shows, not cash

  let sellNow = 0;
  let unsold = position.size;
  let thin = false;
  if (book) {
    const sale = sellProceeds(book.bids, position.size);
    sellNow = sale.proceeds;
    unsold = sale.unsoldShares;
    if (book.bids.length === 0 || bestBid(book.bids) === null) {
      thin = true;
      flags.push({ level: "HIGH_RISK", check: "no_buyers", message: "Nobody is buying right now. An exit has to wait for new bids." });
    } else if (sale.unsoldShares > 0.05) {
      thin = true;
      flags.push({
        level: "HIGH_RISK",
        check: "exit_closing",
        message: `Buyers are thinning out: only ${shareCount(sale.soldShares)} of your ${shareCount(position.size)} contracts can be sold right now, for about ${usd(sale.proceeds)}.`,
      });
    } else if (displayed > 0 && sale.proceeds < displayed * (1 - EXIT_DISCOUNT_LIMIT)) {
      thin = true;
      flags.push({
        level: "CAUTION",
        check: "exit_discount",
        message: `Selling now returns about ${usd(sale.proceeds)}, ${pct(1 - sale.proceeds / displayed)} less than the ${usd(displayed)} the app shows, because there are few buyers.`,
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

  // The exit window: rules or liquidity risk within 3 days of the end. Say "get out now" while there is still a way out.
  const endDate = market?.endDate ?? null;
  if ((rulesRisk || thin) && inExitWindow(endDate, now)) {
    flags.push({
      level: "HIGH_RISK",
      check: "exit_window",
      message: `This market ends in ${timeLeft(daysUntil(endDate, now))}. Near the end, buyers tend to disappear and the rules decide the result. Exits are still available now.`,
    });
  }

  const canLockIn = Boolean(book && sellNow > cost && (rulesRisk || thin));
  if (canLockIn) {
    notes.push(`Selling now would lock in about ${usd(sellNow - cost)} profit before an uncertain resolution.`);
  }

  const sorted = sortFlags(flags);
  const level = combine(sorted);
  return {
    level,
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
    whatToDo: whatToDoWhileHolding(level, sorted, canLockIn),
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
