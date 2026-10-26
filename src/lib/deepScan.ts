// The paid deep scan. Everything trap_check does, plus what a careful trader works out by hand:
//   - an exit ladder: buy $X, sell straight back, what comes back?
//   - the largest size that can still exit
//   - the latest day to sell before the deadline danger zone
//   - the other side of the market
//   - a numbered risk read in plain English
// Pure: takes data already fetched, no network. Unit-tested.

import { sellProceeds, walkAsks, type Level } from "./book.ts";
import type { Market } from "./polymarket.ts";
import { EXIT_WINDOW_DAYS, VERDICT, daysUntil } from "./plain.ts";
import { assessEntry, type EntryAssessment } from "./traps.ts";
import { cents, usd } from "./verdict.ts";

type Book = { bids: Level[]; asks: Level[] };

export const LADDER = [10, 50, 100, 250, 1000, 5000, 25000];
export const SAFE_LOSS = 0.1; // "you can get out" = selling straight back loses at most 10%

export type LadderStep = {
  betUsdc: number;
  canBuyAll: boolean;
  getBackUsdc: number; // selling straight back into today's buyers
  lossPct: number; // 0..1
  stuckShares: number; // shares nobody would buy
};

export type DeepScan = {
  level: EntryAssessment["level"];
  verdict: string;
  headline: string;
  entry: EntryAssessment;
  ladder: LadderStep[];
  safeBetUsdc: number; // largest size you can buy and sell straight back losing at most 10%
  sellBy: string | null; // e.g. "Thursday, May 28"
  otherSide: { outcome: string; level: EntryAssessment["level"]; headline: string } | null;
  plan: string[];
  report: string; // the whole thing, ready for a person to read
};

export function roundTrip(book: Book, betUsdc: number): LadderStep {
  const fill = walkAsks(book.asks, betUsdc);
  const sale = sellProceeds(book.bids, fill.shares);
  const spent = fill.spent;
  return {
    betUsdc,
    canBuyAll: fill.filled,
    getBackUsdc: sale.proceeds,
    lossPct: spent > 0 ? Math.max(0, 1 - sale.proceeds / spent) : 1,
    stuckShares: sale.unsoldShares,
  };
}

function exitable(step: LadderStep): boolean {
  return step.canBuyAll && step.stuckShares < 0.05 && step.lossPct <= SAFE_LOSS;
}

