// Smoke test for a running Foresyte server. No wallet needed, nothing is paid.
// Usage: npm run smoke -- http://localhost:3000 "<a live Polymarket market link>"
// Checks: health, free check, request code, the x402 402 challenge (price, network, payTo), and that bad requests are refused before the paywall.

const base = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const market = process.argv[3];
let failed = 0;

function ok(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!cond) failed++;
}

async function get(path: string, init?: RequestInit) {
  const res = await fetch(base + path, { headers: { accept: "application/json" }, ...init });
  let body: any = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

const h = await get("/health");
ok("health answers", h.res.ok && h.body?.ok === true, h.body?.network);

const page = await fetch(base + "/", { headers: { accept: "text/html" } });
ok("page serves HTML", page.ok && (await page.text()).includes("Know if a contract is a trap"));

const bad = await get("/api/deep-scan?code=FSY-ZZZZZZ");
ok("unknown code refused for free (404, not 402)", bad.res.status === 404);
const head = await fetch(base + "/api/deep-scan?code=FSY-ZZZZZZ", { method: "POST" });
ok("non-GET refused (405)", head.status === 405);

if (!market) {
  console.log("\nSkipping live checks: pass a live Polymarket link as the second argument.");
} else {
  let target = market;
  let c = await get(`/api/check?${new URLSearchParams({ market: target, stake: "50" })}`);
  if (c.res.status === 409 && Array.isArray(c.body?.options) && c.body.options[0]?.slug) {
    // An event with several markets: the page lists them; here we take the first one
    ok("multi-market event lists its markets", true, `${c.body.options.length} markets`);
    target = c.body.options[0].slug;
    console.log(`      using: ${c.body.options[0].question}`);
    c = await get(`/api/check?${new URLSearchParams({ market: target, stake: "50" })}`);
  }
  ok("free check returns a verdict", c.res.ok && typeof c.body?.verdict === "string", c.body?.verdict ?? c.body?.error);
  if (c.res.ok) console.log(`      ${c.body.headline}\n      Risk read: ${c.body.whatToDo}`);

  const code = await get("/api/code", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ market: target, stake: 50 }) });
  ok("request code created", code.res.status === 201 && /^FSY-[A-Z2-9]{6}$/.test(code.body?.code ?? ""), code.body?.code ?? code.body?.error);

  if (code.body?.code) {
    const lookup = await get(`/api/code/${code.body.code}`);
    ok("code lookup works", lookup.res.ok && lookup.body?.request?.stakeUsdc === 50);

    const paid = await fetch(code.body.payUrl, { headers: { accept: "application/json" } });
    ok("deep scan asks for payment (402)", paid.status === 402, `HTTP ${paid.status}`);
    const header = paid.headers.get("payment-required");
    let challenge: any = null;
    try { challenge = header ? JSON.parse(Buffer.from(header, "base64").toString("utf8")) : await paid.json(); } catch {}
    const accept = challenge?.accepts?.find((a: any) => String(a.network).startsWith("solana:"));
    const base = challenge?.accepts?.find((a: any) => String(a.network).startsWith("eip155:"));
    console.log(`      networks offered: ${(challenge?.accepts ?? []).map((a: any) => a.network).join(", ")}`);
    ok("402 names the exact scheme", accept?.scheme === "exact", accept?.scheme);
    ok("402 is on Solana", typeof accept?.network === "string" && accept.network.startsWith("solana:"), accept?.network);
    ok("402 price is 0.10 USDC (100000)", String(accept?.amount ?? accept?.maxAmountRequired) === "100000", String(accept?.amount ?? accept?.maxAmountRequired));
    if (base) ok("Base option pays a 0x address", /^0x[0-9a-fA-F]{40}$/.test(base.payTo ?? ""), base.payTo);
    ok("402 pays a Solana PAY_TO address", typeof accept?.payTo === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(accept.payTo), accept?.payTo);
  }
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
