// Foresyte web service.
//   Free:  GET  /api/check       the trap_check verdict for any Polymarket link (the page's live box uses it)
//          POST /api/code        turn a link into a request code + a prompt to paste into PayBox
//          GET  /api/code/:code  what a code asks for, and its pay URL
//          GET  /api/proof       every paid scan with its Base transaction
//   Paid:  GET  /api/deep-scan   the full deep scan, $0.25 USDC on Base over x402
// x402 setup copied from TrueBill (a PayBox finalist tested end to end on Base mainnet):
// @x402/express v2, exact scheme, PayAI facilitator. The server never holds keys or funds.

import express from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { facilitator } from "@payai/facilitator";
import { CAIP2, CHAIN_NAME, EXPLORER_TX, PAY_TO, PORT, PUBLIC_URL, SCAN_PRICE } from "./config.ts";
import { getRequest, paidScans, recordPaid, saveRequest } from "./store.ts";
import { UserError, fullScan, parseRequest, quickCheck } from "./scan.ts";
import { agentPrompt, normalizeCode, type ScanRequest } from "../src/lib/codes.ts";
import { landingPage } from "./page.ts";

const app = express();
app.set("trust proxy", true); // correct https:// URLs behind Render's proxy
app.set("case sensitive routing", true); // /API/DEEP-SCAN can't slip past the paywall
app.set("strict routing", true); // /api/deep-scan/ can't slip past the paywall
app.use(express.json({ limit: "20kb" }));

// Let the page and any browser-based agent call the free API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, payment-signature, x-payment");
  res.setHeader("Access-Control-Expose-Headers", "payment-required, payment-response, x-payment-response");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// The hero picture and any other static files. Cached for a week.
app.use(express.static(new URL("./public", import.meta.url).pathname, { maxAge: "7d", index: false }));

const wantsHtml = (req: express.Request) => req.query.format !== "json" && req.accepts(["json", "html"]) === "html";

function payUrl(r: ScanRequest | { code: string }): string {
  if ("code" in r) return `${PUBLIC_URL}/api/deep-scan?code=${r.code}`;
  const q = new URLSearchParams({ market: r.market, stake: String(r.stakeUsdc) });
  if (r.outcome) q.set("outcome", r.outcome);
  return `${PUBLIC_URL}/api/deep-scan?${q}`;
}

function sendError(res: express.Response, error: unknown) {
  if (error instanceof UserError) return res.status(error.status).json({ error: error.message, options: error.options ?? undefined });
  console.error(error);
  return res.status(502).json({ error: "Polymarket didn't answer in time. Try again in a moment." });
}

// ───────────────────────── Free routes ─────────────────────────

const manifest = () => ({
  name: "Foresyte",
  tagline: "Know if a Polymarket bet is a trap before you place it.",
  network: CHAIN_NAME,
  endpoints: {
    check: { method: "GET", url: `${PUBLIC_URL}/api/check?market=<polymarket link>&outcome=<Yes|No|...>&stake=<usd>`, price: "free" },
    code: { method: "POST", url: `${PUBLIC_URL}/api/code`, body: { market: "<link>", outcome: "<optional>", stake: 50 }, price: "free" },
    deepScan: { method: "GET", url: `${PUBLIC_URL}/api/deep-scan?code=<FSY-XXXXXX>  or  ?market=<link>&outcome=&stake=`, price: SCAN_PRICE, payment: "x402" },
    proof: { method: "GET", url: `${PUBLIC_URL}/api/proof`, price: "free" },
  },
  agentInstructions:
    "Call /api/check for a free verdict. For the full deep scan (exit ladder, biggest bet you can get out of, sell-by date, plan), call /api/deep-scan with x402. Show the person the 'report' field exactly as written.",
});

app.get("/", (req, res) => {
  if (wantsHtml(req)) return res.type("html").send(landingPage({ publicUrl: PUBLIC_URL, price: SCAN_PRICE, chain: CHAIN_NAME }));
  res.json(manifest());
});

