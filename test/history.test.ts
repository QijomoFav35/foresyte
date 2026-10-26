import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeHistory, bandOf, categorize, kindOf, renderReport, toMs, type ClosedBet, type Trade } from "../src/lib/history.ts";

const DAY = 86_400_000;
const T0 = Date.parse("2026-06-01T12:00:00Z");

// One bet = one BUY trade at `at`, closed two hours later. Bets are three days apart unless placed by hand.
function bet(i: number, o: { title: string; slug: string; price: number; stake: number; won: boolean }): { closed: ClosedBet; trade: Trade } {
  const at = T0 + i * 3 * DAY;
  const shares = o.stake / o.price;
  const asset = `asset-${i}`;
  return {
    closed: {
      asset,
      conditionId: `0x${i.toString(16).padStart(64, "0")}`,
      title: o.title,
      slug: o.slug,
      eventSlug: null,
      outcome: "Yes",
      avgPrice: o.price,
      totalBought: shares,
      realizedPnl: o.won ? shares - o.stake : -o.stake,
      curPrice: o.won ? 1 : 0,
      closedAt: at + 2 * 3_600_000,
    },
    trade: { asset, side: "BUY", price: o.price, size: shares, usdcSize: o.stake, at, title: o.title, slug: o.slug },
  };
}

function wallet() {
  const items: Array<{ closed: ClosedBet; trade: Trade }> = [];
  // 40 live-game longshots at 7¢, $5 each, one winner.
  for (let i = 0; i < 40; i += 1) {
    items.push(bet(i, { title: "Lakers vs. Celtics", slug: `nba-lal-bos-2026-06-${String((i % 28) + 1).padStart(2, "0")}`, price: 0.07, stake: 5, won: i === 7 }));
  }
  // 20 politics favorites at 65¢, $20 each, 16 winners.
  for (let i = 40; i < 60; i += 1) {
    items.push(bet(i, { title: "Will the incumbent win the governor election?", slug: `governor-election-${i}`, price: 0.65, stake: 20, won: i < 56 }));
  }
  return { closed: items.map((x) => x.closed), trades: items.map((x) => x.trade) };
}

test("categorize covers Polymarket's topics", () => {
  assert.equal(categorize("Lakers vs. Celtics", "nba-lal-bos-2026-10-28"), "Sports");
  assert.equal(categorize("Arsenal vs. Chelsea", "epl-ars-che-2026-10-30"), "Sports");
  assert.equal(categorize("Bitcoin Up or Down - October 26, 3PM ET", "btc-updown-15m-123"), "Crypto");
  assert.equal(categorize("Will the Fed cut rates in December?", "fed-december"), "Economy & markets");
  assert.equal(categorize("MicroStrategy sells any Bitcoin by May 31?", "mstr"), "Crypto");
  assert.equal(categorize("Who will win the presidential election?", "presidential-election-winner"), "Politics");
  assert.equal(categorize("Russia x Ukraine ceasefire in 2026?", "ceasefire-2026"), "World affairs");
  assert.equal(categorize("Best Picture at the Oscars", "oscars-best-picture"), "Culture");
  assert.equal(categorize("Will OpenAI release GPT-6 this year?", "gpt-6"), "Science & tech");
  assert.equal(categorize("Will it happen?", "x"), "Other");
});

test("kindOf separates market formats", () => {
  assert.equal(kindOf("Lakers vs. Celtics", "nba-lal-bos-2026-10-28", "Sports"), "Live game");
  assert.equal(kindOf("Bitcoin Up or Down - 3PM ET", "btc-updown-15m", "Crypto"), "Short-term crypto up/down");
  assert.equal(kindOf("Will Bitcoin hit $150,000 in 2026?", "btc-150k", "Crypto"), "Price target");
  assert.equal(kindOf("Will Apple announce a split by October 28?", "apple-split", "Economy & markets"), "Deadline (\"by date\")");
});

test("bandOf and toMs", () => {
  assert.equal(bandOf(0.07), "Longshot (under 15¢)");
  assert.equal(bandOf(0.5), "Coin flip (40–60¢)");
  assert.equal(bandOf(0.9), "Heavy favorite (85¢+)");
  assert.equal(toMs(1_780_000_000), 1_780_000_000_000);
  assert.equal(toMs(1_780_000_000_000), 1_780_000_000_000);
  assert.equal(toMs(0), null);
});

