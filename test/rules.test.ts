import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeRules, describeDeadline } from "../src/lib/rules.ts";
import {
  NOW_MAY_20_2026,
  NOW_OCT_26_2026,
  appleSplitWednesday,
  btcPrice,
  fedBeforeThanksgiving,
  sportsGame,
  strategyMay31,
  vagueRules,
  withClarification,
} from "./fixtures.ts";
import type { Market } from "../src/lib/polymarket.ts";

const run = (m: Market, now: Date) =>
  analyzeRules({ question: m.question, description: m.description, endDate: m.endDate, resolutionSource: m.resolutionSource }, now);
const checks = (m: Market, now: Date) => run(m, now).flags.map((f) => `${f.level}:${f.check}`);

test("Strategy May 31: confirmation-based, Sunday deadline, HIGH_RISK", () => {
  const r = run(strategyMay31, NOW_MAY_20_2026);
  assert.equal(r.basis, "confirmation");
  assert.equal(r.deadline?.weekday, "Sunday");
  assert.equal(r.deadline?.label, "Sunday, May 31");
  assert.equal(r.deadline?.daysLeft, 11);
  assert.deepEqual(checks(strategyMay31, NOW_MAY_20_2026), ["HIGH_RISK:reporting_deadline_near_weekend"]);
  assert.match(r.flags[0]?.message ?? "", /you can be right and still lose/);
  assert.ok(r.reportingTerms.includes("credible reporting"));
});

test("a sports game pays on the event: no rules flags", () => {
  const r = run(sportsGame, NOW_OCT_26_2026);
  assert.equal(r.basis, "event");
  assert.deepEqual(r.flags, []);
});

test("a price market with a named feed pays on the candle, even on a Friday", () => {
  const r = run(btcPrice, NOW_OCT_26_2026);
  assert.equal(r.basis, "event");
  assert.equal(r.deadline?.weekday, "Friday");
  assert.deepEqual(r.flags, []);
});

test("a midweek announcement deadline is CAUTION, not HIGH_RISK", () => {
  assert.deepEqual(checks(appleSplitWednesday, NOW_OCT_26_2026), ["CAUTION:reporting_dependent"]);
  assert.equal(run(appleSplitWednesday, NOW_OCT_26_2026).deadline?.label, "Wednesday, October 28");
});

test("a deadline the day before Thanksgiving is HIGH_RISK", () => {
  const r = run(fedBeforeThanksgiving, NOW_OCT_26_2026);
  assert.deepEqual(r.flags.map((f) => f.check), ["reporting_deadline_near_weekend"]);
  assert.match(r.deadline?.why ?? "", /Thanksgiving/);
});

test("an added clarification is flagged", () => {
  assert.ok(checks(withClarification, NOW_OCT_26_2026).includes("CAUTION:clarification_added"));
});

test("discretionary wording is flagged as vague", () => {
  assert.deepEqual(checks(vagueRules, NOW_OCT_26_2026), ["CAUTION:vague_wording"]);
});

test("deadlines are read in New York time, not UTC", () => {
  // 03:59 UTC on Thursday is still Wednesday evening in New York.
  assert.equal(describeDeadline("2026-10-29T03:59:00Z", NOW_OCT_26_2026)?.weekday, "Wednesday");
  assert.equal(describeDeadline("2026-10-31T12:00:00Z", NOW_OCT_26_2026)?.risky, true);
  assert.equal(describeDeadline("not a date"), null);
});
