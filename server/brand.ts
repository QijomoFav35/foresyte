// Foresyte brand: the seal mark (triangle, eye, rays, dotted ring) drawn as SVG so it stays sharp at any size.
// Colours from the founder's brand sheet: gold #C8A96A on navy #0B1530.

export const GOLD = "#C8A96A";
export const NAVY = "#0B1530";

const rays = Array.from({ length: 24 }, (_, i) => {
  const a = (i * Math.PI * 2) / 24;
  const p = (r: number) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(14)}L${p(35)}`;
}).join("");
const dots = Array.from({ length: 30 }, (_, i) => {
  const a = (i * Math.PI * 2) / 30;
  return `<circle cx="${(50 + 41.5 * Math.cos(a)).toFixed(2)}" cy="${(50 + 41.5 * Math.sin(a)).toFixed(2)}" r="1.9"/>`;
}).join("");

const TRI = "50,20 76,66 24,66";
const EYE = `<path d="M37 53Q50 42.5 63 53Q50 63.5 37 53Z" fill="none" stroke-width="2.2"/><circle cx="50" cy="53" r="4.2"/>`;

// The full seal, for the nav and the brand kit
export function seal(size: number, id = "s"): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="${GOLD}" stroke="${GOLD}" aria-hidden="true"><defs><mask id="${id}m"><rect width="100" height="100" fill="#fff"/><polygon points="${TRI}" fill="#000" stroke="#000" stroke-width="5"/></mask></defs><circle cx="50" cy="50" r="47" fill="none" stroke-width="2.6"/><circle cx="50" cy="50" r="36" fill="none" stroke-width="1.4"/><g stroke="none">${dots}</g><path d="${rays}" stroke-width="1.1" mask="url(#${id}m)"/><polygon points="${TRI}" fill="none" stroke-width="3.2" stroke-linejoin="round"/>${EYE}</svg>`;
}

// Tab icon: the seal on navy
export function faviconDataUri(): string {
  const inner = seal(52, "fav").replace("<svg ", '<svg x="6" y="6" ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${NAVY}"/>${inner}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export function brandKitPage(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Foresyte Brand Kit</title><link rel="icon" href="${faviconDataUri()}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{background:${NAVY};color:#e8e6df;font:400 16px/1.6 Montserrat,system-ui,sans-serif;padding:28px 20px 64px}
.wrap{max-width:1160px;margin:0 auto}
header{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
header a{display:flex;align-items:center;gap:12px;text-decoration:none;color:#f3efe6}
.word{font:600 22px/1 "Cormorant Garamond",serif;letter-spacing:.32em}
header .back{margin-left:auto;font-size:14px;color:${GOLD};font-weight:600}
h1{font:600 clamp(30px,5vw,46px)/1.1 "Cormorant Garamond",serif;letter-spacing:.06em;margin:40px 0 8px;color:#f3efe6}
p.sub{color:#a9b2c8;max-width:60ch}
figure{margin:28px 0 0;border:1px solid rgba(200,169,106,.25);border-radius:10px;overflow:hidden;background:#0a1228}
figure img{display:block;width:100%;height:auto}
figcaption{padding:12px 16px;font-size:13.5px;color:#a9b2c8;border-top:1px solid rgba(200,169,106,.18)}
.cast{display:grid;gap:12px;margin-top:24px}
.cast div{border:1px solid rgba(200,169,106,.25);border-radius:10px;padding:14px 16px;background:#0a1228}
.cast b{display:block;font:600 22px/1.1 "Cormorant Garamond",serif;letter-spacing:.12em;color:${GOLD}}
.cast span{display:block;margin-top:6px;color:#a9b2c8;font-size:14px}
@media (min-width:720px){.cast{grid-template-columns:repeat(3,1fr)}}
.sw{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.sw div{display:flex;align-items:center;gap:10px;font-size:14px}
.sw i{width:34px;height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.15)}
.dl{display:inline-block;margin-top:10px;color:${GOLD};font-weight:600;font-size:14px}
</style></head>
<body><div class="wrap">
<header><a href="/">${seal(40, "h")}<span class="word">FORESYTE</span></a><a class="back" href="/">Back to Foresyte</a></header>
<h1>Brand Kit</h1>
<p class="sub">Three characters stand behind the Foresyte mark: Augur, who reads the omen before you act, Pythia, who speaks what she sees, and Seer, who sees past the person looking</p>
<div class="cast">
  <div><b>Augur</b><span>The blue bird. Reads the omen before you act</span></div>
  <div><b>Pythia</b><span>The oracle behind Augur. Speaks what she sees</span></div>
  <div><b>Seer</b><span>The sculpted face. Sees past the person looking</span></div>
</div>
<figure><img src="/hero-1280.webp" width="1280" height="757" alt="Augur, the blue bird, with Pythia, the oracle behind him, playing a golden flute"><figcaption>Augur and Pythia, the Foresyte hero</figcaption></figure>
<figure><img src="/brand-story.webp" width="1148" height="727" alt="Augur plus Seer equals Foresyte: a blue bird engraving, a sculpted face filled with a mountain landscape, and the Foresyte seal"><figcaption>Augur + Seer = Foresyte</figcaption></figure>
<figure><img src="/brand-logos.webp" width="1280" height="960" alt="Foresyte logo sheet: horizontal dark and light lockups, the stacked lockup with the line See deeper than the market, and the app icon at 128, 64, 32 and 16 pixels"><figcaption>Logo lockups and app icon</figcaption></figure>
<div class="sw"><div><i style="background:${GOLD}"></i>Gold ${GOLD}</div><div><i style="background:${NAVY}"></i>Navy ${NAVY}</div><div><i style="background:#F3EFE6"></i>Ivory #F3EFE6</div></div>
<a class="dl" href="/brand-logos.webp" download>Download the logo sheet</a>
</div></body></html>`;
}