// Largest size (to the dollar) that can be bought and sold straight back losing at most 10%.
export function safeBet(book: Book, cap = 1_000_000): number {
  if (!exitable(roundTrip(book, 1))) return 0;
  let lo = 1;
  let hi = cap;
  if (exitable(roundTrip(book, hi))) return hi;
  for (let i = 0; i < 40 && hi - lo > 1; i++) {
    const mid = Math.floor((lo + hi) / 2);
    if (exitable(roundTrip(book, mid))) lo = mid;
    else hi = mid;
  }
  return lo;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The day the exit window opens, in New York time.
export function sellByLabel(endDate: string | null, now: Date = new Date()): string | null {
  const end = endDate ? Date.parse(endDate) : NaN;
  if (!Number.isFinite(end)) return null;
  const t = new Date(end - EXIT_WINDOW_DAYS * 86_400_000);
  if (t.getTime() <= now.getTime()) return "now";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric", weekday: "long" }).formatToParts(t);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const weekday = get("weekday") || WEEKDAYS[t.getUTCDay()];
  return `${weekday}, ${MONTHS[Number(get("month")) - 1]} ${Number(get("day"))}`;
}

export function deepScan(
  market: Market,
  outcomeIndex: number,
  book: Book,
  stakeUsdc: number,
  otherBook: Book | null,
  now: Date = new Date(),
): DeepScan {
  const entry = assessEntry(market, outcomeIndex, book, stakeUsdc, now);
  const sizes = [...new Set([...LADDER, Math.round(stakeUsdc)])].sort((a, b) => a - b);
  const ladder = sizes.map((s) => roundTrip(book, s));
  const safe = safeBet(book);
  const sellBy = entry.rules.flags.length > 0 || entry.level === "HIGH_RISK" ? sellByLabel(market.endDate, now) : null;

  let otherSide: DeepScan["otherSide"] = null;
  if (otherBook && market.outcomes.length === 2) {
    const otherIndex = outcomeIndex === 0 ? 1 : 0;
    const o = assessEntry(market, otherIndex, otherBook, stakeUsdc, now);
    otherSide = { outcome: o.outcome, level: o.level, headline: o.headline };
  }

  const plan: string[] = [];
  const days = daysUntil(market.endDate, now);
  if (entry.flags.some((f) => f.check === "exit_window")) {
    plan.push("The market is in its final 3 days, when buyers tend to disappear.");
  } else if (safe === 0) {
    plan.push("Even $1 can't be sold straight back within 10% of its cost.");
  } else if (safe < stakeUsdc) {
    plan.push(`Exits hold up to about ${usd(safe)}, below the ${usd(stakeUsdc)} checked. Above ${usd(safe)}, a position may not be sellable.`);
  } else {
    plan.push(`A ${usd(stakeUsdc)} position fits this book. Exits hold up to about ${usd(safe)}.`);
  }
  if (sellBy === "now") plan.push("Already inside the deadline window: exits are available now and tend to thin out from here.");
  else if (sellBy) plan.push(`The 3-day deadline window opens ${sellBy}. From then, the rules and thin buyers drive the outcome.`);
  if (entry.rules.basis === "confirmation") {
    plan.push("Settlement depends on an official report before the deadline, not only on the event happening.");
  }
  if (entry.spreadCents !== null && entry.spreadCents > 5) {
    plan.push(`The buy and sell prices are far apart. A limit order${entry.shownPrice ? ` at ${cents(entry.shownPrice)} or lower` : ""} avoids paying the full spread.`);
  }
  if (otherSide && otherSide.level !== "HIGH_RISK" && entry.level === "HIGH_RISK" && !entry.flags.some((f) => f.check.startsWith("reporting") || f.check === "exit_window")) {
    plan.push(`The ${otherSide.outcome} side has deeper exit liquidity.`);
  }
  if (days !== null && days > EXIT_WINDOW_DAYS && entry.level !== "HIGH_RISK") {
    plan.push("Buyers change hour by hour, so a fresh check before selling reflects the current book.");
  }

  const lines: string[] = [entry.headline, ""];
  if (entry.flags.length) lines.push("Why:", ...entry.flags.map((f) => `- ${f.message}`), "");
  lines.push("Buying and selling straight back at each size:");
  for (const step of ladder) {
    if (!step.canBuyAll) {
      lines.push(`- ${usd(step.betUsdc)}: not enough contracts for sale to fill this size.`);
      continue;
    }
    const stuck = step.stuckShares >= 0.05 ? ", and part of it can't be sold at all" : "";
    lines.push(`- ${usd(step.betUsdc)} in, ${usd(step.getBackUsdc)} back (${Math.round(step.lossPct * 100)}% lost${stuck}).`);
  }
  lines.push("", safe > 0 ? `Largest size that can still exit: about ${usd(safe)}.` : "Largest size that can still exit: none. Even $1 is stuck.");
  if (sellBy) lines.push(sellBy === "now" ? "Deadline window: open now." : `Deadline window opens: ${sellBy}.`);
  if (otherSide) lines.push(`Other side (${otherSide.outcome}): ${otherSide.headline}`);
  lines.push("", "Risk read:", ...plan.map((p, i) => `${i + 1}. ${p}`));

  return {
    level: entry.level,
    verdict: VERDICT[entry.level],
    headline: entry.headline,
    entry,
    ladder,
    safeBetUsdc: safe,
    sellBy,
    otherSide,
    plan,
    report: lines.join("\n"),
  };
}
