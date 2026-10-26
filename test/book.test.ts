import { test } from "node:test";
import assert from "node:assert/strict";
import { exitDepth, parseLevels, sellProceeds, spread, walkAsks } from "../src/lib/book.ts";

const close = (a: number | null, b: number, eps = 1e-6) => assert.ok(a !== null && Math.abs(a - b) < eps, `${a} != ${b}`);

test("parseLevels reads CLOB strings and drops junk", () => {
  const levels = parseLevels([
    { price: "0.42", size: "50" },
    { price: "0", size: "10" },
    { price: "1", size: "10" },
    { price: "0.3", size: "0" },
    { price: "abc", size: "5" },
    null,
  ]);
  assert.deepEqual(levels, [{ price: 0.42, size: 50 }]);
  assert.deepEqual(parseLevels(undefined), []);
});

test("walkAsks fills cheapest first across levels", () => {
  const asks = [{ price: 0.5, size: 200 }, { price: 0.42, size: 50 }, { price: 0.45, size: 100 }];
  const fill = walkAsks(asks, 50);
  assert.equal(fill.filled, true);
  close(fill.spent, 50);
  close(fill.shares, 50 + 29 / 0.45);
  close(fill.avgPrice, 50 / (50 + 29 / 0.45));
  close(fill.available, 21 + 45 + 100);
});

test("walkAsks reports a stake the book cannot absorb", () => {
  const fill = walkAsks([{ price: 0.42, size: 50 }, { price: 0.45, size: 100 }], 200);
  assert.equal(fill.filled, false);
  close(fill.spent, 66);
});

test("walkAsks on an empty book buys nothing", () => {
  const fill = walkAsks([], 50);
  assert.equal(fill.shares, 0);
  assert.equal(fill.avgPrice, null);
  assert.equal(fill.filled, false);
});

test("sellProceeds sells best bids first and reports what cannot be sold", () => {
  const sale = sellProceeds([{ price: 0.38, size: 20 }, { price: 0.4, size: 30 }], 100);
  close(sale.proceeds, 30 * 0.4 + 20 * 0.38);
  close(sale.soldShares, 50);
  close(sale.unsoldShares, 50);
});

test("exitDepth counts only buyers within 5 cents of the best bid", () => {
  close(exitDepth([{ price: 0.4, size: 30 }, { price: 0.36, size: 100 }, { price: 0.3, size: 1000 }]), 12 + 36);
  assert.equal(exitDepth([]), 0);
});

test("spread is best ask minus best bid", () => {
  close(spread([{ price: 0.39, size: 1 }], [{ price: 0.46, size: 1 }]), 0.07);
  assert.equal(spread([], [{ price: 0.46, size: 1 }]), null);
});
