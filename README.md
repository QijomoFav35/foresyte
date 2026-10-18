# Foresyte

**Find unclaimed Polymarket winnings and claim them in one prompt.**

Most people leave money on Polymarket because they forget to claim resolved positions. Foresyte scans any wallet, shows live markets, flags simple patterns from your history, and prepares the claim as a Polygon transaction. You approve it inside PayBox. It settles.

Built for the PayBox Hackathon.

---

## What it does

| Tool | What it does |
|---|---|
| `search_markets` | Pulls live Polymarket markets with current odds |
| `check_unclaimed` | Scans a wallet for resolved positions that have not been claimed |
| `pattern_summary` | Looks at your own prediction history and flags simple repeatable patterns (for example, long-shot YES bets that keep losing) |
| `propose_claim` | Builds a Polygon `redeemPositions` transaction proposal. You approve it inside PayBox |

All four tools run through the PayBox MCP. No tab switching. No manual claims.

## How it works

1. You ask your agent something like “check this wallet for unclaimed Polymarket winnings” or “claim anything I won.”
2. Foresyte calls the Polymarket APIs (Gamma + data API), finds resolved but unclaimed positions, and returns the amounts.
3. If you want to claim, it builds the exact `redeemPositions` transaction for Polygon.
4. PayBox shows the proposal. You approve with your passkey. The claim settles.

It never asks for a private key. It only returns an unsigned transaction proposal that PayBox handles.

## Why it exists

Polymarket positions stay claimable after resolution. A lot of wallets leave small and large amounts unclaimed because the UI makes it easy to forget. Foresyte makes the recovery one prompt instead of hunting through resolved markets.

## Network hosts used

- `gamma-api.polymarket.com`
- `data-api.polymarket.com`

No secrets required.

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

The build produces `dist/plugin.mjs`. Upload that in the PayBox developer portal.

## Tools

### `check_unclaimed`
Input: wallet address (0x…).  
Returns: list of resolved positions that can still be claimed, with amounts.

### `propose_claim`
Input: the position details from `check_unclaimed`.  
Returns: a PayBox transaction proposal (`io.paybox/transactionProposal`) for `redeemPositions` on Polygon.

### `search_markets`
Input: optional query or category.  
Returns: current live markets and odds.

### `pattern_summary`
Input: wallet address.  
Returns: simple flags based on the wallet’s own history (for example, high frequency of low-probability YES bets that resolved No).

## Built for

PayBox marketplace. The agent proposes. You approve. It settles.
