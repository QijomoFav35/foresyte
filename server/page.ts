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
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root{
  --black:#000;--panel:#181818;--raised:#242424;--line:#2c2c2c;
  --text:#fff;--soft:#e2e2e2;--muted:#a7a7a7;
  --blue:#3d6bff;--blue-hi:#6b8dff;--trap:#f3424b;--careful:#f5a623;
  --r-sm:8px;--r-md:16px;--r-pill:999px;
  --gutter:16px;--section:64px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{background:var(--black);color:var(--text);font:400 16px/1.55 Figtree,system-ui,sans-serif;-webkit-font-smoothing:antialiased;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--black);min-height:100vh;overflow-x:hidden}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{animation:none!important;transition:none!important}}
a{color:inherit}
img,svg{display:block;max-width:100%}
:focus-visible{outline:2px solid var(--blue-hi);outline-offset:3px;border-radius:4px}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:0 var(--gutter)}
.num{font-variant-numeric:tabular-nums}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

/* nav */
.nav{position:sticky;top:0;z-index:10;background:rgba(0,0,0,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.nav .wrap{display:flex;align-items:center;gap:24px;height:64px}
.mark{font-weight:900;font-size:21px;letter-spacing:-.04em;text-decoration:none;display:flex;align-items:center;gap:9px;margin-right:auto}
.mark i{width:20px;height:20px;border-radius:50%;background:var(--blue);box-shadow:inset -6px -4px 0 #000;flex:none}
.links{display:none;gap:22px;font-weight:600;font-size:15px;color:var(--muted)}
.links a{text-decoration:none}.links a:hover{color:#fff}

/* buttons */
.pill{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:var(--r-pill);font:700 15px/1 Figtree,sans-serif;padding:14px 22px;min-height:48px;cursor:pointer;text-decoration:none;transition:transform .12s,background .12s,box-shadow .12s;white-space:nowrap}
.pill:hover{transform:scale(1.03)}
.pill.blue{background:var(--blue);color:#fff}.pill.blue:hover{background:#5179ff}
.pill.ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px #727272}.pill.ghost:hover{box-shadow:inset 0 0 0 1px #fff}
.pill.white{background:#fff;color:#000}
.pill.small{min-height:40px;padding:10px 16px;font-size:14px}
.pill:disabled{opacity:.55;cursor:wait;transform:none}

/* hero */
.hero{padding:20px 0 0}
.hero-top{display:grid;gap:24px}
.hero-art{margin:0;border-radius:var(--r-md);overflow:hidden;background:#1e3a4c;aspect-ratio:16/10}
.hero-art img{width:100%;height:100%;object-fit:cover;object-position:42% 40%}
.badge{display:inline-flex;align-items:center;gap:8px;background:var(--panel);border-radius:var(--r-pill);padding:7px 14px 7px 8px;font-size:14px;font-weight:600;color:var(--soft)}
.badge b{background:var(--blue);color:#fff;border-radius:var(--r-pill);padding:3px 9px;font-size:12px}
h1{font-weight:900;font-size:clamp(44px,12vw,104px);line-height:.92;letter-spacing:-.055em;margin-top:18px;max-width:11ch}
.lede{color:var(--muted);font-size:clamp(17px,2.4vw,20px);max-width:46ch;margin-top:18px}

/* the chat box */
.chat{margin-top:32px;background:var(--panel);border-radius:var(--r-md);display:flex;flex-direction:column;overflow:hidden}
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

/* sections */
section{padding-top:var(--section);scroll-margin-top:72px}
h2{font-weight:800;font-size:clamp(30px,6.5vw,52px);line-height:1;letter-spacing:-.045em;max-width:17ch}
.sub{color:var(--muted);margin-top:14px;max-width:58ch;font-size:17px}
.panel{background:var(--panel);border-radius:var(--r-md);padding:20px}

/* problem timelines */
.stories{display:grid;gap:16px;margin-top:28px}
.story h3{font-size:22px;font-weight:800;letter-spacing:-.03em}
.story .amt{font-size:clamp(44px,10vw,60px);font-weight:900;letter-spacing:-.05em;line-height:1;margin:10px 0 4px}
.story .amt-l{color:var(--muted);font-size:14px}
.tl{margin-top:18px;display:grid;gap:0}
.step{display:grid;gap:8px;padding:14px 0;border-top:1px solid var(--line)}
.step .when{font-weight:800;font-size:14px;color:#fff}
.step .bad,.step .good{font-size:15px;line-height:1.45;padding-left:14px;border-left:3px solid}
.step .bad{border-color:var(--trap);color:var(--soft)}
.step .good{border-color:var(--blue);color:#fff}
.step .good:empty{display:none}
.legend{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;font-size:13px;color:var(--muted)}
.legend span{display:flex;align-items:center;gap:6px}
.legend i{width:12px;height:3px;border-radius:2px}

/* steps + pricing */
.how{display:grid;gap:12px;margin-top:28px;counter-reset:s}
.how li{list-style:none;background:var(--panel);border-radius:var(--r-md);padding:18px 18px 18px 64px;position:relative;counter-increment:s}
.how li:before{content:counter(s);position:absolute;left:18px;top:16px;width:30px;height:30px;border-radius:50%;background:var(--raised);display:grid;place-items:center;font-weight:800}
.how b{display:block;font-size:17px}
.how span{color:var(--muted);font-size:15px}
.tiers{display:grid;gap:16px;margin-top:16px}
.tier h3{font-size:19px;font-weight:700}
.tier .cost{font-size:clamp(42px,9vw,54px);font-weight:900;letter-spacing:-.05em;margin:4px 0 14px}
.tier ul{padding-left:20px;display:grid;gap:6px;color:var(--soft)}
.tier.paid{background:var(--blue)}.tier.paid ul{color:#eef2ff}

/* comparison */
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:28px;border-radius:var(--r-md);background:var(--panel)}
table{border-collapse:collapse;width:100%}
.compare{min-width:520px}
.compare th,.compare td{text-align:left;padding:14px 18px;border-top:1px solid var(--line);font-size:15px;vertical-align:top}
.compare thead th{border-top:0;color:var(--muted);font-weight:600}
.compare thead th:last-child{color:#fff}
.compare td:first-child{color:var(--soft);width:44%}
.compare .y{color:#fff;font-weight:700}.compare .n{color:var(--muted)}
.scroll-hint{color:var(--muted);font-size:13px;margin-top:8px}

/* agents */
.agent{display:grid;gap:16px;margin-top:28px}
.endpoints .row{display:grid;gap:4px;padding:14px 0;border-top:1px solid var(--line)}
.endpoints .row:first-child{border-top:0;padding-top:0}
.endpoints code{font:600 13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}
.endpoints .p{font-size:13px;font-weight:700;color:var(--muted)}.endpoints .p.paid{color:var(--blue-hi)}
.endpoints span{color:var(--soft);font-size:15px}
pre{background:var(--black);border-radius:var(--r-sm);padding:14px;overflow-x:auto;font:500 13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d6d6d6;white-space:pre}
.copyrow{display:grid;gap:10px;margin-top:12px}

/* proof */
.stats{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:28px}
.stats b{display:block;font-size:clamp(30px,7vw,44px);font-weight:900;letter-spacing:-.04em}
.stats span{color:var(--muted);font-size:14px}
.ledger{margin-top:16px}
.ledger .row{display:grid;gap:2px;padding:12px 0;border-top:1px solid var(--line);font-size:15px}
.ledger .row:first-child{border-top:0}
.ledger a{color:var(--blue-hi);font-weight:600}
.empty{color:var(--muted)}

/* faq */
.faq{margin-top:28px;border-top:1px solid var(--line)}
details{border-bottom:1px solid var(--line)}
summary{list-style:none;cursor:pointer;padding:20px 40px 20px 0;font-weight:700;font-size:clamp(17px,2.4vw,20px);position:relative}
summary::-webkit-details-marker{display:none}
summary:after{content:"";position:absolute;right:6px;top:50%;width:12px;height:12px;border-right:2px solid #fff;border-bottom:2px solid #fff;transform:translateY(-70%) rotate(45deg);transition:transform .15s}
details[open] summary:after{transform:translateY(-30%) rotate(-135deg)}
details p{color:var(--soft);padding:0 0 20px;max-width:66ch}

/* sources + close */
.sources{display:grid;gap:12px;margin-top:28px}
.src{display:block;text-decoration:none;background:var(--panel);border-radius:var(--r-md);padding:18px;transition:background .12s}
.src:hover{background:var(--raised)}
.src b{display:block;font-size:17px}.src span{color:var(--muted);font-size:14px}
.close{padding-top:96px;text-align:left}
.close h2{font-size:clamp(36px,9vw,80px);max-width:14ch;letter-spacing:-.055em;line-height:.95}
.close .ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}

footer{margin-top:88px;padding:32px 0 48px;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
footer .cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px}
footer h4{color:#fff;font-size:14px;margin-bottom:8px}
footer ul{list-style:none;display:grid;gap:6px}
footer a{text-decoration:none}footer a:hover{color:#fff}
footer .founder{color:#fff;font-weight:700;font-size:16px;margin-bottom:8px}

/* wider screens add columns */
@media (min-width:640px){
  :root{--gutter:24px}
  .fields{grid-template-columns:1fr 130px 130px}
  .fields .market{grid-column:1/-1}.fields .go{grid-column:auto}
  .facts{grid-template-columns:repeat(3,1fr)}
  .upsell{grid-template-columns:1fr auto;align-items:center}
  .upsell .pill{justify-self:end}
  .prompt{grid-template-columns:1fr auto}
  .copyrow{grid-template-columns:1fr auto}
  .tiers{grid-template-columns:1fr 1fr}
  .stats{grid-template-columns:repeat(4,1fr)}
  .sources{grid-template-columns:repeat(3,1fr)}
  footer .cols{grid-template-columns:2fr 1fr 1fr 1fr}
  .scroll-hint{display:none}
}
@media (min-width:900px){
  :root{--section:104px}
  .links{display:flex}
  .hero{padding-top:64px}
  .check{padding:24px}
  .fields{grid-template-columns:1fr 130px 130px auto;align-items:end}
  .fields .market{grid-column:auto}
  .go .pill{width:auto}
  .stories{grid-template-columns:1fr 1fr}
  .step{grid-template-columns:96px 1fr 1fr;gap:16px;align-items:start}
  .how{grid-template-columns:repeat(4,1fr)}
  .how li{padding:64px 18px 18px}
  .how li:before{top:18px}
  .agent{grid-template-columns:1.1fr .9fr}
  .endpoints .row{grid-template-columns:1fr 70px;column-gap:16px}
  .endpoints .row span{grid-column:1/-1}
}
@media (min-width:640px){
  .facts{grid-template-columns:repeat(3,1fr)}
  .prompt{grid-template-columns:1fr auto}
  .offer{grid-template-columns:1fr auto;align-items:center}
  .offer .pill{justify-self:end}
  .msg{max-width:92%}
}
@media (min-width:900px){
  .hero{padding-top:40px}
  .hero-top{grid-template-columns:1fr 1.05fr;align-items:center;gap:40px}
  .hero-art{order:2;aspect-ratio:1/1}
  .hero-art img{object-position:36% 40%}
  .log{padding:22px}
}
</style>
</head>
<body>
<nav class="nav" aria-label="Main">
  <div class="wrap">
    <a class="mark" href="/"><i aria-hidden="true"></i>Foresyte</a>
    <div class="links"><a href="#traps">The traps</a><a href="#scan">Deep scan</a><a href="#agents">For agents</a><a href="#proof">Proof</a><a href="#faq">FAQ</a></div>
    <a class="pill blue small" href="https://app.paybox.sh/plugins">Add to PayBox</a>
  </div>
</nav>

<main class="wrap">
<header class="hero">
  <div class="hero-top">
    <figure class="hero-art">
      <picture>
        <source type="image/webp" srcset="/hero-760.webp 760w, /hero-1280.webp 1280w" sizes="(min-width:900px) 55vw, 100vw">
        <img src="/hero-1280.webp" width="1280" height="757" alt="Engraved illustration of a blue bird beside a face playing a golden flute" fetchpriority="high">
      </picture>
    </figure>
    <div class="hero-copy">
      <span class="badge"><b>Finalist</b>PayBox Hackathon, Chapter 1</span>
      <h1>Is this bet a trap?</h1>
      <p class="lede">Paste any Polymarket link. Foresyte tells you the worst case in dollars before you put money in, and when to get out once you have.</p>
    </div>
  </div>

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
</header>

<section id="traps">
  <h2>Two ways Polymarket takes your money</h2>
  <p class="sub">Both happened to real people. Both were visible before the bet.</p>
  <div class="legend"><span><i style="background:var(--trap)"></i>What happened</span><span><i style="background:var(--blue)"></i>With Foresyte</span></div>
  <div class="stories">
    <article class="story panel">
      <h3>You can't get out</h3>
      <p class="amt num">$50</p><p class="amt-l">lost on a game that was winning at halftime</p>
      <div class="tl">
        <div class="step"><span class="when">Tip-off</span><p class="bad">You put $50 on a basketball game in Germany. Nothing warns you that almost nobody is buying.</p><p class="good">Before you buy: "Only $8 of buyers exist near the price. Put in $50 and you can't cash out until it ends."</p></div>
        <div class="step"><span class="when">Halftime</span><p class="bad">Your team leads. The app shows a profit. You tap to cash out. Nobody buys.</p><p class="good">You bet the amount you could still sell, and you cash out at halftime.</p></div>
        <div class="step"><span class="when">Full time</span><p class="bad">The game turns. The $50 is gone.</p><p class="good">You kept your profit.</p></div>
      </div>
    </article>
    <article class="story panel">
      <h3>You can be right and still lose</h3>
      <p class="amt num">$500,000</p><p class="amt-l">lost by one trader on the Strategy bitcoin market, May 2026</p>
      <div class="tl">
        <div class="step"><span class="when">From May 26</span><p class="bad">Strategy sells bitcoin. Traders betting Yes are right.</p><p class="good">"Decided by what gets reported by Sunday, May 31. Weekend deadline: you can be right and still lose."</p></div>
        <div class="step"><span class="when">Thu, May 28</span><p class="bad">Nothing on the market tells holders the deadline is a Sunday, when filings rarely come out.</p><p class="good">"Latest day to sell is today." You sell and keep your gains.</p></div>
        <div class="step"><span class="when">Sun, May 31</span><p class="bad">The deadline passes on a Sunday with no filing. Holders trying to sell can't find buyers.</p><p class="good"></p></div>
        <div class="step"><span class="when">Mon, June 1</span><p class="bad">The filing comes out. The market resolves No.</p><p class="good">You were already out.</p></div>
      </div>
    </article>
  </div>
</section>

<section id="scan">
  <h2>Check free. Pay for the full plan.</h2>
  <ol class="how">
    <li><b>Paste a link</b><span>Get the free verdict above.</span></li>
    <li><b>Get a code</b><span>Like FSY-7K2QXM, with a prompt to copy.</span></li>
    <li><b>Paste it in PayBox</b><span>Your agent shows ${price}. You approve.</span></li>
    <li><b>Read your plan</b><span>The deep scan comes back in your chat.</span></li>
  </ol>
  <div class="tiers">
    <div class="tier panel">
      <h3>Quick check</h3>
      <p class="cost">Free</p>
      <ul><li>Trap, careful, or safe at your amount</li><li>What you'd get back if you sold right away</li><li>The rules trap and the deadline</li><li>One clear next step</li></ul>
    </div>
    <div class="tier panel paid">
      <h3>Deep scan</h3>
      <p class="cost num">${price}</p>
      <ul><li>What you'd get back at $10, $50, $250, $1,000 and more</li><li>The biggest bet you can still get out of</li><li>The last day to sell</li><li>How the other side looks</li><li>A numbered plan in plain English</li></ul>
    </div>
  </div>
</section>

<section id="compare">
  <h2>What the app doesn't tell you</h2>
  <div class="scroll"><table class="compare">
    <thead><tr><th scope="col"><span class="sr">Question</span></th><th scope="col">Polymarket app</th><th scope="col">Foresyte</th></tr></thead>
    <tbody>
      <tr><td>The price you really pay at your amount</td><td class="n">Order book only, you do the math</td><td class="y">Shown in dollars</td></tr>
      <tr><td>Can you sell before it ends?</td><td class="n">Not shown</td><td class="y">Checked before you buy</td></tr>
      <tr><td>Decided by the event or by a report?</td><td class="n">Buried in the rules text</td><td class="y">Flagged, with the deadline day</td></tr>
      <tr><td>When to get out</td><td class="n">Not shown</td><td class="y">Latest day to sell</td></tr>
      <tr><td>Works inside your AI agent</td><td class="n">No</td><td class="y">Yes, on PayBox</td></tr>
    </tbody>
  </table></div>
  <p class="scroll-hint">Swipe the table to see both columns.</p>
</section>

<section id="agents">
  <h2>Built for agents too</h2>
  <p class="sub">Any agent that speaks x402 can pay for a deep scan with its own wallet. PayBox users get the same tools in their chat.</p>
  <div class="agent">
    <div class="panel endpoints">
      <div class="row"><code>GET /api/check?market=&amp;outcome=&amp;stake=</code><span class="p">Free</span><span>The quick check as JSON</span></div>
      <div class="row"><code>POST /api/code</code><span class="p">Free</span><span>Turns a link into a code and a prompt</span></div>
      <div class="row"><code>GET /api/deep-scan?code=FSY-…</code><span class="p paid">${price}</span><span>Answers 402, your agent pays, then sends the report</span></div>
      <div class="row"><code>GET /api/proof</code><span class="p">Free</span><span>Every paid scan with its ${chain} transaction</span></div>
    </div>
    <div class="panel">
      <p><b>Paste into your agent</b></p>
      <div class="copyrow"><pre id="agent-prompt">Use the Foresyte plugin to check if &lt;Polymarket link&gt; is a trap for $50.</pre><button class="pill ghost small" type="button" data-copy="agent-prompt">Copy</button></div>
      <p class="meta" style="margin-top:16px">Response, shortened</p>
<pre>{
  "verdict": "This is a trap.",
  "safeBetUsdc": 12,
  "sellBy": "Sunday, November 1",
  "plan": ["Bet $12 or less, not $50. ..."],
  "report": "This is a trap. If you bet $50 ..."
}</pre>
    </div>
  </div>
</section>

<section id="proof">
  <h2>Check our work</h2>
  <p class="sub">Every paid scan is a real USDC payment on ${chain}. They show up here as they happen.</p>
  <div class="stats num">
    <div><b>60</b><span>unit tests on saved market data</span></div>
    <div><b>3</b><span>Polymarket sources, read live</span></div>
    <div><b id="paid-count">0</b><span>paid deep scans</span></div>
    <div><b>0</b><span>keys or deposits needed</span></div>
  </div>
  <div class="panel ledger" id="ledger"><p class="empty">No paid scans yet. The first ones will appear here with their ${chain} transaction.</p></div>
</section>

<section id="faq">
  <h2>Questions people ask</h2>
  <div class="faq">
    <details><summary>Is this betting advice?</summary><p>No. Foresyte gives you information about a market: who is buying, what you'd get back, and how the rules decide the result. What you do with it is up to you. Prediction markets can lose you all of your stake.</p></details>
    <details><summary>Polymarket already shows a price. Why isn't that enough?</summary><p>The price shown is for a small amount. A bigger bet eats through the cheap shares and pays more. Selling is the same in reverse: if few people are buying, you get less than the app shows, or nothing at all. Foresyte works this out at your exact amount.</p></details>
    <details><summary>Where do the numbers come from?</summary><p>From Polymarket's public data at the moment you ask: the market and its rules, and the live list of buyers and sellers. Nothing is cached. The AI agent only passes the numbers along; it never makes one up.</p></details>
    <details><summary>What is the 3-day rule?</summary><p>In the last 3 days before a market ends, buyers tend to vanish and the rules start to decide the result. If a market has a rules or liquidity risk and is inside that window, Foresyte tells you to get out, and the deep scan gives you the latest day to sell.</p></details>
    <details><summary>Will it warn me automatically while I hold a bet?</summary><p>Not yet. PayBox runs each request fresh, so there are no background alerts. Ask your agent to check your positions any time, and always before you sell.</p></details>
    <details><summary>How do I pay ${price}?</summary><p>In your PayBox chat. Your agent shows the price, you approve it, and ${price} in USDC moves on ${chain} using x402. No account and no card. If the scan can't run, the payment isn't taken.</p></details>
    <details><summary>Can my own agent pay without PayBox?</summary><p>Yes. Any agent with an x402 wallet can call the deep scan link, get the price, pay, and receive the report.</p></details>
    <details><summary>Does Foresyte place bets or hold my money?</summary><p>No. It only reads public data. It never places or blocks bets, never asks for keys, and never holds funds.</p></details>
  </div>
</section>

<section id="sources">
  <h2>Said out loud</h2>
  <div class="sources">
    <a class="src" href="https://theblock.co/post/403312/polymarket-faces-backlash-strategy-bitcoin-sale"><b>The Block</b><span>Polymarket faces backlash over the Strategy bitcoin sale market. 2026.</span></a>
    <a class="src" href="https://www.galaxy.com/insights/research/strategy-bitcoin-sale-polymarket-resolution-dispute-may-2026"><b>Galaxy Research</b><span>The Strategy resolution dispute, and why markets should say if they pay on the event or on its confirmation. May 2026.</span></a>
    <a class="src" href="https://github.com/QijomoFav35/foresyte"><b>Foresyte source code</b><span>Every rule and threshold, with the tests that check them.</span></a>
  </div>
</section>

<section class="close">
  <h2>Know the worst case before you click.</h2>
  <div class="ctas"><a class="pill blue" href="#try">Check a market</a><a class="pill ghost" href="https://app.paybox.sh/plugins">Add to PayBox</a></div>
</section>
</main>

<footer>
  <div class="wrap">
    <div class="cols">
      <div><p class="founder">Built by someone who couldn't cash out at halftime.</p><p>Information, not betting advice. Not affiliated with Polymarket.</p></div>
      <div><h4>Product</h4><ul><li><a href="#try">Free check</a></li><li><a href="#scan">Deep scan</a></li><li><a href="https://app.paybox.sh/plugins">PayBox plugin</a></li></ul></div>
      <div><h4>Read</h4><ul><li><a href="#traps">The traps</a></li><li><a href="#faq">FAQ</a></li><li><a href="#sources">Sources</a></li></ul></div>
      <div><h4>Source</h4><ul><li><a href="https://github.com/QijomoFav35/foresyte">GitHub</a></li><li><a href="/api/proof">Proof (JSON)</a></li><li><a href="/?format=json">API</a></li></ul></div>
    </div>
  </div>
</footer>

<script>
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
