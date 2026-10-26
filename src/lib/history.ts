// pattern_summary: reads a wallet's own Polymarket history and finds the habits that make or lose it money.
// Every insight is computed from the wallet's closed bets and trades, carries its numbers, and is ranked
// by dollars. Pure functions: no network, fully unit-tested.
//
// Data: data-api /closed-positions (avgPrice, totalBought, realizedPnl, curPrice, timestamp, title, slug)
// and data-api /activity?type=TRADE (side, price, usdcSize, timestamp). The API does not document units for
// totalBought or timestamps, so stake comes from trades when they exist and timestamps accept s or ms.

import { usd, cents, pct } from "./verdict.ts";

const signed = (v: number) => `${v >= 0 ? "+" : "-"}${usd(Math.abs(v))}`;

export type ClosedBet = {
  asset: string;
  conditionId: string;
  title: string;
  slug: string;
  eventSlug: string | null;
  outcome: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  closedAt: number | null; // ms
};

export type Trade = {
  asset: string;
  side: "BUY" | "SELL";
  price: number;
  size: number;
  usdcSize: number;
  at: number; // ms
  title: string;
  slug: string;
};

export type Category = "Sports" | "Crypto" | "Politics" | "Economy & markets" | "World affairs" | "Culture" | "Science & tech" | "Other";
export type MarketKind = "Live game" | "Short-term crypto up/down" | "Price target" | "Deadline (\"by date\")" | "Other";
export type Band = "Longshot (under 15¢)" | "Underdog (15–40¢)" | "Coin flip (40–60¢)" | "Favorite (60–85¢)" | "Heavy favorite (85¢+)";

export const MIN_SAMPLE = 5;
const DAY = 86_400_000;

const SPORTS = /\b(nba|nfl|mlb|nhl|wnba|mls|epl|ucl|uel|cbb|cfb|ncaa|atp|wta|ufc|mma|f1|formula 1|laliga|la liga|serie a|bundesliga|ligue 1|premier league|champions league|world cup|super bowl|stanley cup|grand slam|wimbledon|boxing|cricket|ipl|euroleague|basketball|football|soccer|tennis|golf|pga|nascar)\b| vs\.? |\bwin on 20\d\d-/i;
const SPORTS_SLUG = /^(nba|nfl|mlb|nhl|wnba|mls|epl|ucl|uel|cbb|cfb|atp|wta|ufc|bun|lal|sea|fl1|ere|por|arg|bra|kbo|npb|cs2|lol|val|dota2)-/i;
const CRYPTO = /\b(bitcoin|btc|ethereum|eth|solana|sol|xrp|doge|dogecoin|crypto|memecoin|pump\.fun|bnb|cardano|stablecoin|altcoin|coinbase|binance)s?\b/i;
const ECONOMY = /\b(fed|fomc|interest rate|rate cut|rate hike|cpi|inflation|gdp|recession|jobs report|unemployment|payrolls|stock|s&p|nasdaq|dow|earnings|ipo|microstrategy|strategy inc|tesla|nvidia|apple|amazon|google|meta|oil|gold|treasury|yield|tariff)s?\b/i;
const POLITICS = /\b(election|elected|president|presidential|trump|biden|harris|vance|senate|congress|house seat|governor|mayor|parliament|prime minister|primary|nominee|nomination|cabinet|impeach|supreme court|democrat|republican|poll|approval rating|executive order|veto)s?\b/i;
const WORLD = /\b(war|ceasefire|israel|gaza|ukraine|russia|china|taiwan|iran|nato|un security|invasion|strike on|missile|sanction)s?\b/i;
const CULTURE = /\b(oscar|grammy|emmy|movie|film|box office|album|song|billboard|spotify|netflix|youtube|tiktok|tweet|mrbeast|taylor swift|kanye|drake|celebrity|award|eurovision|time person of the year)s?\b/i;
const SCIENCE = /\b(ai|openai|gpt|gemini|claude|anthropic|spacex|starship|nasa|launch|temperature|hurricane|earthquake|weather|climate|measles|covid|pandemic)s?\b/i;

