# Foresyte: handoff (read this first)

Any model or person continuing this work: start here. Last updated Oct 26, 2026, 18:35 (UTC+1).

## What Foresyte is
A PayBox (MoonPay) plugin that tells you if a Polymarket bet is a trap before you place it, and when to get out.
Finals: demo video on X tagging @PayBox by **Wed Oct 28**; winners revealed **Fri Oct 30**. 13 finalists, top 3 win.

The two traps (real stories, the whole pitch rests on them):
1. **Liquidity trap: you can't get out.** The founder's $50 basketball bet: winning at halftime, nobody buying, couldn't cash out, lost it.
2. **Rules trap: you can be right and still lose.** Strategy (MicroStrategy) "sells any bitcoin by May 31, 2026", sale happened, deadline was a Sunday, 8-K filed Monday June 1, market resolved No. ~$500k lost by one trader, ~$6M total. Site glitched, no buyers near the end.

## State of the code
- `main` = v1.1.0 (commit 5c3c4e4), live on PayBox.
- Branch **`v1.2-plain-english`** = everything below (v1.2.0). Merge to main once `pnpm test` passes.

| Piece | File | Status |
| --- | --- | --- |
| trap_check (before you buy) | src/tools/trapCheck.ts, src/lib/traps.ts | Done, plain English |
| trap_watch (while you hold) | src/tools/trapWatch.ts | Done, plain English |
| 3-day exit-window rule | src/lib/traps.ts + src/lib/plain.ts | Done: rules or liquidity risk within 3 days of the end = HIGH_RISK, "Get out now" |
| Plain-English layer | src/lib/plain.ts | Done: "This is a trap." / "Be careful." / "Looks safe at this size." + "What to do:" |
| Deep scan logic (paid) | src/lib/deepScan.ts | Done: exit ladder, biggest bet you can get out of, sell-by date, other side, numbered plan |
| Request codes FSY-XXXXXX | src/lib/codes.ts | Done |
| deep_scan plugin tool | src/tools/deepScan.ts | Done: returns x402 proposal (0.10 USDC, Solana default, Base option). **FORESYTE_URL must match the Render URL** |
| Web server | server/ (index.ts, scan.ts, page.ts, store.ts, config.ts) | Written, **not yet run** (no npm access where it was written) |
| Render setup | render.yaml | Written |
| check_unclaimed / propose_claim / pattern_summary | src/tools/ | From v1.1.0. Polymarket now auto-claims, so unclaimed is out of the pitch |

Unit tests: 60 pass (`node --test test/*.test.ts`). All math is in pure functions in src/lib (no npm dependencies), shared by the plugin and the server.

## How payment works (x402, confirmed)
Copied from TrueBill (github.com/big14way/truebill), a PayBox finalist tested end to end on Base mainnet:
Express 5 + `@x402/express` v2, exact scheme, `@payai/facilitator`, USDC on Solana (was Base). No API keys.
1. Page: paste link → free check → "Get a deep scan" → code FSY-XXXXXX + prompt "Use the Foresyte plugin to run a deep scan with code FSY-XXXXXX."
2. Person pastes prompt in PayBox chat → plugin `deep_scan` returns x402 proposal → PayBox shows $0.10 → person approves → paid GET /api/deep-scan → report.
3. Agents with their own wallet call GET /api/deep-scan directly (402 → pay → 200).
A guard before the paywall refuses bad codes or links for free, so nobody pays for a scan that can't run.

## Next steps, in order
1. On the founder's PC (Ubuntu/WSL, ~/foresyte): `git fetch origin && git checkout v1.2-plain-english && pnpm install && pnpm test`. Fix any typecheck error.
2. Run the server locally: `cd server && npm install && PUBLIC_URL=http://localhost:3000 PAY_TO=<base address> npm start`, open http://localhost:3000, paste a live Polymarket link. Fix anything broken.
   Then in a second terminal: `cd server && npm run smoke -- http://localhost:3000 "<live Polymarket link>"`. It checks the free routes, the request code, and the x402 402 challenge (price 100000, Solana, payTo) without paying.
   Optional full payment test on Base Sepolia (free test USDC from faucet.circle.com): start the server with `NETWORK=testnet`, then `TEST_BUYER_KEY=0x<throwaway test key> npm run buy -- "<payUrl>"`. Also confirm a failed scan (bad market after payment) is NOT settled.
3. Deploy: Render → New → Blueprint → this repo. Set PUBLIC_URL (the onrender.com URL) and PAY_TO. Starter plan ($7/mo).
4. Set `FORESYTE_URL` in src/tools/deepScan.ts to that URL; `pnpm test`; upload dist/plugin.mjs to developer.paybox.sh; allowlist gamma-api.polymarket.com, clob.polymarket.com, data-api.polymarket.com **and the Render host**; Submit Project → Enable.
5. Three real paid deep scans from PayBox (needs ~$2 USDC on Base in the PayBox wallet). Their tx hashes show at /api/proof: this is the on-chain proof.
6. README rewrite (proof first, like Roster Finance), then the 90 s video, post on X tagging @PayBox by Wed Oct 28.
Later, if time: The Desk (paid topic scan: 10 worst traps + 10 safest markets in a topic), Trap Index number.

