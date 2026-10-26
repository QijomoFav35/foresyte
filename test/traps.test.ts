import { test } from "node:test";
import assert from "node:assert/strict";
import { assessEntry, assessHolding, claimable, openPositions } from "../src/lib/traps.ts";
import { NOW_MAY_20_2026, NOW_OCT_26_2026, btcPrice, position, sportsGame, strategyMay31 } from "./fixtures.ts";

const deep = { bids: [{ price: 0.49, size: 20000 }], asks: [{ price: 0.51, size: 20000 }] };

test("thin in-play game: HIGH_RISK, worst case first", () => {
  // $8 of buyers, like the halftime cash-out that wasn't there.
  const book = { bids: [{ price: 0.4, size: 20 }], asks: [{ price: 0.42, size: 500 }] };
  const r = assessEntry(sportsGame, 0, book, 50, NOW_OCT_26_2026);
  assert.equal(r.level, "HIGH_RISK");
  assert.equal(r.flags[0]?.check, "exit_thinner_than_stake");
  assert.match(r.flags[0]?.message ?? "", /Only \$8 of buyers/);
  assert.match(r.headline, /^This is a trap\. If you bet \$50 on Lakers and want out right away, you'd get back \$8\./);
  assert.match(r.headline, /99\.0 of 119\.0 shares\) would find no buyer/);
  assert.match(r.whatToDo, /You may not be able to sell/);
});

test("deep book, event-based rules: CLEAR", () => {
  const r = assessEntry(btcPrice, 0, deep, 50, NOW_OCT_26_2026);
  assert.equal(r.level, "CLEAR");
  assert.deepEqual(r.flags, []);
  assert.match(r.headline, /No traps found at this size\.$/);
});

test("Strategy May 31 with a deep book: HIGH_RISK from the rules alone", () => {
  const book = { bids: [{ price: 0.11, size: 50000 }], asks: [{ price: 0.12, size: 50000 }] }; // priced like the 12¢ market
  const r = assessEntry(strategyMay31, 0, book, 50, NOW_MAY_20_2026);
  assert.equal(r.level, "HIGH_RISK");
  assert.deepEqual(r.flags.map((f) => f.check), ["reporting_deadline_near_weekend"]);
  assert.equal(r.rules.basis, "confirmation");
});

test("thin exit between 1x and 2x the stake is CAUTION", () => {
  const book = { bids: [{ price: 0.49, size: 150 }], asks: [{ price: 0.51, size: 20000 }] }; // $73.50 near the price
  const r = assessEntry(btcPrice, 0, book, 50, NOW_OCT_26_2026);
  assert.deepEqual(r.flags.map((f) => `${f.level}:${f.check}`), ["CAUTION:exit_thin"]);
});

test("slippage and wide spread are flagged with real cents", () => {
  const book = { bids: [{ price: 0.3, size: 20000 }], asks: [{ price: 0.5, size: 10 }, { price: 0.7, size: 1000 }] };
  const r = assessEntry(btcPrice, 0, book, 50, NOW_OCT_26_2026);
  const byCheck = Object.fromEntries(r.flags.map((f) => [f.check, f.message]));
  assert.match(byCheck.slippage ?? "", /Shows 50¢, but your size fills at 6\d¢ on average/);
  assert.match(byCheck.wide_spread ?? "", /20¢ apart/);
});

