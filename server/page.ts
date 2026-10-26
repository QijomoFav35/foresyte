// The Foresyte page. One file, no build step. Mobile first: phone layout is the default, wider screens add columns.
// Structure follows Roster Finance (Stocklana winner) and LEAPSY: live tool in the hero, the problem as a timeline,
// free vs paid, comparison, agents, live proof, objections as an FAQ, dated sources, one closing line.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function landingPage(o: { publicUrl: string; price: string; chain: string }): string {
  const url = esc(o.publicUrl);
  const price = esc(o.price);
  const chain = esc(o.chain);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foresyte</title>
<meta name="description" content="Paste a Polymarket link. Foresyte tells you if the bet is a trap before you place it, and when to get out.">
<meta property="og:title" content="Foresyte: is this Polymarket bet a trap?">
<meta property="og:description" content="Know the worst case in dollars before you bet. Free check, $0.25 deep scan, inside your PayBox agent.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{
  --black:#000;--panel:#0b0b0d;--raised:#141418;--line:rgba(255,255,255,.09);--line-hi:rgba(255,255,255,.16);
  --text:#fff;--soft:#d4d4d8;--muted:#9a9aa3;
  --blue:#3d6bff;--blue-hi:#7b98ff;--glow:rgba(61,107,255,.35);--trap:#ff4d5a;--careful:#f5a623;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --r-sm:10px;--r-md:18px;--r-pill:999px;
  --gutter:20px;--section:88px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--black);color:var(--text);font:400 17px/1.6 Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--black);min-height:100vh;overflow-x:hidden}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
