// The paid deep scan. Everything trap_check does, plus what a careful trader works out by hand:
//   - an exit ladder: bet $X, change your mind, what do you get back?
//   - the biggest bet you can still get out of
//   - the latest day to sell before the deadline danger zone
//   - the other side of the market
//   - a numbered plan in plain English
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
  safeBetUsdc: number; // biggest bet you can buy and sell straight back losing at most 10%
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

// Largest bet (to the dollar) you could make and still sell straight back losing at most 10%.
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
    plan.push("Don't buy now. The market is in its last 3 days, when buyers disappear.");
  } else if (safe === 0) {
    plan.push("Don't bet here. Even $1 can't be sold back without losing more than 10%.");
  } else if (safe < stakeUsdc) {
    plan.push(`Bet ${usd(safe)} or less, not ${usd(stakeUsdc)}. Above ${usd(safe)} you may not be able to get out.`);
  } else {
    plan.push(`Your ${usd(stakeUsdc)} bet fits. You could go up to about ${usd(safe)} and still get out.`);
  }
  if (sellBy === "now") plan.push("If you already hold it, sell now while people are still buying.");
  else if (sellBy) plan.push(`If you buy, sell by ${sellBy} at the latest. After that, the rules and missing buyers decide it.`);
  if (entry.rules.basis === "confirmation") {
    plan.push("Only bet if you are sure the news will be officially out before the deadline, not just that the event will happen.");
  }
  if (entry.spreadCents !== null && entry.spreadCents > 5) {
    plan.push(`Buy with a limit order${entry.shownPrice ? ` at ${cents(entry.shownPrice)} or lower` : ""}, not at whatever price is there. The buy and sell prices are far apart.`);
  }
  if (otherSide && otherSide.level !== "HIGH_RISK" && entry.level === "HIGH_RISK" && !entry.flags.some((f) => f.check.startsWith("reporting") || f.check === "exit_window")) {
    plan.push(`The ${otherSide.outcome} side is easier to get out of. Look at it if you want this market.`);
  }
  if (days !== null && days > EXIT_WINDOW_DAYS && entry.level !== "HIGH_RISK") {
    plan.push("Run Foresyte again before you sell. Buyers change hour by hour.");
  }

  const lines: string[] = [entry.headline, ""];
  if (entry.flags.length) lines.push("Why:", ...entry.flags.map((f) => `- ${f.message}`), "");
  lines.push("If you bet and then change your mind straight away:");
  for (const step of ladder) {
    if (!step.canBuyAll) {
      lines.push(`- ${usd(step.betUsdc)}: not enough for sale to place this bet.`);
      continue;
    }
    const stuck = step.stuckShares >= 0.05 ? ", and part of it can't be sold at all" : "";
    lines.push(`- Bet ${usd(step.betUsdc)}, get back ${usd(step.getBackUsdc)} (lose ${Math.round(step.lossPct * 100)}%${stuck}).`);
  }
  lines.push("", safe > 0 ? `Biggest bet you can still get out of: about ${usd(safe)}.` : "Biggest bet you can still get out of: none. Even $1 is stuck.");
  if (sellBy) lines.push(sellBy === "now" ? "Latest day to sell: today." : `Latest day to sell: ${sellBy}.`);
  if (otherSide) lines.push(`Other side (${otherSide.outcome}): ${otherSide.headline}`);
  lines.push("", "Your plan:", ...plan.map((p, i) => `${i + 1}. ${p}`));

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
