// Layout engine: builds one HTML composition for any size from brand + brief.
// The same HTML is used for static renders and (with animate=true) for motion.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

export function loadJSON(p) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, p), 'utf8'));
}

export function loadBrand(slug) {
  const dir = path.join(ROOT, 'brand', slug);
  const brand = JSON.parse(fs.readFileSync(path.join(dir, 'brand.json'), 'utf8'));
  brand.dir = dir;
  return brand;
}

// Resolve a size entry to exact pixels.
export function resolveSize(size, pxPerMeter) {
  if (size.type === 'print') {
    return { ...size, W: Math.round(size.width_m * (size.px_per_meter || pxPerMeter)), H: Math.round(size.height_m * (size.px_per_meter || pxPerMeter)) };
  }
  return { ...size, W: size.width_px, H: size.height_px };
}

// Pick a layout family from aspect ratio.
export function layoutFor(W, H) {
  const r = W / H;
  if (r >= 2.4) return 'ultrawide';
  if (r >= 1.25) return 'wide';
  if (r >= 0.8) return 'square';
  return 'portrait';
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' };
const fileUrl = (p) => `data:${MIME[path.extname(p).slice(1).toLowerCase()] || 'application/octet-stream'};base64,${fs.readFileSync(p).toString('base64')}`;
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UNICODE_RANGES = {
  arabic: 'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC',
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

function fontFaces(brand) {
  const fdir = path.join(brand.dir, 'assets', 'fonts');
  if (!fs.existsSync(fdir)) return '';
  return fs.readdirSync(fdir)
    .filter((f) => /\.(woff2?|ttf|otf)$/.test(f))
    .map((f) => {
      const m = f.match(/^([a-z]+)-([a-z]+)-(\d{3})-normal/i);
      if (!m) return '';
      const family = m[1][0].toUpperCase() + m[1].slice(1);
      const range = UNICODE_RANGES[m[2]] ? `unicode-range:${UNICODE_RANGES[m[2]]};` : '';
      return `@font-face{font-family:'${family}';font-weight:${m[3]};${range}src:url(data:font/woff2;base64,${fs.readFileSync(path.join(fdir, f)).toString('base64')}) format('woff2');}`;
    })
    .join('\n');
}

function logoHTML(brand) {
  const p = brand.logo_on_dark || brand.logo;
  const abs = p && path.join(brand.dir, p);
  if (abs && fs.existsSync(abs)) return `<img class="logo" src="${fileUrl(abs)}">`;
  return `<div class="logo wordmark">${esc(brand.wordmark || brand.name)}</div>`;
}

/**
 * @param {object} o
 * @param {object} o.brand  loaded brand
 * @param {object} o.brief  brief json
 * @param {number} o.W
 * @param {number} o.H
 * @param {number} o.vw     viewport width in CSS px (W scaled down for rendering)
 * @param {boolean} o.animate  add motion keyframes
 * @param {boolean} o.transparentBg  omit background visual (for overlay on a video)
 * @param {number} o.duration seconds (motion)
 */
export function composeHTML({ brand, brief, W, H, vw, animate = false, transparentBg = false, duration = 10 }) {
  const vh = Math.round((vw * H) / W);
  const layout = layoutFor(W, H);
  const u = Math.min(vw, vh) / 100; // 1u = 1% of the short side
  const c = brand.colors;
  const R = brand.rules;
  const rtl = (brief.direction || 'rtl') === 'rtl';
  const [fx, fy] = brief.focal_point || [0.5, 0.5];
  const visual = brief.visual ? path.resolve(ROOT, brief.visual) : null;
  const ease = brand.motion?.easing || 'ease-out';
  const zoom = brand.motion?.ken_burns_zoom || 1.08;

  // Typographic scale per layout (in u).
  const scale = {
    ultrawide: { h: 15, s: 6.2, cta: 5.6, copyW: '46%' },
    wide: { h: 11, s: 4.6, cta: 4.4, copyW: '52%' },
    square: { h: 12, s: 5.2, cta: 5, copyW: '100%' },
    portrait: { h: 15, s: 6.4, cta: 6.2, copyW: '100%' },
  }[layout];

  const side = rtl ? 'right' : 'left';
  const scrim = {
    ultrawide: `linear-gradient(to ${rtl ? 'left' : 'right'}, ${hexA(c.primary, R.scrim_strength)} 0%, ${hexA(c.primary, R.scrim_strength * 0.6)} 40%, transparent 70%)`,
    wide: `linear-gradient(to ${rtl ? 'left' : 'right'}, ${hexA(c.primary, R.scrim_strength)} 0%, ${hexA(c.primary, R.scrim_strength * 0.5)} 45%, transparent 75%)`,
    square: `linear-gradient(to top, ${hexA(c.primary, R.scrim_strength + 0.1)} 0%, ${hexA(c.primary, R.scrim_strength * 0.5)} 45%, transparent 70%)`,
    portrait: `linear-gradient(to top, ${hexA(c.primary, R.scrim_strength + 0.1)} 0%, ${hexA(c.primary, R.scrim_strength * 0.5)} 40%, transparent 65%)`,
  }[layout];

  const m = R.safe_margin_u;
  const copyPos = {
    ultrawide: `top:0;bottom:0;${side}:${m}u;width:${scale.copyW};justify-content:center;`,
    wide: `top:0;bottom:0;${side}:${m}u;width:${scale.copyW};justify-content:center;`,
    square: `left:${m}u;right:${m}u;bottom:${m}u;`,
    portrait: `left:${m}u;right:${m}u;bottom:${m * 1.6}u;align-items:center;text-align:center;`,
  }[layout];
  const logoPos = {
    ultrawide: `top:${m}u;${rtl ? 'left' : 'right'}:${m}u;`,
    wide: `top:${m}u;${rtl ? 'left' : 'right'}:${m}u;`,
    square: `top:${m}u;${side}:${m}u;`,
    portrait: `top:${m * 1.4}u;left:50%;transform:translateX(-50%);`,
  }[layout];

  const words = esc(brief.headline).split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');

  const css = `
${fontFaces(brand)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${vw}px;height:${vh}px;overflow:hidden;background:${transparentBg ? 'transparent' : c.primary}}
.stage{position:relative;width:${vw}px;height:${vh}px;overflow:hidden;direction:${rtl ? 'rtl' : 'ltr'}}
.bg{position:absolute;inset:0;${visual ? '' : `background:radial-gradient(120% 120% at ${fx * 100}% ${fy * 100}%, ${c.secondary} 0%, ${c.primary} 55%, #000 120%);`}}
.bg img{width:100%;height:100%;object-fit:cover;object-position:${fx * 100}% ${fy * 100}%;transform-origin:${fx * 100}% ${fy * 100}%}
.scrim{position:absolute;inset:0;background:${scrim}}
.copy{position:absolute;display:flex;flex-direction:column;gap:${2.2 * u}px;${copyPos.replace(/(\d+(?:\.\d+)?)u/g, (_, n) => n * u + 'px')}}
h1{font-family:'${brand.fonts.headline.family}';font-weight:${brand.fonts.headline.weight};font-size:${scale.h * u}px;line-height:1.15;color:${c.text_on_dark};text-wrap:balance}
h1 .w{display:inline-block}
.sub{font-family:'${brand.fonts.body.family}';font-weight:${brand.fonts.body.weight};font-size:${scale.s * u}px;line-height:1.35;color:${c.text_on_dark};opacity:.92}
.cta{align-self:${layout === 'portrait' ? 'center' : 'flex-start'};margin-top:${1.5 * u}px;font-family:'${brand.fonts.cta.family}';font-weight:${brand.fonts.cta.weight};font-size:${scale.cta * u}px;background:${c.cta_bg};color:${c.cta_text};padding:${1.4 * u}px ${4 * u}px;border-radius:${1.2 * u}px}
.logo{position:absolute;${logoPos.replace(/(\d+(?:\.\d+)?)u/g, (_, n) => n * u + 'px')}height:${R.logo_height_u * u}px}
.wordmark{font-family:'Cairo';font-weight:900;font-size:${R.logo_height_u * 0.75 * u}px;line-height:${R.logo_height_u * u}px;letter-spacing:.08em;color:${c.secondary};direction:ltr}
${animate ? motionCSS({ duration, ease, zoom, u, layout }) : ''}
`;

  const bgHTML = transparentBg ? '' : `<div class="bg">${visual ? `<img src="${fileUrl(visual)}">` : ''}</div>`;
  const html = `<!doctype html><html lang="${rtl ? 'ar' : 'en'}"><head><meta charset="utf-8"><style>${css}</style></head>
<body><div class="stage">${bgHTML}<div class="scrim"></div>
<div class="copy"><h1>${words}</h1>${brief.subline ? `<p class="sub">${esc(brief.subline)}</p>` : ''}${brief.cta ? `<div class="cta">${esc(brief.cta)}</div>` : ''}</div>
${logoHTML(brand)}</div></body></html>`;
  return { html, vw, vh, layout };
}

// Motion timeline (seconds). Paused + scrubbed frame-by-frame by motion/animate.mjs.
function motionCSS({ duration, ease, zoom, u, layout }) {
  const rise = 6 * u;
  return `
@keyframes kb{from{transform:scale(1)}to{transform:scale(${zoom})}}
@keyframes scrimIn{from{opacity:0}to{opacity:1}}
@keyframes rise{from{opacity:0;transform:translateY(${rise}px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{0%{opacity:0;transform:scale(.6)}70%{opacity:1;transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
@keyframes logoIn{from{opacity:0;filter:blur(${2 * u}px)}to{opacity:1;filter:none}}
@keyframes out{from{opacity:1}to{opacity:0}}
.bg img,.bg{animation:kb ${duration}s linear both}
.scrim{animation:scrimIn .8s ${ease} .2s both}
h1 .w{animation:rise .7s ${ease} calc(.6s + var(--i) * .12s) both}
.sub{animation:fade .8s ${ease} 1.8s both}
.cta{animation:pop .6s ${ease} 2.6s both}
.logo{animation:logoIn 1s ${ease} 0.3s both${layout === 'portrait' ? ';transform:translateX(-50%)' : ''}}
.copy{animation:out .5s ease-in ${duration - 0.5}s both}
`;
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