export function categorize(title: string, slug: string): Category {
  const text = `${title} ${slug.replace(/-/g, " ")}`;
  if (SPORTS_SLUG.test(slug) || SPORTS.test(text)) return "Sports";
  if (CRYPTO.test(text)) return "Crypto";
  if (ECONOMY.test(text)) return "Economy & markets";
  if (POLITICS.test(text)) return "Politics";
  if (WORLD.test(text)) return "World affairs";
  if (CULTURE.test(text)) return "Culture";
  if (SCIENCE.test(text)) return "Science & tech";
  return "Other";
}

const DEADLINE = /\b(?:by|before|no later than|on or before)\s+(?:the\s+)?(?:end\s+of\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]\b|20\d\d|\d{1,2}[/.-])/i;

export function kindOf(title: string, slug: string, category: Category): MarketKind {
  if (/up or down|updown|up-or-down/i.test(`${title} ${slug}`)) return "Short-term crypto up/down";
  if (category === "Sports" && (/ vs\.? /i.test(title) || /\d{4}-\d{2}-\d{2}/.test(slug))) return "Live game";
  if (/\b(above|below|hit|reach|dip to|close at|price of)\b.*\$?\d/i.test(title) && (category === "Crypto" || category === "Economy & markets")) return "Price target";
  if (DEADLINE.test(title)) return "Deadline (\"by date\")";
  return "Other";
}

export function bandOf(price: number): Band {
  if (price < 0.15) return "Longshot (under 15¢)";
  if (price < 0.4) return "Underdog (15–40¢)";
  if (price < 0.6) return "Coin flip (40–60¢)";
  if (price < 0.85) return "Favorite (60–85¢)";
  return "Heavy favorite (85¢+)";
}

