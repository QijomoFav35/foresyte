import { test } from "node:test";
import assert from "node:assert/strict";
import { deepScan, roundTrip, safeBet, sellByLabel } from "../src/lib/deepScan.ts";
import { CODE_RE, newCode, normalizeCode } from "../src/lib/codes.ts";
import { NOW_MAY_20_2026, NOW_OCT_26_2026, btcPrice, sportsGame, strategyMay31 } from "./fixtures.ts";

const deep = { bids: [{ price: 0.49, size: 20000 }], asks: [{ price: 0.51, size: 20000 }] };
const thin = { bids: [{ price: 0.4, size: 20 }], asks: [{ price: 0.42, size: 500 }] };

test("round trip: deep book loses only the spread", () => {
  const r = roundTrip(deep, 100);
  assert.equal(r.canBuyAll, true);
  assert.ok(Math.abs(r.getBackUsdc - 96.08) < 0.01);
  assert.equal(r.stuckShares < 0.05, true);
});

test("round trip: thin book strands most of a $50 bet", () => {
  const r = roundTrip(thin, 50);
  assert.ok(r.getBackUsdc < 9);
  assert.ok(r.stuckShares > 90);
});

test("safe bet: thin book allows only a few dollars", () => {
  const s = safeBet(thin);
  assert.ok(s >= 1 && s <= 9, `got ${s}`);
});

test("safe bet: deep book allows thousands", () => {
  assert.ok(safeBet(deep) > 5000);
});

test("safe bet: no buyers means zero", () => {
  assert.equal(safeBet({ bids: [], asks: deep.asks }), 0);
});

test("sell-by date is 3 days before the end, in New York time", () => {
  assert.equal(sellByLabel(strategyMay31.endDate, NOW_MAY_20_2026), "Thursday, May 28");
  assert.equal(sellByLabel(strategyMay31.endDate, new Date("2026-05-30T00:00:00Z")), "now");
  assert.equal(sellByLabel(null), null);
});

test("deep scan: halftime game shows the exit limit and the ladder", () => {
  const d = deepScan(sportsGame, 0, thin, 50, deep, NOW_OCT_26_2026);
  assert.equal(d.level, "HIGH_RISK");
  assert.match(d.plan[0] ?? "", /^Exits hold up to about \$\d+(\.\d+)?, below the \$50 checked/);
  assert.match(d.report, /Buying and selling straight back at each size:/);
  assert.match(d.report, /\$50 in, \$8(\.\d+)? back/);
  assert.match(d.report, /Risk read:\n1\. /);
  assert.equal(d.otherSide?.outcome, "Celtics");
});

test("deep scan: Strategy market gives a sell-by date and the news warning", () => {
  const book = { bids: [{ price: 0.11, size: 50000 }], asks: [{ price: 0.12, size: 50000 }] };
  const d = deepScan(strategyMay31, 0, book, 50, null, NOW_MAY_20_2026);
  assert.equal(d.sellBy, "Thursday, May 28");
  assert.ok(d.plan.some((p) => /window opens Thursday, May 28/.test(p)));
  assert.ok(d.plan.some((p) => /official report before the deadline/.test(p)));
});

test("deep scan: clean deep market says the position fits", () => {
  const d = deepScan(btcPrice, 0, deep, 50, deep, NOW_OCT_26_2026);
  assert.equal(d.level, "CLEAR");
  assert.match(d.plan[0] ?? "", /A \$50 position fits/);
  assert.equal(d.sellBy, null);
});

test("codes: format, normalising, and no look-alike letters", () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), CODE_RE);
  assert.equal(normalizeCode(" fsy-7k2qxm "), "FSY-7K2QXM");
  assert.equal(normalizeCode("FSY7K2QXM"), "FSY-7K2QXM");
  assert.equal(normalizeCode("FSY-0O1IL2"), null);
});

test("the pay prompt tells the agent where Foresyte lives", async () => {
  const { agentPrompt } = await import("../src/lib/codes.ts");
  const p = agentPrompt("FSY-7K2QXM");
  assert.match(p, /^@PayBox /);
  assert.match(p, /Foresyte plugin/);
  assert.match(p, /get_request/);
  assert.match(p, /deep_scan with code FSY-7K2QXM/);
});
