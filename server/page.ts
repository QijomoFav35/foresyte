// The Foresyte page. One file, no build step. The live box calls the same free API agents use.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function landingPage(o: { publicUrl: string; price: string; chain: string }): string {
  const url = esc(o.publicUrl);
  const price = esc(o.price);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foresyte</title>
<meta name="description" content="Paste a Polymarket link. Foresyte tells you if the bet is a trap before you place it.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --black:#000;--panel:#181818;--raised:#242424;--line:#2e2e2e;
  --text:#fff;--muted:#a7a7a7;--blue:#3d6bff;--blue-hi:#5c83ff;
  --trap:#f3424b;--careful:#f5a623;
  --r-sm:8px;--r-md:14px;--r-pill:999px;
}
*{box-sizing:border-box;margin:0}
html{background:var(--black);color:var(--text);font:400 17px/1.55 Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{background:var(--black);min-height:100vh}
a{color:inherit}
:focus-visible{outline:2px solid var(--blue-hi);outline-offset:3px;border-radius:4px}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.num{font-variant-numeric:tabular-nums}

header{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.mark{font-weight:900;font-size:22px;letter-spacing:-.04em;text-decoration:none;display:flex;align-items:center;gap:10px}
.mark i{width:22px;height:22px;border-radius:50%;background:var(--blue);box-shadow:inset -6px -4px 0 #000}
.pill{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:var(--r-pill);font:700 15px/1 Figtree,sans-serif;padding:14px 24px;cursor:pointer;text-decoration:none;transition:transform .12s,background .12s}
.pill:hover{transform:scale(1.03)}
.pill.blue{background:var(--blue);color:#fff}.pill.blue:hover{background:var(--blue-hi)}
.pill.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px #727272}
.pill.ghost:hover{box-shadow:inset 0 0 0 1px #fff}
.pill:disabled{opacity:.5;cursor:wait;transform:none}

.hero{padding:56px 0 40px}
h1{font-weight:900;font-size:clamp(46px,8.6vw,104px);line-height:.92;letter-spacing:-.055em;max-width:11ch}
.lede{color:var(--muted);font-size:clamp(17px,2vw,20px);max-width:52ch;margin-top:22px}

.check{margin-top:40px;background:var(--panel);border-radius:var(--r-md);padding:22px}
.row{display:grid;grid-template-columns:1fr 150px 150px auto;gap:12px}
label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin:0 0 6px 4px}
input,select{width:100%;background:var(--raised);border:1px solid transparent;color:#fff;border-radius:var(--r-sm);padding:14px 14px;font:500 16px Figtree,sans-serif}
input:focus,select:focus{border-color:var(--blue);outline:none}
.row .go{align-self:end}
.hint{color:var(--muted);font-size:14px;margin:12px 4px 0}

.result{margin-top:22px;display:none}
.result.on{display:block;animation:rise .35s ease-out}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.result.on{animation:none}.pill{transition:none}}
.verdict{font-weight:900;font-size:clamp(40px,7vw,84px);line-height:.95;letter-spacing:-.05em}
.verdict.trap{color:var(--trap)}.verdict.careful{color:var(--careful)}.verdict.safe{color:var(--blue-hi)}
.worst{font-size:clamp(18px,2.3vw,24px);font-weight:600;margin-top:14px;max-width:46ch}
.why{list-style:none;padding:0;margin-top:20px;display:grid;gap:10px;max-width:70ch}
.why li{padding-left:20px;position:relative;color:#e4e4e4}
.why li:before{content:"";position:absolute;left:0;top:.62em;width:8px;height:8px;border-radius:50%;background:var(--muted)}
.why li.t:before{background:var(--trap)}.why li.c:before{background:var(--careful)}
.todo{margin-top:20px;font-weight:700}
.meta{color:var(--muted);font-size:14px;margin-top:10px}
.facts{display:flex;flex-wrap:wrap;gap:28px;margin-top:22px}
.facts div{min-width:120px}.facts b{display:block;font-size:26px;font-weight:800;letter-spacing:-.03em}.facts span{color:var(--muted);font-size:14px}
.err{color:var(--careful);font-weight:600}
.choices{margin-top:10px;display:grid;gap:6px}.choices button{all:unset;cursor:pointer;color:var(--blue-hi);font-weight:600}

.upsell{margin-top:26px;border-top:1px solid var(--line);padding-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:18px;justify-content:space-between}
.upsell p{max-width:56ch;color:#e4e4e4}
.code{margin-top:18px;display:none;background:var(--black);border-radius:var(--r-md);padding:20px}
.code.on{display:block}
.code .big{font-weight:900;font-size:clamp(30px,5vw,48px);letter-spacing:.02em;color:var(--blue-hi)}
.prompt{display:flex;gap:10px;align-items:stretch;margin-top:14px;flex-wrap:wrap}
.prompt output{flex:1 1 320px;background:var(--raised);border-radius:var(--r-sm);padding:14px;font-weight:500}

section{padding:72px 0 0}
h2{font-weight:800;font-size:clamp(30px,4.4vw,48px);line-height:1;letter-spacing:-.04em;max-width:18ch}
.sub{color:var(--muted);margin-top:14px;max-width:60ch}

.stories{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px}
.story{background:var(--panel);border-radius:var(--r-md);padding:26px}
.story h3{font-size:24px;font-weight:800;letter-spacing:-.03em}
.story .amt{font-size:56px;font-weight:900;letter-spacing:-.05em;line-height:1;margin:18px 0 6px}
.story ol{padding-left:20px;margin-top:16px;display:grid;gap:8px;color:#e4e4e4}
.story .fix{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.story .fix b{color:var(--blue-hi)}

.price{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:32px}
.tier{background:var(--panel);border-radius:var(--r-md);padding:26px}
.tier.paid{background:var(--blue)}
.tier h3{font-size:20px;font-weight:700}
.tier .cost{font-size:52px;font-weight:900;letter-spacing:-.05em;margin:8px 0 14px}
.tier ul{padding-left:20px;display:grid;gap:6px}
.tier.paid li{color:#eef2ff}

.api{margin-top:32px;background:var(--panel);border-radius:var(--r-md);overflow:hidden}
.api table{width:100%;border-collapse:collapse}
.api td{padding:14px 20px;border-top:1px solid var(--line);vertical-align:top}
.api tr:first-child td{border-top:0}
.api code{font:600 14px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;word-break:break-all}
.api .free{color:var(--muted)}.api .paidtag{color:var(--blue-hi);font-weight:700}
pre.sample{margin-top:16px;background:var(--panel);border-radius:var(--r-md);padding:20px;overflow:auto;font:500 13.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d6d6d6}

.rules{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:32px}
.rules h3{font-size:19px;font-weight:800;letter-spacing:-.02em}
.rules p{color:var(--muted);margin-top:8px}

footer{margin-top:88px;padding:36px 0 56px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .founder{color:#fff;font-size:clamp(22px,3vw,30px);font-weight:800;letter-spacing:-.03em;max-width:28ch;margin-bottom:20px}

@media (max-width:820px){
  .row{grid-template-columns:1fr 1fr}.row .market,.row .go{grid-column:1/-1}
  .stories,.price{grid-template-columns:1fr}.rules{grid-template-columns:1fr}
  .api td{display:block;border-top:0;padding:4px 18px}.api tr{display:block;border-top:1px solid var(--line);padding:10px 0}
}
@media (max-width:420px){.wrap{padding:0 16px}.check{padding:16px}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="mark" href="/"><i aria-hidden="true"></i>Foresyte</a>
  <a class="pill ghost" href="https://app.paybox.sh/plugins">Add to PayBox</a>
</header>

<main>
<div class="hero">
  <h1>Is this bet a trap?</h1>
  <p class="lede">Paste any Polymarket link. Foresyte reads the live order book and the rules, and tells you the worst case in dollars before you put money in.</p>

  <form class="check" id="check" autocomplete="off">
    <div class="row">
      <div class="market"><label for="m">Polymarket link</label><input id="m" name="market" required placeholder="https://polymarket.com/event/..."></div>
      <div><label for="o">You'd buy</label><input id="o" name="outcome" placeholder="Yes"></div>
      <div><label for="s">Amount (USD)</label><input id="s" name="stake" type="number" min="1" step="1" value="50" inputmode="numeric"></div>
      <button class="pill blue go" id="go" type="submit">Check it free</button>
    </div>
    <p class="hint">No wallet, no sign-up. Same check your PayBox agent runs.</p>

    <div class="result" id="result" aria-live="polite"></div>

    <div class="upsell" id="upsell" hidden>
      <p><b>Want the full picture?</b> The deep scan shows what you'd get back at every size, the biggest bet you can still get out of, the last day to sell, and a step-by-step plan.</p>
      <button class="pill blue" id="scan" type="button">Get a deep scan for ${price}</button>
    </div>
    <div class="code" id="code" aria-live="polite"></div>
  </form>
</div>

<section>
  <h2>Two ways Polymarket takes your money</h2>
  <p class="sub">Both happened to real people. Both were visible before the bet.</p>
  <div class="stories">
    <article class="story">
      <h3>You can't get out</h3>
      <p class="amt num">$50</p>
      <p>A basketball game, winning at halftime, the app showing a profit. Nobody was buying, so there was no way to cash out. The game turned, and the $50 was gone.</p>
      <p class="fix"><b>Foresyte</b> checks how many buyers exist at your size before you buy, and tells you while you hold when they are running out.</p>
    </article>
    <article class="story">
      <h3>You can be right and still lose</h3>
      <p class="amt num">$500,000</p>
      <ol>
        <li>May 26 to 31: Strategy sells bitcoin.</li>
        <li>Sunday, May 31: the market's deadline.</li>
        <li>Monday, June 1: the filing is published.</li>
        <li>The market resolves No.</li>
      </ol>
      <p class="fix"><b>Foresyte</b> flags markets decided by what gets reported, when the deadline lands on a weekend or holiday, and tells you to get out 3 days before the end.</p>
    </article>
  </div>
</section>

<section>
  <h2>Check free. Pay for the full plan.</h2>
  <div class="price">
    <div class="tier">
      <h3>Quick check</h3>
      <p class="cost">Free</p>
      <ul><li>Trap, careful, or safe, at your amount</li><li>What you'd get back if you sold right away</li><li>The rules trap and the deadline</li><li>One clear next step</li></ul>
    </div>
    <div class="tier paid">
      <h3>Deep scan</h3>
      <p class="cost num">${price}</p>
      <ul><li>What you'd get back at $10, $50, $250, $1,000 and more</li><li>The biggest bet you can still get out of</li><li>The last day to sell</li><li>The other side of the market</li><li>A numbered plan in plain English</li></ul>
    </div>
  </div>
  <p class="sub">Paid in USDC on ${esc(o.chain)} over x402. Your PayBox agent shows the price and you approve it. Agents with their own wallet can pay directly.</p>
</section>

<section>
  <h2>Built for agents too</h2>
  <p class="sub">One free API and one paid one. Any x402 agent can call them; PayBox users get the same tools inside their chat.</p>
  <div class="api"><table>
    <tr><td><code>GET /api/check?market=&amp;outcome=&amp;stake=</code></td><td class="free">Free</td><td>The quick check as JSON</td></tr>
    <tr><td><code>POST /api/code</code></td><td class="free">Free</td><td>Turns a link into a request code and a prompt for your agent</td></tr>
    <tr><td><code>GET /api/deep-scan?code=FSY-XXXXXX</code></td><td class="paidtag">${price}</td><td>The deep scan. Answers 402, your agent pays, then it answers with the report</td></tr>
    <tr><td><code>GET /api/proof</code></td><td class="free">Free</td><td>Every paid scan with its ${esc(o.chain)} transaction</td></tr>
  </table></div>
<pre class="sample">GET ${url}/api/deep-scan?code=FSY-7K2QXM   → 402, then pay ${price}
{
  "verdict": "This is a trap.",
  "safeBetUsdc": 12,
  "sellBy": "Sunday, November 1",
  "plan": ["Bet $12 or less, not $50. Above $12 you may not be able to get out.", "..."],
  "report": "This is a trap. If you bet $50 on Lakers and want out right away, ..."
}</pre>
</section>

<section>
  <h2>Numbers, not guesses</h2>
  <div class="rules">
    <div><h3>Every number is computed</h3><p>From Polymarket's live order book at the moment you ask. The AI never makes up a price or a dollar amount.</p></div>
    <div><h3>Worst case first</h3><p>Every answer opens with what you'd get back if you needed out, before anything else.</p></div>
    <div><h3>Honest about limits</h3><p>No background alerts: run it again before you sell. It never places or blocks bets and never asks for keys.</p></div>
  </div>
</section>
</main>

<footer>
  <p class="founder">Built by someone who couldn't cash out at halftime.</p>
  <p>Foresyte gives information, not betting advice. Prediction markets can lose you all of your stake. Not affiliated with Polymarket. Open source: <a href="https://github.com/QijomoFav35/foresyte">github.com/QijomoFav35/foresyte</a></p>
</footer>
</div>

<script>
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money = (n) => n == null ? "n/a" : "$" + (n >= 100 ? Math.round(n).toLocaleString("en-US") : Number(n).toFixed(2));
const tone = { HIGH_RISK: "trap", CAUTION: "careful", CLEAR: "safe" };
let last = null;

function fields() {
  return { market: $("m").value.trim(), outcome: $("o").value.trim(), stake: $("s").value || "50" };
}

function render(d) {
  const worst = d.headline.replace(d.verdict, "").trim();
  const why = d.reasons.map((r) => '<li class="' + (r.level === "HIGH_RISK" ? "t" : "c") + '">' + esc(r.message) + "</li>").join("");
  $("result").innerHTML =
    '<p class="verdict ' + tone[d.level] + '">' + esc(d.verdict) + "</p>" +
    '<p class="worst">' + esc(worst) + "</p>" +
    (why ? '<ul class="why">' + why + "</ul>" : "") +
    '<div class="facts num">' +
      '<div><b>' + money(d.numbers.sellBackNowUsdc) + '</b><span>back if you sell right away</span></div>' +
      '<div><b>' + money(d.numbers.buyersNearPriceUsdc) + '</b><span>of buyers near the price</span></div>' +
      '<div><b>' + (d.numbers.fillPriceCents ?? "n/a") + '¢</b><span>your real price, shown ' + (d.numbers.shownPriceCents ?? "n/a") + '¢</span></div>' +
    "</div>" +
    '<p class="todo">What to do: ' + esc(d.whatToDo) + "</p>" +
    '<p class="meta">' + esc(d.market.question) + ". Decided by " + esc(d.rules.decidedBy) + (d.rules.deadline ? ", ends " + esc(d.rules.deadline) : "") + ". Checked just now.</p>";
  $("result").classList.add("on");
  $("upsell").hidden = false;
}

function showError(d) {
  let html = '<p class="err">' + esc(d.error || "Something went wrong. Try again.") + "</p>";
  if (d.options) html += '<div class="choices">' + d.options.map((o) => '<button type="button" data-slug="' + esc(o.slug) + '">' + esc(o.question) + "</button>").join("") + "</div>";
  $("result").innerHTML = html;
  $("result").classList.add("on");
  $("upsell").hidden = true;
  $("result").querySelectorAll("[data-slug]").forEach((b) => b.addEventListener("click", () => { $("m").value = b.dataset.slug; $("check").requestSubmit(); }));
}

$("check").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = fields();
  if (!f.market) return;
  $("go").disabled = true; $("go").textContent = "Checking...";
  $("code").classList.remove("on");
  try {
    const q = new URLSearchParams(f); if (!f.outcome) q.delete("outcome");
    const res = await fetch("/api/check?" + q, { headers: { accept: "application/json" } });
    const d = await res.json();
    if (!res.ok) showError(d); else { last = d; render(d); }
  } catch { showError({ error: "Couldn't reach Foresyte. Check your connection and try again." }); }
  $("go").disabled = false; $("go").textContent = "Check it free";
});

$("scan").addEventListener("click", async () => {
  const f = fields();
  $("scan").disabled = true;
  try {
    const res = await fetch("/api/code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ market: f.market, outcome: last?.outcome || f.outcome || undefined, stake: Number(f.stake) }) });
    const d = await res.json();
    if (!res.ok) { showError(d); return; }
    $("code").innerHTML =
      '<p class="big">' + esc(d.code) + "</p>" +
      "<p>Paste this into your PayBox chat. Your agent shows the " + esc(d.price) + " price, you approve it, and the deep scan comes back in the chat.</p>" +
      '<div class="prompt"><output id="ptext">' + esc(d.prompt) + '</output><button class="pill blue" type="button" id="copy">Copy prompt</button></div>' +
      '<p class="meta">Code lasts 24 hours. Agents can pay directly at ' + esc(d.payUrl) + "</p>";
    $("code").classList.add("on");
    $("copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(d.prompt); $("copy").textContent = "Copied"; } catch { $("copy").textContent = "Select and copy"; }
    });
  } catch { showError({ error: "Couldn't make a code. Try again." }); }
  finally { $("scan").disabled = false; }
});
</script>
</body>
</html>`;
}