a{color:inherit}
img{display:block;max-width:100%}
:focus-visible{outline:2px solid var(--blue-hi);outline-offset:3px;border-radius:4px}
.wrap{width:100%;max-width:1080px;margin:0 auto;padding:0 var(--gutter)}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* nav */
.nav{position:fixed;inset:0 0 auto;z-index:20;background:linear-gradient(180deg,rgba(0,0,0,.7),rgba(0,0,0,0));transition:background .2s}
.nav.solid{background:rgba(0,0,0,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.nav .wrap{display:flex;align-items:center;gap:28px;height:64px;max-width:1240px}
.mark{font-weight:900;font-size:20px;letter-spacing:-.04em;text-decoration:none;display:flex;align-items:center;gap:9px;margin-right:auto}
.mark i{width:18px;height:18px;border-radius:50%;background:var(--blue);box-shadow:0 0 14px var(--glow),inset -5px -3px 0 #000;flex:none}
.links{display:none;gap:24px;font-weight:600;font-size:15px;color:var(--soft)}
.links a{text-decoration:none}.links a:hover{color:#fff}

/* buttons */
.pill{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:var(--r-pill);font:700 15px/1 Figtree,sans-serif;padding:14px 22px;min-height:46px;cursor:pointer;text-decoration:none;transition:background .15s,box-shadow .15s;white-space:nowrap}
.pill.blue{background:var(--blue);color:#fff;box-shadow:0 0 0 1px rgba(255,255,255,.12) inset,0 8px 28px var(--glow)}
.pill.blue:hover{background:#5179ff}
.pill.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px var(--line-hi)}.pill.ghost:hover{box-shadow:inset 0 0 0 1px #fff}
.pill.small{min-height:38px;padding:9px 16px;font-size:14px}
.pill:disabled{opacity:.55;cursor:wait}

/* hero */
.hero{position:relative;isolation:isolate;width:100vw;margin-left:calc(50% - 50vw);min-height:min(100svh,940px);display:flex;align-items:flex-end;padding:120px 0 40px;overflow:hidden}
.hero-bg{position:absolute;inset:0;z-index:-2}
.hero-bg img{width:100%;height:100%;object-fit:cover;object-position:45% 35%}
.hero:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.55) 40%,rgba(0,0,0,.9) 75%,#000 100%)}
.hero-in{width:100%;max-width:1120px;margin:0 auto;padding:0 var(--gutter)}
.lede{color:#fff;font-weight:600;font-size:clamp(19px,2.8vw,26px);line-height:1.35;max-width:40ch;text-shadow:0 2px 14px rgba(0,0,0,.6)}

/* the chat box */
.chat{margin-top:24px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:var(--panel);border-radius:var(--r-md);display:flex;flex-direction:column;overflow:hidden}
.chat-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);font-size:14px;color:var(--muted)}
.chat-head b{color:#fff;font-size:15px}
.chat-head .live{width:8px;height:8px;border-radius:50%;background:#3ecf8e;box-shadow:0 0 0 4px rgba(62,207,142,.15)}
.log{display:flex;flex-direction:column;gap:14px;padding:18px;min-height:200px;max-height:min(55vh,520px);overflow-y:auto;overscroll-behavior:contain;scroll-behavior:smooth}
.msg{max-width:100%;border-radius:18px;padding:14px 16px;animation:rise .3s ease-out}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.msg.bot{background:var(--raised);align-self:flex-start;border-bottom-left-radius:6px}
.msg.me{background:var(--blue);align-self:flex-end;border-bottom-right-radius:6px;max-width:88%;font-weight:600;overflow-wrap:anywhere}
.msg.me small{display:block;font-weight:500;color:#dbe4ff;font-size:13px;margin-top:2px}
.msg.intro p{color:var(--soft)}
.msg.intro ul{margin:10px 0 0 18px;color:var(--muted);font-size:15px;display:grid;gap:4px}
.typing{display:flex;gap:5px;padding:16px 18px}
.typing i{width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1s infinite}
.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
@keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}}
.verdict{font-weight:900;font-size:clamp(30px,7vw,48px);line-height:1;letter-spacing:-.045em}
.verdict.trap{color:var(--trap)}.verdict.careful{color:var(--careful)}.verdict.safe{color:var(--blue-hi)}
.worst{font-size:clamp(16px,2.2vw,19px);font-weight:600;margin-top:10px;max-width:52ch}
.why{list-style:none;margin-top:14px;display:grid;gap:8px;max-width:64ch}
.why li{padding-left:18px;position:relative;color:var(--soft);font-size:15px}
.why li:before{content:"";position:absolute;left:0;top:.6em;width:8px;height:8px;border-radius:50%;background:var(--careful)}
.why li.t:before{background:var(--trap)}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.facts div{background:var(--panel);border-radius:var(--r-sm);padding:10px 12px}
.facts b{display:block;font-size:clamp(20px,4vw,24px);font-weight:800;letter-spacing:-.03em}
.facts span{color:var(--muted);font-size:13px;line-height:1.35;display:block}
.todo{margin-top:14px;font-weight:700}
.meta{color:var(--muted);font-size:13.5px;margin-top:8px;overflow-wrap:anywhere}
.offer{margin-top:16px;padding-top:14px;border-top:1px solid #333;display:grid;gap:10px}
.offer p{color:var(--soft);font-size:15px}
.offer .pill{justify-self:start}
.err{color:var(--careful);font-weight:600}
.choices{margin-top:10px;display:grid;gap:6px}
.choices button{all:unset;cursor:pointer;color:var(--blue-hi);font-weight:600;padding:4px 0}
.code-big{font-weight:900;font-size:clamp(28px,7vw,40px);letter-spacing:.02em;color:var(--blue-hi)}
.prompt{display:grid;gap:10px;margin-top:12px}
.prompt output{background:var(--black);border-radius:var(--r-sm);padding:12px 14px;font-weight:600;overflow-wrap:anywhere}
.composer{border-top:1px solid var(--line);padding:12px;display:grid;gap:10px;background:var(--panel)}
.ask{display:flex;align-items:flex-end;gap:8px;background:var(--raised);border:1px solid #3a3a3a;border-radius:22px;padding:8px 8px 8px 16px;transition:border-color .12s}
.ask:focus-within{border-color:var(--blue)}
.ask textarea{flex:1;min-width:0;background:transparent;border:0;outline:none;resize:none;color:#fff;font:500 16px/1.45 Figtree,sans-serif;padding:7px 0;max-height:160px}
.ask textarea::placeholder{color:#8a8a8a}
.send{flex:none;width:42px;height:42px;border-radius:50%;border:0;background:var(--blue);color:#fff;display:grid;place-items:center;cursor:pointer;transition:background .12s}
.send:hover{background:#5179ff}.send:disabled{opacity:.5;cursor:wait}
.send svg{width:20px;height:20px}
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:0 6px;font-size:13px;color:var(--muted)}
.chips label{display:flex;align-items:center;gap:6px;font-weight:600}
.chips input{width:76px;background:var(--raised);border:1px solid transparent;color:#fff;border-radius:var(--r-pill);padding:6px 10px;font:600 14px Figtree,sans-serif;min-height:34px}
.chips input:focus{border-color:var(--blue);outline:none}
.chips span{margin-left:auto}
.hint{color:var(--muted);font-size:13px;margin:10px 4px 0}

.chat{background:rgba(8,8,10,.86);border:1px solid var(--line-hi);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.chat-head{border-color:var(--line)}
.msg.bot{background:#15151a;border:1px solid var(--line)}
.facts div{background:#0d0d10;border:1px solid var(--line)}
.facts b{font-family:var(--mono);font-size:clamp(18px,3.4vw,22px)}
.code-big{font-family:var(--mono)}
.composer{background:transparent;border-color:var(--line)}
.ask{background:#121216;border-color:var(--line-hi)}
.chips input{background:#121216;border:1px solid var(--line)}
.hint{margin-top:12px}

/* sections */
section{padding-top:var(--section);scroll-margin-top:80px}
h2{font-weight:800;font-size:clamp(28px,5vw,40px);line-height:1.08;letter-spacing:-.035em;max-width:20ch}
.sub{color:var(--muted);margin-top:10px;max-width:56ch}
.card{border:1px solid var(--line);border-radius:var(--r-md);background:var(--panel);padding:22px}
.grid2{display:grid;gap:14px;margin-top:28px}

.steps{display:grid;gap:10px;margin-top:28px;list-style:none;counter-reset:s}
.steps li{counter-increment:s;display:grid;grid-template-columns:36px 1fr;gap:4px 14px;align-items:start}
.steps li:before{content:counter(s);grid-row:span 2;width:32px;height:32px;border-radius:50%;border:1px solid var(--line-hi);display:grid;place-items:center;font:700 14px var(--mono);color:var(--blue-hi)}
.steps b{font-size:17px}.steps span{color:var(--muted);font-size:15px}

.trap h3{font-size:20px;font-weight:800;letter-spacing:-.02em}
.trap .big{font-size:clamp(40px,8vw,56px);font-weight:700;line-height:1;margin:18px 0 6px;color:var(--trap)}
.trap .cap{color:var(--muted);font-size:15px}
.trap .fix{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);color:var(--soft);font-size:15.5px}
.trap .fix b{color:var(--blue-hi)}

.tier h3{font-size:17px;font-weight:700;color:var(--soft)}
.tier .cost{font-size:clamp(38px,7vw,48px);font-weight:700;margin:6px 0 16px}
.tier ul{list-style:none;display:grid;gap:8px;color:var(--soft);font-size:15.5px}
.tier li{padding-left:22px;position:relative}
.tier li:before{content:"";position:absolute;left:2px;top:.55em;width:9px;height:5px;border-left:2px solid var(--blue-hi);border-bottom:2px solid var(--blue-hi);transform:rotate(-45deg)}
.tier.paid{border-color:rgba(61,107,255,.55);background:linear-gradient(180deg,rgba(61,107,255,.14),rgba(61,107,255,.03) 60%),var(--panel);box-shadow:0 0 40px rgba(61,107,255,.12)}
.tier.paid .cost{color:var(--blue-hi)}

.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:28px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--panel)}
table{border-collapse:collapse;width:100%}
.compare{min-width:520px}
.compare th,.compare td{text-align:left;padding:14px 18px;border-top:1px solid var(--line);font-size:15px}
.compare thead th{border-top:0;color:var(--muted);font-weight:600;font-size:14px}
.compare thead th:last-child{color:var(--blue-hi)}
.compare td:first-child{color:var(--soft)}
.compare .y{color:#fff;font-weight:700}.compare .n{color:var(--muted)}

.stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin-top:28px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-md);overflow:hidden}
.stats div{background:var(--panel);padding:18px 20px}
.stats b{display:block;font-size:clamp(26px,5vw,34px);font-weight:700}
.stats span{color:var(--muted);font-size:14px}
.ledger{margin-top:14px}
.ledger .row{display:grid;gap:2px;padding:12px 0;border-top:1px solid var(--line);font-size:15px}
.ledger .row:first-child{border-top:0;padding-top:0}
.ledger a{color:var(--blue-hi);font-weight:600}
.empty{color:var(--muted);font-size:15px}

details.dev{margin-top:14px}
details.dev summary{list-style:none;cursor:pointer;font-weight:700;display:flex;justify-content:space-between;align-items:center}
details.dev summary::-webkit-details-marker{display:none}
details.dev summary span{color:var(--muted);font-weight:500;font-size:14px}
.endpoints{margin-top:16px}
.endpoints .row{display:grid;gap:2px;padding:12px 0;border-top:1px solid var(--line)}
.endpoints code,pre{font:500 13px/1.6 var(--mono)}
.endpoints code{color:#fff;overflow-wrap:anywhere}
.endpoints .p{font-size:13px;font-weight:700;color:var(--muted)}.endpoints .p.paid{color:var(--blue-hi)}
.endpoints .row > span:last-child{color:var(--soft);font-size:15px}
pre{background:#060608;border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;overflow-x:auto;color:#cfd3dc;margin-top:10px}
.copyrow{display:grid;gap:10px}

.faq{margin-top:24px;border-top:1px solid var(--line)}
.faq details{border-bottom:1px solid var(--line)}
.faq summary{list-style:none;cursor:pointer;padding:18px 36px 18px 0;font-weight:600;font-size:17px;position:relative}
.faq summary::-webkit-details-marker{display:none}
.faq summary:after{content:"+";position:absolute;right:4px;top:50%;transform:translateY(-50%);font:500 22px var(--mono);color:var(--muted)}
.faq details[open] summary:after{content:"−"}
.faq details p{color:var(--soft);padding:0 0 18px;max-width:64ch;font-size:16px}

footer{margin-top:104px;border-top:1px solid var(--line);padding:36px 0 48px;color:var(--muted);font-size:14px}
footer .top{display:grid;gap:24px}
footer .cta p{color:#fff;font-weight:700;font-size:20px;letter-spacing:-.02em;margin-bottom:14px}
footer .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px}
footer h4{color:#fff;font-size:14px;margin-bottom:8px}
footer ul{list-style:none;display:grid;gap:6px}
footer a{text-decoration:none}footer a:hover{color:#fff}
footer .fine{margin-top:28px;padding-top:18px;border-top:1px solid var(--line)}

@media (min-width:640px){
  :root{--gutter:28px}
  .facts{grid-template-columns:repeat(3,1fr)}
  .prompt{grid-template-columns:1fr auto}
  .offer{grid-template-columns:1fr auto;align-items:center}
  .offer .pill{justify-self:end}
  .msg{max-width:92%}
  .grid2{grid-template-columns:1fr 1fr}
  .steps{grid-template-columns:repeat(2,1fr);gap:22px}
  .stats{grid-template-columns:repeat(4,1fr)}
  .endpoints .row{grid-template-columns:1fr 70px;column-gap:16px}
  .endpoints .row > span:last-child{grid-column:1/-1}
  .copyrow{grid-template-columns:1fr auto;align-items:start}
  footer .top{grid-template-columns:1.2fr 2fr}
  footer .cols{grid-template-columns:repeat(3,1fr)}
}
@media (min-width:900px){
  :root{--section:120px}
  .links{display:flex}
  .hero{padding:160px 0 56px}
  .log{padding:22px}
  .steps{grid-template-columns:repeat(4,1fr)}
  .card{padding:28px}
}
</style>
</head>
<body>
<nav class="nav" id="nav" aria-label="Main">
  <div class="wrap">
    <a class="mark" href="/"><i aria-hidden="true"></i>Foresyte</a>
    <div class="links"><a href="#how">How it works</a><a href="#traps">Traps</a><a href="#pricing">Pricing</a><a href="#proof">Proof</a><a href="#faq">FAQ</a></div>
    <a class="pill blue small" href="https://app.paybox.sh/plugins">Add to PayBox</a>
  </div>
</nav>

<main class="wrap">
<header class="hero">
  <picture class="hero-bg" aria-hidden="true">
    <source type="image/webp" srcset="/hero-760.webp 760w, /hero-1280.webp 1280w" sizes="100vw">
    <img src="/hero-1280.webp" width="1280" height="757" alt="" fetchpriority="high">
  </picture>
  <div class="hero-in">
  <h1 class="sr">Foresyte: is this Polymarket bet a trap?</h1>
  <p class="lede">Paste any Polymarket link. Foresyte tells you the worst case in dollars before you put money in, and when to get out once you have.</p>

  <div class="chat" id="try">
    <div class="chat-head"><span class="live" aria-hidden="true"></span><b>Foresyte</b><span>Free check, live Polymarket data</span></div>
    <div class="log" id="log" aria-live="polite">
      <div class="msg bot intro">
        <p>Paste a Polymarket link and tell me what you'd bet. I'll tell you:</p>
        <ul><li>if you can get your money back out</li><li>the price you'd really pay at your amount</li><li>if the rules can make you lose even when you're right</li></ul>
      </div>
    </div>
    <form class="composer" id="check" autocomplete="off">
      <div class="ask">
        <label class="sr" for="q">Ask Foresyte</label>
        <textarea id="q" name="q" rows="2" required placeholder="Paste a Polymarket link, or ask: Is this a trap? $50 on Yes https://polymarket.com/event/..."></textarea>
        <button class="send" id="go" type="submit" aria-label="Check it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M12 5l7 7-7 7"/></svg></button>
      </div>
      <div class="chips">
        <label>Amount $<input id="s" name="stake" type="number" min="1" step="1" value="50" inputmode="numeric"></label>
        <label>You'd buy<input id="o" name="outcome" placeholder="Yes"></label>
        <span>Press Enter to send</span>
      </div>
    </form>
  </div>
  <p class="hint">Free, no wallet, no sign-up. The same check your PayBox agent runs.</p>
  </div>
</header>

<section id="how">
  <h2>How it works</h2>
  <ol class="steps">
    <li><b>Paste a link</b><span>Any Polymarket market, with your amount.</span></li>
    <li><b>Get the verdict</b><span>Trap, careful, or safe. Free.</span></li>
    <li><b>Go deeper</b><span>A code for the ${price} deep scan.</span></li>
    <li><b>Approve in PayBox</b><span>Your full plan comes back in chat.</span></li>
  </ol>
</section>

<section id="traps">
  <h2>The two traps</h2>
  <div class="grid2">
    <article class="card trap">
      <h3>You can't get out</h3>
      <p class="big num">$8</p>
      <p class="cap">of buyers on a game where someone bet $50. Winning at halftime, unable to sell, lost it all.</p>
      <p class="fix"><b>Foresyte</b> checks the buyers at your amount before you bet, and tells you when they are running out.</p>
    </article>
    <article class="card trap">
      <h3>You can be right and still lose</h3>
      <p class="big num">$500K</p>
      <p class="cap">lost on the Strategy bitcoin market. The sale happened; the filing came after the Sunday deadline.</p>
      <p class="fix"><b>Foresyte</b> flags markets decided by a report, not the event, and gives you the last day to sell.</p>
    </article>
  </div>
</section>

<section id="pricing">
  <h2>Check free. Go deep for ${price}.</h2>
  <div class="grid2">
    <div class="card tier">
      <h3>Quick check</h3>
      <p class="cost num">Free</p>
      <ul><li>Trap, careful, or safe at your amount</li><li>What you'd get back if you sold now</li><li>The rules trap and the deadline</li><li>One clear next step</li></ul>
    </div>
    <div class="card tier paid">
      <h3>Deep scan</h3>
      <p class="cost num">${price}</p>
      <ul><li>Your money back at $10 to $25,000</li><li>The biggest bet you can still get out of</li><li>The last day to sell</li><li>The other side of the market</li><li>A step-by-step plan</li></ul>
    </div>
  </div>
  <p class="sub">USDC on ${chain} via x402. Approve in PayBox, or let your agent pay from its own wallet.</p>
</section>

<section id="compare">
  <h2>What the app doesn't tell you</h2>
  <div class="scroll"><table class="compare">
    <thead><tr><th scope="col"><span class="sr">Question</span></th><th scope="col">Polymarket app</th><th scope="col">Foresyte</th></tr></thead>
    <tbody>
      <tr><td>Real price at your amount</td><td class="n">Do the math yourself</td><td class="y">In dollars</td></tr>
      <tr><td>Can you sell before it ends?</td><td class="n">Not shown</td><td class="y">Checked first</td></tr>
      <tr><td>Decided by event or by report?</td><td class="n">In the fine print</td><td class="y">Flagged</td></tr>
      <tr><td>When to get out</td><td class="n">Not shown</td><td class="y">Last day to sell</td></tr>
      <tr><td>Inside your AI agent</td><td class="n">No</td><td class="y">Yes</td></tr>
    </tbody>
  </table></div>
</section>

<section id="proof">
  <h2>Check our work</h2>
  <div class="stats">
    <div><b class="num">60</b><span>unit tests</span></div>
    <div><b class="num">3</b><span>live data sources</span></div>
    <div><b class="num" id="paid-count">0</b><span>paid scans</span></div>
    <div><b class="num">0</b><span>keys needed</span></div>
  </div>
  <div class="card ledger" id="ledger"><p class="empty">No paid scans yet. Each one will appear here with its ${chain} transaction.</p></div>
  <details class="card dev" id="agents">
    <summary>For developers and agents <span>Show</span></summary>
    <div class="endpoints">
      <div class="row"><code>GET /api/check?market=&amp;outcome=&amp;stake=</code><span class="p">Free</span><span>Quick check as JSON</span></div>
      <div class="row"><code>POST /api/code</code><span class="p">Free</span><span>Link to request code and prompt</span></div>
      <div class="row"><code>GET /api/deep-scan?code=FSY-…</code><span class="p paid">${price}</span><span>402, pay, then the report</span></div>
      <div class="row"><code>GET /api/proof</code><span class="p">Free</span><span>Paid scans with transactions</span></div>
    </div>
    <div class="copyrow" style="margin-top:16px"><pre id="agent-prompt">Use the Foresyte plugin to check if &lt;Polymarket link&gt; is a trap for $50.</pre><button class="pill ghost small" type="button" data-copy="agent-prompt">Copy</button></div>
  </details>
</section>

<section id="faq">
  <h2>FAQ</h2>
  <div class="faq">
    <details><summary>Is this betting advice?</summary><p>No. Foresyte shows you how a market works right now: who is buying, what you'd get back, and how the rules decide the result. The choice is yours. You can lose all of your stake.</p></details>
    <details><summary>Polymarket already shows a price. Why isn't that enough?</summary><p>That price is for a small amount. A bigger bet pays more as it eats through the cheap shares, and selling gets you less if few people are buying. Foresyte works it out at your exact amount.</p></details>
    <details><summary>Where do the numbers come from?</summary><p>Polymarket's public data, read the moment you ask. Nothing is cached, and the AI never makes up a number.</p></details>
    <details><summary>What is the 3-day rule?</summary><p>In a market's last 3 days, buyers tend to vanish and the rules start to decide it. If a risky market is in that window, Foresyte tells you to get out.</p></details>
    <details><summary>Will it alert me while I hold a bet?</summary><p>Not in the background yet. Ask your agent to check your positions any time, and always before you sell.</p></details>
    <details><summary>How do I pay ${price}?</summary><p>In your PayBox chat: your agent shows the price, you approve, and USDC moves on ${chain} via x402. No account, no card. If the scan can't run, you aren't charged.</p></details>
    <details><summary>Can my own agent pay?</summary><p>Yes. Any agent with an x402 wallet can call the deep scan link and pay for itself.</p></details>
    <details><summary>Does Foresyte place bets or hold my money?</summary><p>No. It only reads public data. It never places bets, never asks for keys, and never holds funds.</p></details>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <div class="top">
      <div class="cta"><p>Know the worst case before you click.</p><a class="pill blue small" href="#try">Check a market</a></div>
      <div class="cols">
        <div><h4>Product</h4><ul><li><a href="#try">Free check</a></li><li><a href="#pricing">Deep scan</a></li><li><a href="https://app.paybox.sh/plugins">PayBox plugin</a></li></ul></div>
        <div><h4>Sources</h4><ul><li><a href="https://theblock.co/post/403312/polymarket-faces-backlash-strategy-bitcoin-sale">The Block</a></li><li><a href="https://www.galaxy.com/insights/research/strategy-bitcoin-sale-polymarket-resolution-dispute-may-2026">Galaxy Research</a></li></ul></div>
        <div><h4>Build</h4><ul><li><a href="https://github.com/QijomoFav35/foresyte">GitHub</a></li><li><a href="/api/proof">Proof (JSON)</a></li><li><a href="/?format=json">API</a></li></ul></div>
      </div>
    </div>
    <p class="fine">Built by someone who couldn't cash out at halftime. Information, not betting advice. Not affiliated with Polymarket. PayBox Hackathon finalist.</p>
  </div>
</footer>

<script>
const navEl = document.getElementById("nav");
const onScroll = () => navEl.classList.toggle("solid", window.scrollY > 40);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const money = (n) => n == null ? "n/a" : "$" + (n >= 100 ? Math.round(n).toLocaleString("en-US") : Number(n).toFixed(2).replace(/\\.00$/, ""));
const tone = { HIGH_RISK: "trap", CAUTION: "careful", CLEAR: "safe" };
let last = null;
const log = $("log");

// Read the message like a chat: find the link, an amount ($50, 50 usd) and Yes/No. Words in the message win over the small fields.
function fields() {
  const text = $("q").value.trim();
  const link = (text.match(/https?:\\/\\/[^\\s]+/i) || [])[0] || (text.match(/\\b[a-z0-9]+(?:-[a-z0-9]+){2,}\\b/i) || [])[0] || "";
  const amt = text.match(/\\$\\s?(\\d[\\d,]*(?:\\.\\d+)?)/) || text.match(/(\\d[\\d,]*(?:\\.\\d+)?)\\s?(?:usd|usdc|dollars?)\\b/i);
  const side = text.match(/\\bon\\s+(yes|no)\\b/i) || text.match(/\\b(yes|no)\\b/i);
  return {
    text,
    market: link.replace(/[).,]+$/, ""),
    outcome: side ? side[1][0].toUpperCase() + side[1].slice(1).toLowerCase() : $("o").value.trim(),
    stake: amt ? amt[1].replace(/,/g, "") : ($("s").value || "50"),
  };
}

function add(cls, html) {
  const el = document.createElement("div");
  el.className = "msg " + cls;
  el.innerHTML = html;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}
function typing() { return add("bot typing", "<i></i><i></i><i></i>"); }
function shortLink(u) { const t = u.replace("https://", "").replace("http://", "").replace("www.", ""); return t.length > 60 ? t.slice(0, 60) + "..." : t; }

function verdictHtml(d) {
  const worst = d.headline.replace(d.verdict, "").trim();
  const why = d.reasons.map((r) => '<li class="' + (r.level === "HIGH_RISK" ? "t" : "c") + '">' + esc(r.message) + "</li>").join("");
  const fill = d.numbers.fillPriceCents == null ? "n/a" : d.numbers.fillPriceCents + "¢";
  return '<p class="verdict ' + tone[d.level] + '">' + esc(d.verdict) + "</p>" +
    '<p class="worst">' + esc(worst) + "</p>" +
    (why ? '<ul class="why">' + why + "</ul>" : "") +
    '<div class="facts num">' +
      "<div><b>" + money(d.numbers.sellBackNowUsdc) + "</b><span>back if you sell right away</span></div>" +
      "<div><b>" + money(d.numbers.buyersNearPriceUsdc) + "</b><span>of buyers near the price</span></div>" +
      "<div><b>" + fill + "</b><span>your real price (shown " + (d.numbers.shownPriceCents ?? "n/a") + "¢)</span></div>" +
    "</div>" +
    '<p class="todo">What to do: ' + esc(d.whatToDo) + "</p>" +
    '<p class="meta">' + esc(d.market.question) + ". Decided by " + esc(d.rules.decidedBy) + (d.rules.deadline ? ", ends " + esc(d.rules.deadline) : "") + ".</p>" +
    '<div class="offer"><p>Want the full plan? What you&rsquo;d get back at every amount, the biggest bet you can still get out of, and the last day to sell.</p>' +
    '<button class="pill blue small" type="button" data-scan>Get a deep scan for ${price}</button></div>';
}

function render(d) {
  const el = add("bot", verdictHtml(d));
  el.querySelector("[data-scan]").addEventListener("click", (e) => deepScanCode(e.currentTarget));
}

function errorHtml(d) {
  let html = '<p class="err">' + esc(d.error || "That didn't work. Check the link and try again.") + "</p>";
  if (d.options) html += '<div class="choices">' + d.options.map((o) => '<button type="button" data-slug="' + esc(o.slug) + '">' + esc(o.question) + "</button>").join("") + "</div>";
  return html;
}
function showError(d, el) {
  el = el || add("bot", "");
  el.className = "msg bot";
  el.innerHTML = errorHtml(d);
  el.querySelectorAll("[data-slug]").forEach((b) => b.addEventListener("click", () => { $("q").value = b.dataset.slug + " $" + ($("s").value || "50"); $("check").requestSubmit(); }));
  log.scrollTop = log.scrollHeight;
}

async function copy(text, btn) {
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch { btn.textContent = "Select and copy"; }
}

$("check").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = fields();
  if (!f.text) return;
  add("me", esc(f.text.replace(f.market, "").trim() || "Is this a trap?") + (f.market ? "<small>" + esc(shortLink(f.market)) + "</small>" : ""));
  $("q").value = "";
  if (!f.market) { showError({ error: "Paste a Polymarket link in your message so I know which market to check." }); return; }
  const wait = typing();
  $("go").disabled = true;
  try {
    const q = new URLSearchParams({ market: f.market, stake: f.stake }); if (f.outcome) q.set("outcome", f.outcome);
    const res = await fetch("/api/check?" + q, { headers: { accept: "application/json" } });
    const d = await res.json();
    wait.remove();
    if (!res.ok) showError(d); else { last = { ...d, input: f }; render(d); }
  } catch { showError({ error: "Couldn't reach Foresyte. Check your connection and try again." }, wait); }
  $("go").disabled = false;
});

$("q").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("check").requestSubmit(); }
});
$("q").addEventListener("input", (e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; });

async function deepScanCode(btn) {
  const f = last?.input || fields();
  btn.disabled = true;
  add("me", "Deep scan, please.");
  const wait = typing();
  try {
    const res = await fetch("/api/code", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ market: f.market, outcome: last?.outcome || f.outcome || undefined, stake: Number(f.stake) }) });
    const d = await res.json();
    if (!res.ok) { showError(d, wait); return; }
    wait.className = "msg bot";
    wait.innerHTML =
      "<p>Here's your code:</p>" +
      '<p class="code-big">' + esc(d.code) + "</p>" +
      "<p>Paste this into your PayBox chat. Your agent shows the " + esc(d.price) + " price, you approve it, and the deep scan comes back in the chat.</p>" +
      '<div class="prompt"><output>' + esc(d.prompt) + '</output><button class="pill blue small" type="button">Copy prompt</button></div>' +
      '<p class="meta">The code lasts 24 hours. Agents with their own wallet can pay at ' + esc(d.payUrl) + "</p>";
    wait.querySelector(".prompt button").addEventListener("click", (e) => copy(d.prompt, e.currentTarget));
    log.scrollTop = log.scrollHeight;
  } catch { showError({ error: "Couldn't make a code. Try again." }, wait); }
  finally { btn.disabled = false; }
}

document.getElementById("agents").addEventListener("toggle", (e) => { e.currentTarget.querySelector("summary span").textContent = e.currentTarget.open ? "Hide" : "Show"; });
document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copy($(b.dataset.copy).textContent, b)));

fetch("/api/proof", { headers: { accept: "application/json" } }).then((r) => r.json()).then((d) => {
  if (!d.scans?.length) return;
  $("paid-count").textContent = d.scans.length;
  $("ledger").innerHTML = d.scans.slice(0, 10).map((s) =>
    '<div class="row"><b>' + esc(s.market) + "</b><span>" + esc(s.verdict) + " " + new Date(s.at).toLocaleString() + "</span>" +
    (s.explorer ? '<a href="' + esc(s.explorer) + '">View payment on ${chain}</a>' : "") + "</div>").join("");
}).catch(() => {});
</script>
</body>
</html>`;
}
