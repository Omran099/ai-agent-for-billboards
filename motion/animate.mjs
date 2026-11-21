#!/usr/bin/env node
// Motion render: same layout as the static, animated, exported to MP4 per digital size.
// Two modes:
//   1) No brief.visual_video  -> animates the still key visual (Ken Burns) + text/logo/CTA.
//   2) brief.visual_video set -> text/logo/CTA rendered transparent and composited over the
//      AI video (e.g. from Higgsfield), cropped to each size around focal_point.
// Usage: node motion/animate.mjs briefs/example.json [--sizes LED_1920x1080] [--print]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT, loadJSON, loadBrand, composeHTML } from '../engine/compose.mjs';
import { pickSizes, outDir } from '../engine/render.mjs';

const MAX_VIEWPORT = 1920;

async function renderOne(browser, { brand, brief, s, out, version }) {
  const fps = s.fps || 25;
  const duration = s.duration_s || brief.duration_s || 10;
  // even dimensions for H.264
  const W = s.W - (s.W % 2), H = s.H - (s.H % 2);
  const vw = Math.min(W, H >= W ? Math.round((MAX_VIEWPORT * W) / H) : MAX_VIEWPORT);
  const video = brief.visual_video ? path.resolve(ROOT, brief.visual_video) : null;
  const { html, vh, layout } = composeHTML({ brand, brief, W, H, vw, animate: true, transparentBg: !!video, duration });
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: W / vw });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));

  const file = path.join(out, `${brand.name}_${brief.campaign}_${s.id}_${version}.mp4`);
  const [fx, fy] = brief.focal_point || [0.5, 0.5];
  const args = ['-y', '-loglevel', 'error'];
  if (video) {
    // input 0: AI video, looped/trimmed to duration; input 1: overlay frames (PNG w/ alpha)
    args.push('-stream_loop', '-1', '-i', video);
    args.push('-f', 'image2pipe', '-framerate', String(fps), '-i', '-');
    const cover = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})*${fx}:(ih-${H})*${fy}`;
    args.push('-filter_complex', `[0:v]fps=${fps},${cover},setsar=1[bg];[1:v]scale=${W}:${H}[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p[v]`, '-map', '[v]');
  } else {
    args.push('-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-pix_fmt', 'yuv420p');
  }
  args.push('-t', String(duration), '-r', String(fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-movflags', '+faststart', '-an', file);

  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  const frames = Math.round(duration * fps);
  for (let i = 0; i < frames; i++) {
    const t = (i / fps) * 1000;
    await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), t);
    const buf = await page.screenshot({ omitBackground: !!video, type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % fps === 0) process.stdout.write(`\r  ${s.id} ${Math.round((i / frames) * 100)}%   `);
  }
  ff.stdin.end();
  await done;
  await page.close();
  process.stdout.write('\r');
  console.log(`✓ ${s.id.padEnd(16)} ${layout.padEnd(9)} ${W}x${H} ${duration}s@${fps}  ${path.relative(ROOT, file)}`);
  return { id: s.id, layout, px: `${W}x${H}`, fps, duration, file: path.relative(ROOT, file) };
}

async function main() {
  const [briefPath, ...rest] = process.argv.slice(2);
  if (!briefPath) throw new Error('usage: node motion/animate.mjs <brief.json> [--sizes a,b] [--print]');
  const si = rest.indexOf('--sizes');
  const brief = loadJSON(briefPath);
  const brand = loadBrand(brief.brand);
  let sizes = pickSizes(brief, si >= 0 ? rest[si + 1] : null);
  if (!rest.includes('--print')) sizes = sizes.filter((s) => s.type === 'digital'); // print boards are static
  const out = outDir(brief);
  const browser = await chromium.launch();
  const results = [];
  for (const s of sizes) results.push(await renderOne(browser, { brand, brief, s, out, version: brief.version || 'v1' }));
  await browser.close();
  fs.writeFileSync(path.join(out, 'motion-manifest.json'), JSON.stringify(results, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
