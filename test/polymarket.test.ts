import { test } from "node:test";
import assert from "node:assert/strict";
import { marketLink, normalizeMarket, normalizePosition, parseList, slugCandidates } from "../src/lib/polymarket.ts";

test("slugCandidates reads links and bare slugs", () => {
  assert.deepEqual(slugCandidates("https://polymarket.com/event/mstr-sells-btc/mstr-sells-btc-by-may-31?tid=1"), {
    market: "mstr-sells-btc-by-may-31",
    event: "mstr-sells-btc",
  });
  assert.deepEqual(slugCandidates("polymarket.com/event/nba-lal-bos-2026-10-28"), {
    market: "nba-lal-bos-2026-10-28",
    event: "nba-lal-bos-2026-10-28",
  });
  assert.deepEqual(slugCandidates("https://polymarket.com/market/some-market"), { market: "some-market", event: null });
  assert.deepEqual(slugCandidates("  just-a-slug "), { market: "just-a-slug", event: "just-a-slug" });
});

test("parseList handles Gamma's JSON-in-a-string fields", () => {
  assert.deepEqual(parseList('["Yes","No"]'), ["Yes", "No"]);
  assert.deepEqual(parseList(["1", 2]), ["1", "2"]);
  assert.deepEqual(parseList("not json"), []);
});

test("normalizeMarket reads Gamma fields", () => {
  const m = normalizeMarket({
    question: "Q?",
    slug: "q",
    outcomes: '["Yes","No"]',
    outcomePrices: '["0.12","0.88"]',
    clobTokenIds: '["111","222"]',
    endDate: "2026-05-31T12:00:00Z",
    negRisk: true,
    events: [{ slug: "parent" }],
  });
  assert.deepEqual(m.prices, [0.12, 0.88]);
  assert.deepEqual(m.tokenIds, ["111", "222"]);
  assert.equal(m.eventSlug, "parent");
  assert.equal(m.negRisk, true);
});

test("normalizePosition reads negativeRisk, the field the Data API actually returns", () => {
  assert.equal(normalizePosition({ negativeRisk: true }).negativeRisk, true);
  assert.equal(normalizePosition({ redeemable: true, currentValue: "4.2" }).currentValue, 4.2);
});

test("marketLink builds event and market links", () => {
  assert.equal(marketLink("ev", "mk"), "https://polymarket.com/event/ev/mk");
  assert.equal(marketLink(null, "mk"), "https://polymarket.com/event/mk");
});
