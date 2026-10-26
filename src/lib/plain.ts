// Plain English for people. Rule: a 10-year-old can read every line.
// Agents still get exact numbers in structuredContent; this file only shapes the words a person reads.

import type { Flag, RiskLevel } from "./verdict.ts";

// What each level means, in words a person uses.
export const VERDICT: Record<RiskLevel, string> = {
  CLEAR: "Looks safe at this size.",
  CAUTION: "Be careful.",
  HIGH_RISK: "This is a trap.",
};

// The rule from the Strategy case: near the deadline, buyers vanish and the rules decide it.
export const EXIT_WINDOW_DAYS = 3;

export function daysUntil(endDate: string | null | undefined, now: Date = new Date()): number | null {
  const t = endDate ? Date.parse(endDate) : NaN;
  return Number.isFinite(t) ? (t - now.getTime()) / 86_400_000 : null;
}

export function inExitWindow(endDate: string | null | undefined, now: Date = new Date()): boolean {
  const d = daysUntil(endDate, now);
  return d !== null && d >= 0 && d <= EXIT_WINDOW_DAYS;
}

export function timeLeft(days: number | null): string {
  if (days === null || days < 0) return "soon";
  if (days < 1) return "less than a day";
  const whole = Math.floor(days);
  return `${whole} day${whole === 1 ? "" : "s"}`;
}

const has = (flags: Flag[], ...checks: string[]) => flags.some((f) => checks.includes(f.check));

// Risk read for someone looking at a market before buying. Describes the risk; it never tells anyone to trade.
export function whatToDoBeforeBuying(level: RiskLevel, flags: Flag[]): string {
  if (has(flags, "exit_window")) return "The market is in its final 3 days, when buyers tend to disappear and the rules decide the result. Entries this late carry the highest risk.";
  if (has(flags, "no_sellers", "cannot_fill")) return "Not enough contracts are for sale at this size. A smaller size may fill.";
  if (has(flags, "no_buyers", "exit_thinner_than_stake")) return "Exit liquidity is below this size. A position this large may not be sellable before the market resolves.";
  if (has(flags, "reporting_deadline_near_weekend")) return "The result depends on a report landing before a weekend or holiday deadline. Being right about the event may not be enough.";
  if (level === "CAUTION") return "Moderate risk at this size. The exit price and timing are worth knowing before entry.";
  return "No traps found at this size.";
}

// Risk read for someone already holding a position.
export function whatToDoWhileHolding(level: RiskLevel, flags: Flag[], canLockIn: boolean): string {
  if (has(flags, "exit_window")) return "Inside the final 3 days with a risky market. Exits are still available now and tend to thin out from here.";
  if (has(flags, "no_buyers")) return "No buyers right now. An exit has to wait for new bids.";
  if (has(flags, "exit_closing")) return "Buyers are running out. Only part of this position can be sold at current prices.";
  if (canLockIn) return "Selling now would lock in the profit shown before an uncertain resolution.";
  if (level === "CAUTION") return "Worth watching. The exit price and timing can change quickly.";
  return "No traps on this position right now.";
}