app.get("/health", (_req, res) => res.json({ ok: true, network: CHAIN_NAME }));

app.get("/api/check", async (req, res) => {
  try {
    res.json(await quickCheck(parseRequest(req.query)));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/code", async (req, res) => {
  try {
    const request = parseRequest(req.body ?? {});
    const preview = await quickCheck(request); // also proves the link works before anyone pays
    const code = saveRequest({ ...request, market: preview.market.link, outcome: preview.outcome });
    res.status(201).json({
      code,
      prompt: agentPrompt(code),
      price: SCAN_PRICE,
      payUrl: payUrl({ code }),
      preview,
    });
  } catch (error) {
    sendError(res, error);
  }
});

app.get("/api/code/:code", (req, res) => {
  const code = normalizeCode(String(req.params.code));
  const request = code ? getRequest(code) : null;
  if (!code || !request) return res.status(404).json({ error: "Unknown or expired code. Make a new one on the Foresyte page." });
  res.json({ code, request, price: SCAN_PRICE, payUrl: payUrl({ code }) });
});

app.get("/api/proof", (_req, res) => {
  res.json({ network: CHAIN_NAME, scans: paidScans().map((p) => ({ ...p, explorer: p.txHash ? `${EXPLORER_TX}${p.txHash}` : null })) });
});

// ─────────────── Guard that runs BEFORE the paywall ───────────────
// Nobody pays for a scan that can't run: bad codes and bad links are refused here, free.
// Express app.get() also answers HEAD, which the x402 "GET" route doesn't cover, so only plain GET passes.

type WithScan = express.Request & { scanRequest?: ScanRequest };

app.use("/api/deep-scan", (req: WithScan, res, next) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });
  if (req.path !== "/") return res.status(404).json({ error: "Not found" });
  try {
    if (typeof req.query.code === "string") {
      const code = normalizeCode(req.query.code);
      const request = code ? getRequest(code) : null;
      if (!request) return res.status(404).json({ error: "Unknown or expired code. Make a new one on the Foresyte page, or pass market=<link>." });
      req.scanRequest = request;
    } else {
      req.scanRequest = parseRequest(req.query);
    }
  } catch (error) {
    return sendError(res, error);
  }
  next();
});

// ───────────────────────── x402 paywall ─────────────────────────

const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient(facilitator)).register("eip155:*", new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "GET /api/deep-scan": {
        accepts: [{ scheme: "exact", price: SCAN_PRICE, network: CAIP2, payTo: PAY_TO }],
        description: "Foresyte deep scan: exit ladder, biggest bet you can still get out of, sell-by date and a plain-English plan for one Polymarket market",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ───────────────────────── Paid handler ─────────────────────────

function decodeSettlement(header: unknown): { transaction?: string; payer?: string } | null {
  if (typeof header !== "string") return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

app.get("/api/deep-scan", async (req: WithScan, res) => {
  if (!req.header("payment-signature") && !req.header("x-payment")) {
    return res.status(402).json({ error: "Payment required" }); // defence in depth
  }
  try {
    const result = await fullScan(req.scanRequest!);
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      const settle = decodeSettlement(res.getHeader("payment-response") ?? res.getHeader("x-payment-response"));
      recordPaid({
        at: new Date().toISOString(),
        market: result.market.question,
        verdict: result.verdict,
        txHash: settle?.transaction ?? null,
        payer: settle?.payer ?? null,
      });
    });
    res.json(result);
  } catch (error) {
    sendError(res, error); // an error status means the payment is not settled
  }
});

// ───────────────────────── Errors + start ─────────────────────────

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

app.listen(PORT, () => {
  console.log(`Foresyte listening on ${PORT} | public ${PUBLIC_URL} | ${CHAIN_NAME} (${CAIP2}) | deep scan ${SCAN_PRICE} to ${PAY_TO}`);
});