export function toMs(timestamp: number | null | undefined): number | null {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return null;
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

type Bet = ClosedBet & {
  stake: number;
  result: "won" | "lost" | "sold";
  category: Category;
  kind: MarketKind;
  band: Band;
  soldAny: boolean;
};

export type GroupStats = {
  name: string;
  bets: number;
  staked: number;
  net: number;
  resolved: number;
  wins: number;
  avgEntry: number; // mean entry price of resolved bets: the win rate the market priced in
};

function group(bets: Bet[], key: (b: Bet) => string): GroupStats[] {
  const map = new Map<string, Bet[]>();
  for (const b of bets) {
    const k = key(b);
    const list = map.get(k);
    if (list) list.push(b);
    else map.set(k, [b]);
  }
  return [...map.entries()].map(([name, list]) => {
    const resolved = list.filter((b) => b.result !== "sold");
    return {
      name,
      bets: list.length,
      staked: list.reduce((s, b) => s + b.stake, 0),
      net: list.reduce((s, b) => s + b.realizedPnl, 0),
      resolved: resolved.length,
      wins: resolved.filter((b) => b.result === "won").length,
      avgEntry: resolved.length ? resolved.reduce((s, b) => s + b.avgPrice, 0) / resolved.length : 0,
    };
  });
}

export type Insight = {
  kind: "leak" | "strength" | "habit";
  key: string;
  label: string; // short name for headlines, e.g. "longshots"
  dollars: number; // money involved, for ranking
  finding: string; // what the data shows
  plan?: string; // the rule it suggests
  members?: Set<string>; // the bets behind it, used to merge overlapping findings
  where?: string; // e.g. "in sports", used when merged into another finding
};

const KIND_WHERE: Record<string, string> = {
  "Live game": "on live games",
  "Short-term crypto up/down": "on short-term crypto up/down markets",
  "Price target": "on price-target markets",
  "Deadline (\"by date\")": "on \"by date\" markets",
};

function joinAnd(parts: string[]): string {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

// The same bets often show up as a price-band leak, a topic leak and a market-type leak.
// Keep the costliest, fold the others into it as context, and carry their rules along.
function mergeOverlapping(list: Insight[]): Array<Insight & { extraPlans: string[] }> {
  const kept: Array<Insight & { extraPlans: string[]; context: Array<{ where: string; share: number }> }> = [];
  for (const insight of list) {
    const host = insight.members
      ? kept.find((k) => {
          if (!k.members || !insight.members || insight.members.size === 0) return false;
          let shared = 0;
          for (const m of insight.members) if (k.members.has(m)) shared += 1;
          return shared / insight.members.size >= 0.7 && shared / k.members.size >= 0.7;
        })
      : undefined;
    if (host && host.members && insight.members) {
      let shared = 0;
      for (const m of host.members) if (insight.members.has(m)) shared += 1;
      if (insight.where) host.context.push({ where: insight.where, share: shared / host.members.size });
      if (insight.plan) host.extraPlans.push(insight.plan);
    } else {
      kept.push({ ...insight, extraPlans: [], context: [] });
    }
  }
  return kept.map(({ context, ...k }) => {
    if (context.length === 0) return k;
    const all = context.every((c) => c.share >= 0.95);
    return { ...k, finding: `${k.finding} ${all ? "All" : "Most"} of them were ${joinAnd(context.map((c) => c.where))}.` };
  });
}

export type HistoryReport = {
  enoughData: boolean;
  bets: number;
  trades: number;
  from: string | null;
  to: string | null;
  staked: number;
  net: number;
  resolved: number;
  wins: number;
  categories: GroupStats[];
  bands: GroupStats[];
  kinds: GroupStats[];
  leaks: Insight[];
  strengths: Insight[];
  habits: Insight[];
  plan: string[];
  bottomLine: string;
  shareLine: string;
};

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function record(g: GroupStats): string {
  return g.resolved ? `won ${g.wins} of ${g.resolved}` : `${g.bets} positions, none resolved`;
}

export function analyzeHistory(closed: ClosedBet[], trades: Trade[]): HistoryReport {
  const buysByAsset = new Map<string, number>();
  const sellAssets = new Set<string>();
  for (const t of trades) {
    if (t.side === "BUY") buysByAsset.set(t.asset, (buysByAsset.get(t.asset) ?? 0) + t.usdcSize);
    else sellAssets.add(t.asset);
  }

  const bets: Bet[] = closed
    .filter((c) => Number.isFinite(c.avgPrice) && c.avgPrice > 0 && Number.isFinite(c.realizedPnl))
    .map((c) => {
      const category = categorize(c.title, c.slug);
      const fromTrades = buysByAsset.get(c.asset);
      const fallback = Number.isFinite(c.totalBought) ? c.totalBought * c.avgPrice : 0;
      return {
        ...c,
        stake: fromTrades && fromTrades > 0 ? fromTrades : fallback,
        result: c.curPrice >= 0.99 ? "won" : c.curPrice <= 0.01 ? "lost" : "sold",
        category,
        kind: kindOf(c.title, c.slug, category),
        band: bandOf(c.avgPrice),
        soldAny: sellAssets.has(c.asset),
      };
    });

  const staked = bets.reduce((s, b) => s + b.stake, 0);
  const net = bets.reduce((s, b) => s + b.realizedPnl, 0);
  const resolved = bets.filter((b) => b.result !== "sold");
  const wins = resolved.filter((b) => b.result === "won").length;
  const times = bets.map((b) => b.closedAt).filter((t): t is number => t !== null);
  const categories = group(bets, (b) => b.category).sort((a, b) => a.net - b.net);
  const bands = group(bets, (b) => b.band).sort((a, b) => a.net - b.net);
  const kinds = group(bets, (b) => b.kind).filter((k) => k.name !== "Other").sort((a, b) => a.net - b.net);

  const leaks: Insight[] = [];
  const strengths: Insight[] = [];
  const habits: Insight[] = [];
  const memberSet = (pick: (b: Bet) => boolean) => new Set(bets.filter(pick).map((b) => `${b.asset}:${b.conditionId}`));

  // Price bands: did this wallet beat the odds it paid?
  for (const g of bands) {
    if (g.bets < MIN_SAMPLE || g.resolved < MIN_SAMPLE) continue;
    const actual = g.wins / g.resolved;
    if (g.net < 0 && actual < g.avgEntry - 0.03) {
      leaks.push({
        kind: "leak",
        key: `band:${g.name}`,
        label: `${g.name.split(" (")[0]?.toLowerCase()}s`,
        members: memberSet((b) => b.band === g.name),
        where: `at ${g.name.split(" (")[0]?.toLowerCase()} prices`,
        dollars: -g.net,
        finding: `${g.name.split(" (")[0]}s. You paid ${cents(g.avgEntry)} on average across ${g.bets} positions, which prices them to win ${pct(g.avgEntry)} of the time. Yours won ${pct(actual)} (${g.wins} of ${g.resolved}). Net: ${usd(g.net)} on ${usd(g.staked)}.`,
        plan: g.name.startsWith("Longshot")
          ? `Stop buying under 15¢ unless you can say in one sentence why the market is wrong. At your hit rate, every ${usd(10)} there has returned about ${usd(10 + (10 * g.net) / Math.max(g.staked, 1))}.`
          : `Before buying at ${g.name.split("(")[1]?.replace(")", "") ?? "these prices"}, write down why the price is wrong. Your record there trails the odds by ${pct(g.avgEntry - actual)}.`,
      });
    } else if (g.net > 0 && actual > g.avgEntry + 0.03) {
      strengths.push({
        kind: "strength",
        key: `band:${g.name}`,
        label: `${g.name.split(" (")[0]?.toLowerCase()}s`,
        members: memberSet((b) => b.band === g.name),
        where: `at ${g.name.split(" (")[0]?.toLowerCase()} prices`,
        dollars: g.net,
        finding: `${g.name.split(" (")[0]}s are where you beat the price: ${pct(actual)} won against ${pct(g.avgEntry)} priced in, ${signed(g.net)} over ${g.bets} bets.`,
      });
    }
  }

  // Categories: where the money comes from and where it goes.
  for (const g of categories) {
    if (g.bets < MIN_SAMPLE || g.name === "Other") continue;
    if (g.net < 0 && g.net / Math.max(g.staked, 1) < -0.1) {
      leaks.push({
        kind: "leak",
        key: `category:${g.name}`,
        label: g.name.toLowerCase(),
        members: memberSet((b) => b.category === g.name),
        where: `in ${g.name.toLowerCase()}`,
        dollars: -g.net,
        finding: `${g.name}: ${usd(g.net)} over ${g.bets} positions on ${usd(g.staked)} staked (${record(g)}).`,
        plan: `Cut ${g.name.toLowerCase()} positions to half your usual size until your record there turns. It has cost you ${usd(-g.net)}.`,
      });
    } else if (g.net > 0 && g.net / Math.max(g.staked, 1) > 0.05) {
      strengths.push({
        kind: "strength",
        key: `category:${g.name}`,
        label: g.name.toLowerCase(),
        members: memberSet((b) => b.category === g.name),
        where: `in ${g.name.toLowerCase()}`,
        dollars: g.net,
        finding: `${g.name}: ${signed(g.net)} over ${g.bets} positions (${record(g)}). This is where your judgment pays.`,
      });
    }
  }

  // Market kinds: some formats punish retail more than others.
  const kindPlan: Record<string, string> = {
    "Live game": "Run trap_check before every live game trade. Live books thin out fast, and you can't cash out at halftime if nobody is buying.",
    "Short-term crypto up/down": "Drop short-term up/down markets. They reward reaction speed measured in seconds, and your record there is negative.",
    "Price target": "On price-target markets, compare the price you pay with how far the asset must move and how much time is left before you buy.",
    "Deadline (\"by date\")": "Run trap_check on every \"by date\" market. If it pays on what's reported, a weekend deadline can beat you even when you're right.",
  };
  for (const g of kinds) {
    if (g.bets < MIN_SAMPLE) continue;
    if (g.net < 0 && g.net / Math.max(g.staked, 1) < -0.1) {
      leaks.push({
        kind: "leak",
        key: `kind:${g.name}`,
        label: `${g.name.toLowerCase()} markets`,
        members: memberSet((b) => b.kind === g.name),
        where: KIND_WHERE[g.name],
        dollars: -g.net,
        finding: `${g.name} markets: ${usd(g.net)} over ${g.bets} positions (${record(g)}).`,
        plan: kindPlan[g.name],
      });
    }
  }

  // Chasing: do stakes jump right after a loss?
  const lossTimes = bets.filter((b) => b.realizedPnl < 0 && b.closedAt !== null).map((b) => b.closedAt as number);
  const buys = trades.filter((t) => t.side === "BUY" && t.usdcSize > 0);
  const afterLoss = buys.filter((t) => lossTimes.some((l) => l <= t.at && t.at - l < DAY));
  const otherBuys = buys.filter((t) => !afterLoss.includes(t));
  if (afterLoss.length >= MIN_SAMPLE && otherBuys.length >= MIN_SAMPLE) {
    const mean = (list: Trade[]) => list.reduce((s, t) => s + t.usdcSize, 0) / list.length;
    const a = mean(afterLoss);
    const o = mean(otherBuys);
    if (a >= 1.5 * o) {
      leaks.push({
        kind: "leak",
        key: "chasing",
        label: "chasing losses",
        dollars: (a - o) * afterLoss.length,
        finding: `Chasing. In the 24 hours after a losing position closes, your buys average ${usd(a)}; otherwise ${usd(o)}. That's ${(a / o).toFixed(1)}x bigger right when you're most tempted to win it back.`,
        plan: `After a loss, keep your next position at your normal size (${usd(o)}) or wait a day.`,
      });
    }
  }

  // Riding losers to zero.
  const losers = resolved.filter((b) => b.result === "lost");
  const rode = losers.filter((b) => !b.soldAny);
  if (losers.length >= MIN_SAMPLE && rode.length / losers.length >= 0.8) {
    habits.push({
      kind: "habit",
      key: "ride_to_zero",
      label: "riding losers to zero",
      dollars: rode.reduce((s, b) => s + b.stake, 0) * 0.25,
      finding: `${rode.length} of your ${losers.length} losing positions rode all the way to zero; you ${rode.length === losers.length ? "never sold" : "rarely sell"} a loser before it resolved.`,
      plan: "Decide your exit before you buy, and use trap_watch to see what selling would return while there are still buyers.",
    });
  }

  // Averaging down: buying the same outcome again and again as its price falls.
  const buysByAssetList = new Map<string, Trade[]>();
  for (const t of buys) {
    const list = buysByAssetList.get(t.asset);
    if (list) list.push(t);
    else buysByAssetList.set(t.asset, [t]);
  }
  const averagedDown = [...buysByAssetList.values()].filter((list) => {
    const sorted = [...list].sort((x, y) => x.at - y.at);
    const first = sorted[0];
    const last = sorted.at(-1);
    return sorted.length >= 3 && first && last && last.price <= first.price * 0.7;
  });
  if (averagedDown.length >= 3) {
    const assets = new Set(averagedDown.map((l) => l[0]?.asset));
    const outcome = bets.filter((b) => assets.has(b.asset)).reduce((s, b) => s + b.realizedPnl, 0);
    habits.push({
      kind: "habit",
      key: "averaging_down",
      label: "averaging down",
      dollars: Math.max(-outcome, 0),
      finding: `You bought more as the price fell in ${averagedDown.length} markets${outcome !== 0 ? `; the ones now closed netted ${usd(outcome)}` : ""}.`,
      plan: outcome < 0 ? "Don't add to a position that has fallen 30% unless something new happened, not just a lower price." : undefined,
    });
  }

  // Churn: buying and selling the same outcome repeatedly pays the spread every time.
  const churned = [...new Set(trades.map((t) => t.asset))].filter(
    (asset) => trades.filter((t) => t.asset === asset && t.side === "BUY").length >= 2 && trades.filter((t) => t.asset === asset && t.side === "SELL").length >= 2,
  );
  if (churned.length >= MIN_SAMPLE) {
    habits.push({
      kind: "habit",
      key: "churn",
      label: "churn",
      dollars: 0,
      finding: `You traded in and out of the same outcome repeatedly in ${churned.length} markets. Each round trip pays the spread.`,
    });
  }

  // Bursts: many trades inside one hour.
  const sortedTimes = trades.map((t) => t.at).sort((x, y) => x - y);
  let burst = 0;
  for (let i = 0, j = 0; i < sortedTimes.length; i += 1) {
    while ((sortedTimes[i] ?? 0) - (sortedTimes[j] ?? 0) > 3_600_000) j += 1;
    burst = Math.max(burst, i - j + 1);
  }
  if (burst >= 10) {
    habits.push({
      kind: "habit",
      key: "burst",
      label: "burst trading",
      dollars: 0,
      finding: `Your busiest hour had ${burst} trades. Fast clicking is when spreads and thin books cost the most.`,
    });
  }

  leaks.sort((a, b) => b.dollars - a.dollars);
  strengths.sort((a, b) => b.dollars - a.dollars);
  habits.sort((a, b) => b.dollars - a.dollars);
  const mergedLeaks = mergeOverlapping(leaks);
  const mergedStrengths = mergeOverlapping(strengths);

  // Plan: up to three rules from the costliest leaks (including the rules of findings folded into them),
  // then habits if there is room, then one thing to keep doing.
  const plan: string[] = [];
  const seen = new Set<string>();
  const candidates = [...mergedLeaks.flatMap((l) => [l.plan, ...l.extraPlans]), ...habits.map((h) => h.plan)];
  for (const rule of candidates) {
    if (!rule || seen.has(rule) || plan.length >= 3) continue;
    seen.add(rule);
    plan.push(rule);
  }
  const best = mergedStrengths[0];
  if (best) plan.push(`Keep doing what works: ${best.label}, ${signed(best.dollars)} so far.`);

  const enoughData = bets.length >= MIN_SAMPLE;
  const roi = staked > 0 ? net / staked : 0;
  const topLeak = mergedLeaks[0];
  let bottomLine: string;
  if (!enoughData) {
    bottomLine = `Only ${bets.length} closed position${bets.length === 1 ? "" : "s"} on record, too few to find patterns yet.`;
  } else {
    bottomLine = `You're ${net >= 0 ? "up" : "down"} ${usd(Math.abs(net))} on ${usd(staked)} staked (${net >= 0 ? "+" : "-"}${pct(Math.abs(roi))}), and won ${wins} of ${resolved.length} positions that resolved.`;
    if (topLeak) bottomLine += ` The biggest single leak is ${topLeak.label}, at ${usd(topLeak.dollars)}.`;
    else if (net >= 0) bottomLine += " No single leak stands out.";
  }
  const shareLine = !enoughData
    ? ""
    : topLeak
      ? `Foresyte read my last ${bets.length} Polymarket positions: ${topLeak.label} cost me ${usd(topLeak.dollars)}. Drop your wallet and see yours.`
      : `Foresyte read my last ${bets.length} Polymarket positions: ${net >= 0 ? "up" : "down"} ${usd(Math.abs(net))}, no single leak. Drop your wallet and see yours.`;

  return {
    enoughData,
    bets: bets.length,
    trades: trades.length,
    from: times.length ? dateLabel(Math.min(...times)) : null,
    to: times.length ? dateLabel(Math.max(...times)) : null,
    staked,
    net,
    resolved: resolved.length,
    wins,
    categories,
    bands,
    kinds,
    leaks: mergedLeaks.slice(0, 3),
    strengths: mergedStrengths.slice(0, 2),
    habits: habits.slice(0, 3),
    plan,
    bottomLine,
    shareLine,
  };
}

// The plain-English report the agent shows.
export function renderReport(r: HistoryReport): string {
  if (!r.enoughData) return `${r.bottomLine} Come back after a few more positions close.`;
  const lines: string[] = [];
  lines.push(`Your Polymarket review: ${r.bets} closed positions${r.from && r.to ? `, ${r.from} to ${r.to}` : ""}.`, "", `Bottom line. ${r.bottomLine}`);

  const shown = r.categories.filter((c) => c.bets >= 3).sort((a, b) => b.net - a.net);
  if (shown.length) {
    lines.push("", "Where your money goes, by topic:");
    for (const c of shown) lines.push(`- ${c.name}: ${signed(c.net)} over ${c.bets} positions (${record(c)})`);
  }
  if (r.leaks.length) {
    lines.push("", "Your biggest leaks:");
    r.leaks.forEach((l, i) => lines.push(`${i + 1}. ${l.finding}`));
  }
  if (r.strengths.length) {
    lines.push("", "What's working:");
    for (const s of r.strengths) lines.push(`- ${s.finding}`);
  }
  if (r.habits.length) {
    lines.push("", "Habits worth knowing:");
    for (const h of r.habits) lines.push(`- ${h.finding}`);
  }
  if (r.plan.length) {
    lines.push("", "Your plan:");
    r.plan.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
  }
  lines.push("", `Based on your last ${r.bets} closed positions and ${r.trades} trades. This describes your own past results; it isn't financial advice.`);
  return lines.join("\n");
}