## Design (page)
Structure follows Roster Finance + LEAPSY: sticky anchor nav, finalist badge, live check in the hero, two problem timelines (what happened vs with Foresyte), 4-step deep-scan flow + free/paid cards, comparison table, agent endpoints + copy prompt, live proof ledger from /api/proof, FAQ (all claims live here), dated sources, closing line. Mobile first; breakpoints at 640px and 900px.

Spotify-inspired: pure black, #181818 panels, white text, Polymarket blue #3D6BFF as the one accent, red #F3424B only for "This is a trap.", amber #F5A623 for "Be careful.". Font Figtree, very bold tight headlines. The hero is the live check; the verdict appears in huge type. Founder may send his own colours: swap the CSS variables at the top of server/page.ts.

## Founder preferences
- Decisive, ready-to-use files. No long question lists, no hedging, no pivoting away from the agreed plan.
- Everything a person reads must be plain English a 10-year-old understands. Agents get exact numbers in structuredContent.
- Always end a session with commit + push; GitHub is the checkpoint.
- Benchmark: Stocklana (Solana) winner Roster Finance: one real pain, worst case shown first, proof for every claim, honest limits.

## Latest (Oct 26, 18:35)
- Page: founder's engraved bird-and-flute picture is the hero image (server/public/hero-*.webp). The free check is a chat box: one message field that reads plain sentences ("Is this a trap? $50 on Yes <link>"), verdict comes back as a reply, deep-scan code as the next reply.
- Possible palette switch to the picture's peacock blue + antique gold: founder hasn't decided.
- Still to do, in order: run `pnpm test` and the server on the founder's PC, `npm run smoke`, testnet `npm run buy`, deploy on Render, set FORESYTE_URL, point paybox-plugin.json sample call at trap_check, upload plugin 1.2.0, 3 real paid scans, README, video by Wed Oct 28.

## Trap case cards (Oct 26, 22:45), all verified against news sources
Strategy bitcoin ($3.8M cleared, 1,838 accounts; The Block), Zelenskyy suit ($237M volume; Decrypt), Ukraine minerals ($7M, ~25% of UMA votes one holder; Cointelegraph), Paris temperature ($1.4M over two days; Boston Globe/CNN), oversized whale ($2.07M in 35 days, 51% win rate; Coinpedia).
Left out: "BTC daily markers secret rule edit" (no source found), unclaimed winnings (Polymarket auto-claims now). No trader names on the site. No full stops in page copy (founder's style).

## Payments moved to Solana (Oct 26, 23:20)
x402 now settles USDC on **Solana** (founder's call: PayBox/MoonPay prizes are on Solana).
- Server: `@x402/svm` ExactSvmScheme, network `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (Devnet `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`), PayAI facilitator by default, `FACILITATOR_URL` overrides. Setup from solana.com/docs/payments/agentic-payments/x402.
- PAY_TO is a Solana address and must already have a USDC token account (receive any USDC once first).
- Plugin deep_scan proposes `solana:mainnet`, 100000 (0.10 USDC); PayBox's proposeX402 fills the USDC mint.
- Test: `npm run smoke` (no wallet) then Devnet `npm run buy` with a throwaway Devnet key.
- Unproven until tested: PayAI facilitator on Solana mainnet (check `https://facilitator.payai.network/supported`). Base path (TrueBill) is the fallback if Solana fails.

## Both networks (Oct 26, 23:25)
The 402 lists USDC on Solana first and on Base second (only when PAY_TO_BASE is set). Env: PAY_TO_SOLANA (required; PAY_TO also accepted), PAY_TO_BASE (optional).
Plugin deep_scan takes payWith: "solana" (default) or "base". Proof ledger links Solscan or BaseScan per payment.

## Brand (Oct 26, 23:50)
Founder's brand: seal mark (triangle eye, rays, dotted ring), gold #C8A96A, navy #0B1530, ivory #F3EFE6, wordmark in spaced serif caps (Cormorant Garamond).
server/brand.ts draws the seal and the app icon as SVG; used in nav (horizontal dark lockup), chat avatars, footer, and the favicon.
/brand-kit page shows the founder's Augur + Seer = Foresyte story image and the logo sheet (server/public/brand-*.webp); linked from nav and footer.

## Edge vs TrueBill and LEAPSY (Oct 27, 00:35)
Added: optional Upstash Redis persistence for codes and the paid-scan log (UPSTASH_REDIS_REST_URL / _TOKEN, same as TrueBill; memory if unset), per-visitor limit on free routes (FREE_CHECKS_PER_MIN, default 20), 20 s cache for identical free checks.
Still behind TrueBill on proof: no real mainnet payments yet. Get 3+ real Solana payments through PayBox and show them in the Log section and README.
Must verify in the real-money test: a scan that fails after payment is NOT settled (pay for a closed market on purpose, check Solscan).
Optional, LEAPSY-style: a remote /mcp endpoint so any MCP agent can connect without PayBox.
