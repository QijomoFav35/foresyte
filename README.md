# Foresyte

**Know if a Polymarket market is a trap before you buy, and when to get out while you can.**

`43` unit tests on fixtures · `5` tools · read-only by default · no keys, ever · a PayBox plugin

Foresyte is a PayBox plugin. Ask your agent "is this market a trap?" and Foresyte reads Polymarket's live order book and rules, computes every number, and answers CLEAR, CAUTION or HIGH_RISK with the worst case first. The agent explains; Foresyte computes. It never places, blocks or signs a bet.

---

## 1. The problem

More than 70% of Polymarket users lose money, and 0.1% of accounts took 67% of the profits (Wall Street Journal analysis of 1.6 million accounts, May 2026). Some of those losses come from two traps you can see coming if you know where to look.

**The liquidity trap: you can't get out.** The app shows your position's value, but value is not cash. If nobody is bidding near the price, you can't sell. The founder's own story: a $50 bet on a German basketball game was up at halftime, and there was nobody to sell to. The game turned; the $50 was gone.

**The rules trap: you can be right and still lose.** Polymarket's "MicroStrategy sells any Bitcoin by May 31?" market. Strategy sold 32 BTC between May 26 and May 31, 2026. May 31 was a Sunday. The 8-K disclosing the sale was filed Monday, June 1. Polymarket added a note that confirmation outside the timeframe does not count, and the market resolved No. One trader says he lost about $500,000; two traders have sued.

## 2. The tools

| Tool | When | What it tells you |
| --- | --- | --- |
| `trap_check` | Before you buy | At your stake: what you'd actually pay per share, what you'd get back selling right away, how many buyers sit near the price, the spread, and whether the rules pay on the event or on a report due by a weekend or holiday deadline |
| `trap_watch` | While you hold | For your five largest open positions: paper P&L, what selling everything now actually returns, whether buyers are thinning out, deadline risk, and when locking in profit beats waiting |
| `pattern_summary` | Any time | A plain-English review of your own history across every kind of market: where you make and lose money by topic, by entry price compared with the odds you paid, and by market type; habits like chasing losses or riding losers to zero; your biggest leaks ranked by dollars; and a short plan tied to those numbers |
| `check_unclaimed` | After it resolves | Winning positions you haven't claimed, the total, and the link to claim each one |
| `propose_claim` | After it resolves | An unsigned claim for PayBox approval, only when the winnings sit in the PayBox wallet itself |

## 3. How each verdict is decided

Any HIGH_RISK check makes the verdict HIGH_RISK; otherwise any CAUTION makes it CAUTION; otherwise CLEAR. The thresholds live in [`src/lib/traps.ts`](src/lib/traps.ts) and [`src/lib/book.ts`](src/lib/book.ts).

| Check | Rule | Level |
| --- | --- | --- |
| No sellers / can't fill | the asks can't absorb your stake | HIGH_RISK |
| No buyers | zero bids | HIGH_RISK |
| Exit thinner than stake | USDC of bids within 5¢ of the best bid is below your stake | HIGH_RISK |
| Exit thin | that depth is below 2× your stake | CAUTION |
| Slippage | your average fill is more than 5% worse than the shown price | CAUTION |
| Wide spread | best ask minus best bid above 5¢ | CAUTION |
| Reporting deadline near a weekend | a deadline market whose rules pay on what's announced, reported, filed or confirmed, with the deadline (New York time) on a Friday, Saturday, Sunday or within a day of a US market holiday | HIGH_RISK |
| Reporting-dependent | the same, on an ordinary weekday | CAUTION |
| Clarification added | the rules carry added context or an update | CAUTION |
| Vague wording | discretion, ambiguous, unclear, subjective, interpretation | CAUTION |
| Exit closing (while holding) | bids can't absorb your whole position | HIGH_RISK |
| Exit discount (while holding) | selling now returns more than 3% under the displayed value | CAUTION |

The rules check is the split Galaxy Research proposed after the Strategy dispute: is a market **event-based** (pays on what happens) or **confirmation-based** (pays on what is reported by a deadline)? Sports results and price-feed markets are event-based and are not flagged.

### How `pattern_summary` reads a wallet

It reads up to 200 closed bets and the last 500 trades. Every bet is sorted three ways: topic (sports, crypto, politics, economy and markets, world affairs, culture, science and tech), entry price (longshot under 15¢, underdog, coin flip, favorite, heavy favorite 85¢+) and market type (live game, short-term crypto up/down, price target, "by date" deadline). A price band is a leak only when it lost money **and** won less often than the price you paid implied, so a longshot habit is judged against longshot odds, not against a coin flip. When the same bets cause several leaks (longshots that were all live sports games), they are reported once, with the context, so no dollar is counted twice. Groups under 5 bets are never reported.

## 4. Where every number comes from