test("no buyers and no sellers are both HIGH_RISK", () => {
  const noBids = assessEntry(btcPrice, 0, { bids: [], asks: deep.asks }, 50, NOW_OCT_26_2026);
  assert.ok(noBids.flags.some((f) => f.check === "no_buyers" && f.level === "HIGH_RISK"));
  const noAsks = assessEntry(btcPrice, 0, { bids: deep.bids, asks: [] }, 50, NOW_OCT_26_2026);
  assert.equal(noAsks.level, "HIGH_RISK");
  assert.match(noAsks.headline, /can't be placed: nobody is selling/);
});

test("a stake larger than all asks cannot fill", () => {
  const r = assessEntry(btcPrice, 0, { bids: deep.bids, asks: [{ price: 0.51, size: 20 }] }, 50, NOW_OCT_26_2026);
  assert.ok(r.flags.some((f) => f.check === "cannot_fill"));
  assert.equal(r.filled, false);
});

test("holding: buyers thinning out says cash out now", () => {
  const h = assessHolding(position({}), { bids: [{ price: 0.55, size: 30 }], asks: [] }, null, "https://polymarket.com/event/x");
  assert.equal(h.level, "HIGH_RISK");
  assert.match(h.flags[0]?.message ?? "", /Cash out now while you still can: only 30\.0 of your 100\.0 shares/);
  assert.ok(!h.notes.some((n) => n.includes("lock in")), "no lock-in when selling now loses money");
});

test("holding: thin exit at a profit suggests locking it in", () => {
  const h = assessHolding(position({}), { bids: [{ price: 0.58, size: 60 }, { price: 0.5, size: 100 }], asks: [] }, null, "x");
  assert.deepEqual(h.flags.map((f) => f.check), ["exit_discount"]);
  assert.ok(h.notes.some((n) => n.includes("lock in about $14.80 profit")));
});

test("holding: deep exit just reports the sell-now value", () => {
  const h = assessHolding(position({}), { bids: [{ price: 0.6, size: 1000 }], asks: [] }, null, "x");
  assert.equal(h.level, "CLEAR");
  assert.ok(h.notes.includes("Selling everything now returns about $60."));
  assert.ok(h.notes.includes("Up $20 on paper."));
});

test("holding: Strategy-style rules risk plus profit suggests locking in", () => {
  const h = assessHolding(position({}), { bids: [{ price: 0.6, size: 1000 }], asks: [] }, strategyMay31, "x", NOW_MAY_20_2026);
  assert.equal(h.level, "HIGH_RISK");
  assert.ok(h.notes.some((n) => n.includes("lock in about $20 profit")));
  assert.ok(h.notes.includes("Resolves in 11 days."));
});

test("open positions skip resolved ones and keep the five largest", () => {
  const list = [
    position({ currentValue: 5 }),
    position({ currentValue: 50, redeemable: true }),
    position({ currentValue: 30, curPrice: 1 }),
    ...[10, 20, 30, 40, 60, 70].map((v) => position({ currentValue: v })),
  ];
  assert.deepEqual(openPositions(list).map((p) => p.currentValue), [70, 60, 40, 30, 20]);
});

test("claimable counts winners only, never $0 losers", () => {
  const list = [
    position({ redeemable: true, currentValue: 0, title: "loser" }),
    position({ redeemable: true, currentValue: 12.5, title: "winner" }),
    position({ redeemable: false, currentValue: 99, title: "open" }),
  ];
  assert.deepEqual(claimable(list).map((p) => p.title), ["winner"]);
});

// ---- Plain English and the exit window (v1.2.0) ----

const NOW_MAY_29_2026 = new Date("2026-05-29T12:00:00Z"); // 2 days before Strategy's Sunday deadline
const deepStrategy = { bids: [{ price: 0.11, size: 50000 }], asks: [{ price: 0.12, size: 50000 }] };

test("plain English: no agent words in what a person reads", () => {
  const r = assessEntry(btcPrice, 0, deep, 50, NOW_OCT_26_2026);
  assert.match(r.headline, /^Looks safe at this size\./);
  assert.doesNotMatch(r.headline, /HIGH_RISK|CAUTION|CLEAR/);
  assert.equal(r.whatToDo, "Go ahead if you like the bet.");
});

test("exit window: buying a Strategy-style market 2 days before the end is flagged", () => {
  const r = assessEntry(strategyMay31, 0, deepStrategy, 50, NOW_MAY_29_2026);
  assert.equal(r.level, "HIGH_RISK");
  assert.ok(r.flags.some((f) => f.check === "exit_window"));
  assert.match(r.flags.find((f) => f.check === "exit_window")?.message ?? "", /ends in 2 days/);
  assert.match(r.whatToDo, /^Don't buy this close to the end/);
});

test("exit window: holding a Strategy-style market 2 days out says get out now", () => {
  const h = assessHolding(position({}), deepStrategy, strategyMay31, "x", NOW_MAY_29_2026);
  assert.equal(h.level, "HIGH_RISK");
  assert.match(h.flags.find((f) => f.check === "exit_window")?.message ?? "", /Get out now while people are still buying/);
  assert.equal(h.whatToDo, "Sell now while people are still buying.");
});

test("exit window: the same market 11 days out is not in the window", () => {
  const h = assessHolding(position({}), deepStrategy, strategyMay31, "x", NOW_MAY_20_2026);
  assert.ok(!h.flags.some((f) => f.check === "exit_window"));
});

test("exit window: a clean, deep price market near its end is not flagged", () => {
  const r = assessEntry(btcPrice, 0, deep, 50, new Date("2026-11-05T12:00:00Z"));
  assert.equal(r.level, "CLEAR");
});

test("exit window: a thin market near its end is flagged even with clean rules", () => {
  const thin = { bids: [{ price: 0.4, size: 20 }], asks: [{ price: 0.42, size: 500 }] };
  const r = assessEntry(sportsGame, 0, thin, 50, new Date("2026-11-03T12:00:00Z"));
  assert.ok(r.flags.some((f) => f.check === "exit_window"));
});

test("whale: a $500,000 position with $40,000 of buyers can't get out", () => {
  // 1,000,000 shares bought at 50¢; buyers want only 80,000 shares.
  const whale = position({ size: 1_000_000, initialValue: 500_000, currentValue: 550_000, curPrice: 0.55 });
  const book = { bids: [{ price: 0.55, size: 50_000 }, { price: 0.45, size: 30_000 }], asks: [] };
  const h = assessHolding(whale, book, strategyMay31, "x", NOW_MAY_29_2026);
  assert.equal(h.level, "HIGH_RISK");
  assert.match(h.flags.map((f) => f.message).join(" "), /only 80,000 of your 1,000,000 shares can be sold right now, for about \$41,000/);
  assert.equal(Math.round(h.unsoldShares), 920_000);
});
