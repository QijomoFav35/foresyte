// Turns individual flags into one verdict, and formats numbers the same way everywhere.

export type RiskLevel = "CLEAR" | "CAUTION" | "HIGH_RISK";

export type Flag = {
  level: Exclude<RiskLevel, "CLEAR">;
  check: string; // short machine-readable name, e.g. "exit_thinner_than_stake"
  message: string; // plain-English sentence with real numbers
};

const RANK: Record<RiskLevel, number> = { CLEAR: 0, CAUTION: 1, HIGH_RISK: 2 };

export function combine(flags: Flag[]): RiskLevel {
  let level: RiskLevel = "CLEAR";
  for (const flag of flags) if (RANK[flag.level] > RANK[level]) level = flag.level;
  return level;
}

// High-risk flags first, then caution, keeping each group's original order.
export function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort((a, b) => RANK[b.level] - RANK[a.level]);
}

export function usd(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  const text = abs >= 100 ? Math.round(abs).toLocaleString("en-US") : abs.toFixed(2).replace(/\.00$/, "");
  return `${value < 0 ? "-" : ""}$${text}`;
}

export function cents(price: number): string {
  const c = price * 100;
  return `${c >= 10 ? c.toFixed(0) : c.toFixed(1).replace(/\.0$/, "")}¢`;
}

// Share counts: one decimal for small holdings, whole numbers with commas for big ones.
export function shareCount(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.abs(value) >= 1000 ? Math.round(value).toLocaleString("en-US") : value.toFixed(1);
}

export function pct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function finite(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