| Figure | Source | Freshness |
| --- | --- | --- |
| Question, rules text, end date, outcomes, shown prices, order book ids | Gamma API, `gamma-api.polymarket.com/markets` | fetched on every call |
| Bids and asks at every price | CLOB API, `clob.polymarket.com/book` | fetched on every call |
| Open and resolved positions, cost basis, value | Data API, `data-api.polymarket.com/positions` | fetched on every call |
| Closed bets: entry price, realized P&L, final price | Data API, `data-api.polymarket.com/closed-positions` | fetched on every call |
| Trades: side, price, dollar size, time | Data API, `data-api.polymarket.com/activity` | fetched on every call |
| Which wallet holds a user's positions | Gamma public profile | fetched on every call |

Nothing is cached and nothing is estimated. If Polymarket doesn't answer within 2.5 seconds, Foresyte says so instead of guessing.

## 5. What is live, and how to check it

| Claim | Where | Verify |
| --- | --- | --- |
| Book math: fills, sell-back value, exit depth, spread | [`src/lib/book.ts`](src/lib/book.ts) | `pnpm unit` |
| The Strategy May 31 market comes back HIGH_RISK; sports and price markets come back clean | [`src/lib/rules.ts`](src/lib/rules.ts), [`test/rules.test.ts`](test/rules.test.ts) | `pnpm unit` |
| Longshots are judged against the odds paid; overlapping leaks are reported once; small samples are never reported | [`src/lib/history.ts`](src/lib/history.ts), [`test/history.test.ts`](test/history.test.ts) | `pnpm unit` |
| Losing positions are never counted as unclaimed winnings | [`src/lib/traps.ts`](src/lib/traps.ts) | `pnpm unit` |
| Any verdict on a live market | `trap_check` | open the same market on Polymarket and compare its order book with the numbers returned |

## 6. Not live, and why

- **Background alerts.** PayBox runs each call in a fresh sandbox with no memory, so `trap_watch` checks when you ask, not continuously.
- **One-tap claims for normal Polymarket accounts.** Polymarket holds positions in a proxy or Safe wallet that only Polymarket's site can claim from. `check_unclaimed` finds those winnings and links to them; `propose_claim` refuses rather than build a transaction that would redeem nothing.
- **Newer collateral.** `propose_claim` redeems against USDC.e. Markets settled in Polymarket's newer collateral may not redeem through it.
- **History depth.** `pattern_summary` reads the 200 most recent closed bets and 500 most recent trades. Polymarket's API does not document units for every field, so dollar stakes come from trades where they exist and from shares times price otherwise.
- **Exact Strategy rules text.** The Strategy test fixture is reconstructed from news coverage; it will be replaced with the text saved from Gamma.

## 7. Who has named this problem

- **Wall Street Journal, May 2026.** Over 70% of 1.6 million Polymarket accounts lost money; 0.1% captured 67% of profits.
- **Kalshi.** Losing users outnumber winners about 2.9 to 1.
- **[The Block](https://theblock.co/post/403312/polymarket-faces-backlash-strategy-bitcoin-sale), June 2026.** Traders' backlash over the Strategy market's "No" resolution.
- **[Galaxy Research](https://www.galaxy.com/insights/research/strategy-bitcoin-sale-polymarket-resolution-dispute-may-2026).** Markets should be labelled event-based or confirmation-based.
- **[The Defiant](https://thedefiant.io/news/regulation/traders-sue-polymarket-ceo-coplan-over-strategy-market-decision).** Two traders sued Polymarket and its CEO over the Strategy resolution.

## 8. Run it

Node.js 24 and pnpm 11.11.0 (Windows: WSL2).

```bash
pnpm install --frozen-lockfile
pnpm unit        # unit tests on fixtures, no network
pnpm test        # typecheck, reproducible build, PayBox conformance
```

`pnpm test` writes `dist/plugin.mjs`. Upload only that file in the PayBox developer portal and allowlist:

- `gamma-api.polymarket.com`
- `clob.polymarket.com`
- `data-api.polymarket.com`

```
src/plugin.ts          wiring: server "foresyte" v1.1.0, five tools
src/tools/             trapCheck, trapWatch, patternSummary, unclaimed, proposeClaim
src/lib/http.ts        2.5 s per request, 8 s per call (PayBox allows 10)
src/lib/polymarket.ts  Gamma, CLOB and Data API reads
src/lib/book.ts        order-book math
src/lib/rules.ts       event-based vs confirmation-based, deadlines in New York time
src/lib/traps.ts       the two traps, thresholds, verdicts
src/lib/history.ts     pattern_summary: topics, price bands, market types, habits, the plan
src/lib/verdict.ts     levels and number formatting
test/                  unit tests and fixtures
```

Built for the PayBox × MoonPay Hackathon. Foresyte is information, not financial advice.
