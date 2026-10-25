# Foresyte

**Foresyte tells you if a Polymarket market is a trap before you buy, and when to get out while you can.**

Built for the PayBox × MoonPay hackathon finals. Tone: **inform, never block.** Every check returns `CLEAR`, `CAUTION`, or `HIGH_RISK` with plain English and real numbers from the live book and rules text.

---

## The two traps

1. **Liquidity trap** — the app shows a cash-out price, but there are not enough buyers at your size, so you cannot exit until resolution.
2. **Rules / timing trap** — the market resolves on what is *reported* by a deadline (often Fri–Mon or near a US holiday), not on what happened. You can be right and still lose (MicroStrategy-style weekend reporting).

After resolution, Foresyte still scans for **unclaimed winnings** and points you to claim them on Polymarket.

---

## Tools

| Tool | When | What it does |
|---|---|---|
| `trap_check` | Before you buy | Walks the CLOB book at your exact stake; flags thin exit depth, fill slippage, wide spreads; reads resolution rules for reporting + weekend/holiday deadlines |
| `trap_watch` | While you hold | Top open positions: P&L, sell-now proceeds, EXIT CLOSING, DEADLINE RISK, LOCK-IN notes |
| `check_unclaimed` | After resolution | Finds `redeemable === true` positions with `currentValue > 0` and totals them |
| `search_markets` | Discovery | Live Polymarket markets by keyword |
| `propose_claim` | Rare | Unsigned `redeemPositions` **only if the PayBox wallet itself holds the position** |

`pattern_summary` from earlier drafts is **not** in this build.

---

## Sources (problem, not marketing)

- WSJ analysis of ~1.6M Polymarket accounts: majority of users lose; a tiny share of wallets take most profits.
- Kalshi public figures: unprofitable users outnumber profitable ones (~2.9:1).
- Public trader reports of weekend / reporting-dependent resolution blowups (e.g. MicroStrategy BTC sale logged after the weekend deadline).
- Founder experience: thin sports-book liquidity that blocked a live cash-out.

Numbers change; cite the original articles when you pitch.

---

## Network hosts (allowlist)

- `gamma-api.polymarket.com`
- `clob.polymarket.com`
- `data-api.polymarket.com`

No secrets. No AI model calls inside the plugin. No background polling (PayBox sandboxes are fresh per call).

---

## Known limitations

- **Claim path:** Most Polymarket accounts hold positions in a **Proxy or Safe** wallet. Calling `redeemPositions` from a PayBox EOA does not redeem those. `check_unclaimed` finds the money and links to Polymarket. `propose_claim` **refuses** unless the PayBox wallet itself holds the redeemable position.
- Neg-risk markets and pUSD collateral adapters may need different redeem paths than the classic CTF four-arg call.
- `trap_watch` has no stored history; "exit closing" is inferred from **current** book depth vs position size.
- Informational only — never places, blocks, or cancels bets.

---

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Requires **Node 24** and **pnpm 11.11.0**. Upload `dist/plugin.mjs` in the PayBox developer portal, allowlist the three hosts above, run checks, Submit Project, Enable.

MCP server name: `foresyte` · version: `1.1.0`

---

## Smoke prompts

- `trap_check` — market: a thin live sports slug, outcome: Yes, stakeUsdc: 50
- `trap_check` — market: a filing/announcement market ending Fri–Mon, outcome: Yes, stakeUsdc: 100
- `trap_watch` — wallet: `0x…` with open positions
- `check_unclaimed` — wallet: `0x…`

---

## Built for

PayBox marketplace. The agent informs. You decide. You approve.
