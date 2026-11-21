#!/usr/bin/env node
// Static render: one brief -> every size, exact pixels.
// Usage: node engine/render.mjs briefs/example.json [--sizes BB_12x4m,LED_1920x1080]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT, loadJSON, loadBrand, resolveSize, composeHTML } from './compose.mjs';

const MAX_VIEWPORT = 2400; // render big sizes at a smaller CSS viewport, upscale via deviceScaleFactor

export function pickSizes(brief, cli) {
  const cfg = loadJSON('config/sizes.json');
  const wanted = cli || (brief.sizes && brief.sizes !== 'all' ? brief.sizes : null);
  let sizes = cfg.sizes;
  if (wanted) {
    const ids = Array.isArray(wanted) ? wanted : String(wanted).split(',');
    sizes = sizes.filter((s) => ids.includes(s.id));
  }
  return sizes.map((s) => resolveSize(s, cfg.print_px_per_meter));
}

export function outDir(brief) {
  const d = path.join(ROOT, 'output', `${brief.brand}_${brief.campaign}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

async function main() {
  const [briefPath, ...rest] = process.argv.slice(2);
  if (!briefPath) throw new Error('usage: node engine/render.mjs <brief.json> [--sizes a,b]');
  const si = rest.indexOf('--sizes');
  const brief = loadJSON(briefPath);
  const brand = loadBrand(brief.brand);
  const sizes = pickSizes(brief, si >= 0 ? rest[si + 1] : null);
  const out = outDir(brief);
  const version = brief.version || 'v1';

  const browser = await chromium.launch();
  const report = [];
  for (const s of sizes) {
    const vw = Math.min(s.W, s.H >= s.W ? Math.round((MAX_VIEWPORT * s.W) / s.H) : MAX_VIEWPORT);
    const dpr = s.W / vw;
    const { html, vh, layout } = composeHTML({ brand, brief, W: s.W, H: s.H, vw });
    const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const file = path.join(out, `${brand.name}_${brief.campaign}_${s.id}_${version}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: vw, height: vh } });
    fs.writeFileSync(file.replace(/\.png$/, '.html'), html);
    await page.close();
    report.push({ id: s.id, layout, px: `${s.W}x${s.H}`, file: path.relative(ROOT, file) });
    console.log(`✓ ${s.id.padEnd(16)} ${layout.padEnd(9)} ${s.W}x${s.H}  ${path.relative(ROOT, file)}`);
  }
  await browser.close();
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ brief, renders: report }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
