# Foresyte

Know if a Polymarket contract is a trap before you buy it.

Live: "[foresyte.onrender.com](https://foresyte.onrender.com)" · PayBox plugin `foresyte` v1.2.1 · Full Audit $0.10 USDC on Solana or Base over x402 · 61 unit tests

Paste a Polymarket link. Foresyte reads the live order book and the market's resolution rules and tells you, in plain English, whether there's enough liquidity to exit and whether the resolution rules could make you lose even if you're right. The free check gives the verdict. The Full Audit, paid in your AI chat and approved in PayBox, gives the numbers.

Analysis, not financial advice. Foresyte never places, blocks or signs a trade.

---

< Proof it works >

| What | Where |
| --- | --- |
| Live site with the free check and the Full Audit | [foresyte.onrender.com](https://foresyte.onrender.com) |
| Every paid Full Audit, with its onchain payment (Solscan or BaseScan) | the **Log** on the site, or [`/api/proof`](https://foresyte.onrender.com/api/proof) |
| The paywall answers with a real x402 challenge (Solana first, Base second, 0.10 USDC) | `curl -i "https://foresyte.onrender.com/api/deep-scan?market=<polymarket link>"` |
| No charge when a scan can't run: the server returns an error and the payment is never settled | [`server/index.ts`](server/index.ts), the guard before the paywall and the paid handler |
| The trap math, on saved order books and rules | `pnpm unit` (61 tests) |

< The two traps >

"You can't get out." Your portfolio shows a position value, but position value is not cash out. If there are no bids near the price, you can't sell, or you take heavy slippage selling into the bids.

< You can be right > and still lose. In May 2026, Strategy sold 32 BTC before the market's May 31 deadline, but the filing came out on Monday, June 1. A clarification added to the market rules said late confirmation didn't count, and Yes went from 81% to almost zero. One trader reports losing $500K ([The Block](https://theblock.co/post/403312/polymarket-faces-backlash-strategy-bitcoin-sale)).

More cases, each with its source, are on the site under **Previously Recorded Traps**.

## How it works

1. Free check. Paste a link with an amount and a side ("$50 on Yes"). Foresyte gives the verdict (*Looks safe at this size, "Be careful" or "This is a trap") and names the risks it found.
2. "Full Audit, $0.10." Click Unlock. The site gives a code and a short prompt, plus a choice of Solana or Base. Paste the prompt in the AI chat that has PayBox connected (ChatGPT, Claude or Grok), approve 0.10 USDC in PayBox, comment done and the report comes back in the chat.
3. "Agents pay directly." Any agent with an x402 wallet can call `/api/deep-scan` and pay for itself.

The prompt the site hands out:

```
@PayBox run the Foresyte plugin's deep_scan with code FSY-XXXXXX. Show me the 0.10 USDC payment on Solana to approve. When I say done, call get_request until it finishes and show the report exactly as written.
```

 What the Full Audit adds

- "Exit ladder:" buy $10, $50, $100, $250, $1,000, $5,000, $25,000 and sell straight back into the bids. What you'd receive at each size.
- "Largest size that can still exit", losing at most 10% on the way out.
- "Deadline window:" the day the last 3 days begin, when bids tend to dry up and the resolution rules decide the outcome.
- "The other side": the opposite outcome, checked the same way.
- "Risk read:" a short numbered summary in plain English.

< PayBox plugin tools >

| Tool | What it does | Cost |
| --- | --- | --- |
| `trap_check` | Is this contract a trap at this size? Exit liquidity, fill price, spread, and how the market resolves | free |
| `deep_scan` | The Full Audit above, paid over x402 through PayBox | $0.10 |
| `trap_watch` | For positions you hold: what selling now returns, bids thinning out, the deadline window | free |
| `pattern_summary` | A wallet's history: where it loses, judged against the implied probability it paid, and habits like bigger buys after losses | free |
| `check_unclaimed` | Winning shares never redeemed, with links | free |
| `propose_claim` | Prepares a redemption for PayBox approval when the winning shares sit in the PayBox wallet | free |

< How a verdict is decided >

Any trap-level finding makes the verdict *This is a trap*; otherwise any warning makes it <Be careful>; otherwise <Looks safe at this size>. Thresholds live in [`src/lib/traps.ts`](src/lib/traps.ts), [`src/lib/book.ts`](src/lib/book.ts) and [`src/lib/rules.ts`](src/lib/rules.ts).

| Check | Rule | Level |
| --- | --- | --- |
| Can't fill | not enough asks to fill this size | trap |
| No bids | the order book has no bids | trap |
| Exit thinner than the size | bids within 5¢ of the best bid total less than the amount checked | trap |
| Deadline window | a risky market inside its last 3 days | trap |
| Reporting deadline near a weekend or holiday | the market pays on what is reported by a deadline that falls on a Friday to Sunday or next to a US market holiday (New York time) | trap |
| Exit thin | bids near the price total less than 2× the amount | warning |
| Slippage | the average fill is more than 5% worse than the shown price | warning |
| Wide spread | bid-ask spread wider than 5¢ | warning |
| Resolves on reporting | the same reporting rule on an ordinary weekday | warning |
| Clarification added | the market rules carry a clarification or additional context | warning |
| Vague wording | discretion, ambiguous, unclear, subjective, interpretation | warning |

The resolution rules check follows the split Galaxy Research proposed after the Strategy dispute: is a market **event-based** (pays on what happens) or **confirmation-based** (pays on what is reported by a deadline)? Sports results and price-feed markets are event-based and aren't flagged.

## Where every number comes from

| Figure | Source |
| --- | --- |
| Question, rules, end date, outcomes, prices | Gamma API, `gamma-api.polymarket.com` |
| Bids and asks at every price | CLOB API, `clob.polymarket.com/book` |
| Positions, closed positions, trades | Data API, `data-api.polymarket.com` |

Fetched live on every call. Nothing is estimated: if Polymarket doesn't answer in time, Foresyte says so instead of guessing. The free check on the site reuses an answer for at most 20 seconds.

 Payments

- x402 v2 with `@x402/express`, the `exact` scheme and the PayAI facilitator
- USDC on Solana (default) and Base, $0.10 per Full Audit
- The server never holds keys or funds. Payment is settled only after the scan succeeds, so a scan that fails costs nothing
- Request codes (`FSY-XXXXXX`) expire after 24 hours. The paid scan also accepts the market link directly

< Security and privacy >

- No accounts, no cookies, no trackers
- Security headers (CSP, HSTS, nosniff, frame blocking), per-visitor rate limits on free and paid routes, request size limits
- Links are only ever looked up on Polymarket's own APIs
- The Log shows the market, the verdict and the public onchain payment, with the wallet shortened

**Known issue:** `npm audit` reports a high-severity advisory in `zod` ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)), pulled in by the `@x402/*` packages, with no upstream fix yet. Exposure is low here: the only input it validates is the payment header, which Node caps at 16 KB. It will be updated when the x402 packages ship the fix.

< Run it >

Node.js 24 and pnpm 11.11.0 (Windows: WSL2).

```bash
pnpm install --frozen-lockfile
pnpm unit        # unit tests on saved data, no network
pnpm test        # typecheck, build, PayBox conformance; writes dist/plugin.mjs
```

Upload `dist/plugin.mjs` in the PayBox developer portal and allow these hosts: `gamma-api.polymarket.com`, `clob.polymarket.com`, `data-api.polymarket.com`, `foresyte.onrender.com`.

The web service (in `server/`) deploys to Render from `render.yaml`:

```bash
cd server && npm install
PAY_TO_SOLANA=<your Solana address> PUBLIC_URL=http://localhost:3000 npm start
npm run smoke -- http://localhost:3000 "<a live Polymarket link>"   # page, free check, codes, the 402; nothing is paid
```

Optional: `PAY_TO_BASE` to accept Base, and `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` so codes and the Log survive redeploys.

```
src/plugin.ts          the PayBox plugin: six tools
src/tools/             one file per tool
src/lib/               order-book math, rules, traps, the Full Audit, wallet history
server/                the website, the free API and the x402 paywall
test/                  unit tests and saved Polymarket data
```

< How this was built >

Designed and built by emelu for the PayBox × MoonPay Hackathon.

Foresyte is analysis only, not financial advice.
