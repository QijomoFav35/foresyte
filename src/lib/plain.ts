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

// One clear next step for someone about to bet.
export function whatToDoBeforeBuying(level: RiskLevel, flags: Flag[]): string {
  if (has(flags, "exit_window")) return "Don't buy this close to the end. If you do, bet only what you are fine losing.";
  if (has(flags, "no_sellers", "cannot_fill")) return "Use a smaller amount, or skip this market.";
  if (has(flags, "no_buyers", "exit_thinner_than_stake")) return "Skip it, or bet only what you are fine losing completely. You may not be able to sell.";
  if (has(flags, "reporting_deadline_near_weekend")) return "Skip it unless you are sure the news will be out before the deadline.";
  if (level === "CAUTION") return "Bet small, and decide now when you will sell.";
  return "Go ahead if you like the bet.";
}

// One clear next step for someone already holding.
export function whatToDoWhileHolding(level: RiskLevel, flags: Flag[], canLockIn: boolean): string {
  if (has(flags, "exit_window")) return "Sell now while people are still buying.";
  if (has(flags, "no_buyers")) return "Nobody is buying right now. Check again soon and sell when buyers come back.";
  if (has(flags, "exit_closing")) return "Sell what you can now. Buyers are running out.";
  if (canLockIn) return "Think about selling now to keep your profit.";
  if (level === "CAUTION") return "Keep an eye on it, and plan when you will sell.";
  return "Nothing to do right now.";
}