test("longshots are the top leak, compared with the odds paid", () => {
  const { closed, trades } = wallet();
  const r = analyzeHistory(closed, trades);
  assert.equal(r.bets, 60);
  assert.equal(r.leaks[0]?.key, "band:Longshot (under 15¢)");
  assert.match(r.leaks[0]?.finding ?? "", /paid 7¢ on average across 40 positions, which prices them to win 7% of the time\. Yours won 3% \(1 of 40\)/);
  assert.match(r.bottomLine, /The biggest single leak is longshots/);
  // The same 40 bets are also the sports leak and the live-game leak: folded in, not repeated.
  assert.equal(r.leaks.length, 1);
  assert.match(r.leaks[0]?.finding ?? "", /All of them were in sports and on live games\.$/);
});

test("the plan is tied to the numbers and keeps what works", () => {
  const { closed, trades } = wallet();
  const r = analyzeHistory(closed, trades);
  assert.equal(r.plan.length, 4);
  assert.match(r.plan[0] ?? "", /^Stop buying under 15¢/);
  assert.match(r.plan[0] ?? "", /every \$10 there has returned about \$3\.57/);
  assert.ok(r.plan.some((p) => p.startsWith("Run trap_check before every live game trade")));
  assert.equal(r.plan.at(-1), "Keep doing what works: favorites, +$92.31 so far.");
  assert.match(r.strengths[0]?.finding ?? "", /All of them were in politics\.$/);
});

test("riding losers to zero is noticed when nothing was ever sold", () => {
  const { closed, trades } = wallet();
  const r = analyzeHistory(closed, trades);
  assert.ok(r.habits.some((h) => h.key === "ride_to_zero" && /43 of your 43 losing positions rode all the way to zero; you never sold a loser/.test(h.finding)));
});

test("chasing: bigger buys within a day of a loss", () => {
  const closed: ClosedBet[] = [];
  const trades: Trade[] = [];
  for (let k = 0; k < 6; k += 1) {
    const lossAt = T0 + k * 5 * DAY;
    closed.push({
      asset: `l${k}`, conditionId: `0x${k}`, title: "Bitcoin Up or Down", slug: "btc-updown", eventSlug: null, outcome: "Up",
      avgPrice: 0.5, totalBought: 20, realizedPnl: -10, curPrice: 0, closedAt: lossAt,
    });
    trades.push({ asset: `a${k}`, side: "BUY", price: 0.5, size: 100, usdcSize: 50, at: lossAt + 3_600_000, title: "", slug: "" });
    trades.push({ asset: `b${k}`, side: "BUY", price: 0.5, size: 20, usdcSize: 10, at: lossAt + 2 * DAY, title: "", slug: "" });
  }
  const r = analyzeHistory(closed, trades);
  const chasing = [...r.leaks, ...r.habits].find((i) => i.key === "chasing");
  assert.ok(chasing);
  assert.match(chasing.finding, /your buys average \$50; otherwise \$10\. That's 5\.0x bigger/);
  assert.match(chasing.plan ?? "", /keep your next position at your normal size \(\$10\)/);
});

test("too little history says so instead of inventing patterns", () => {
  const { closed, trades } = wallet();
  const r = analyzeHistory(closed.slice(0, 3), trades.slice(0, 3));
  assert.equal(r.enoughData, false);
  assert.match(renderReport(r), /too few to find patterns yet/);
  assert.equal(r.shareLine, "");
});

test("the report reads top-down in plain English with the fine print", () => {
  const { closed, trades } = wallet();
  const text = renderReport(analyzeHistory(closed, trades));
  for (const heading of ["Bottom line.", "Where your money goes, by topic:", "Your biggest leaks:", "What's working:", "Your plan:"]) {
    assert.ok(text.includes(heading), heading);
  }
  assert.match(text, /it isn't financial advice\.$/);
});

test("separate problems stay separate", () => {
  const items: Array<{ closed: ClosedBet; trade: Trade }> = [];
  for (let i = 0; i < 10; i += 1) items.push(bet(i, { title: "Bitcoin Up or Down - 3PM ET", slug: `btc-updown-${i}`, price: 0.5, stake: 10, won: i < 2 }));
  for (let i = 10; i < 20; i += 1) items.push(bet(i, { title: "Will Apple announce a split by October 28?", slug: `apple-${i}`, price: 0.3, stake: 10, won: false }));
  const r = analyzeHistory(items.map((x) => x.closed), items.map((x) => x.trade));
  assert.equal(r.leaks.length, 2);
  const text = r.leaks.map((l) => l.finding).join("\n");
  assert.match(text, /on short-term crypto up\/down markets/);
  assert.match(text, /on "by date" markets/);
  assert.ok(r.plan.some((p) => p.includes("trap_check")));
});
