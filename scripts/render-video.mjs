#!/usr/bin/env node
// Renders video.html frame by frame and encodes the frames with ffmpeg.
//
//   npm run dev                          # serves video.html on http://localhost:5173
//   node scripts/render-video.mjs --out demo.mp4
//   node scripts/render-video.mjs --frames 2,20,45 --dir frames   # still frames for review
//
// Needs Playwright (npm i -D playwright, or set PLAYWRIGHT_MODULE to its entry file) and ffmpeg.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};

const url = opt('url', 'http://localhost:5173/video.html');
const out = opt('out', 'demo.mp4');
const crf = opt('crf', '16');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`${url}?capture`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__video && window.__setTime);
await page.evaluate(() => document.fonts.ready);
const video = await page.evaluate(() => window.__video);
const fps = Number(opt('fps', video.fps));
const from = Number(opt('from', 0));
const to = Number(opt('to', video.duration));

const frameAt = async (t) => {
  await page.evaluate((time) => window.__setTime(time), t);
  return page.screenshot({ type: 'png' });
};

if (opt('frames')) {
  const dir = opt('dir', 'frames');
  await mkdir(dir, { recursive: true });
  for (const t of opt('frames').split(',').map(Number)) {
    await page.evaluate((time) => window.__setTime(time), t);
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`) });
  }
  console.log(`wrote ${opt('frames').split(',').length} frames to ${dir}`);
} else {
  const total = Math.round((to - from) * fps);
  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code ? reject(new Error(`ffmpeg exited with ${code}`)) : resolve())));
  const started = Date.now();
  for (let f = 0; f < total; f++) {
    const png = await frameAt(from + f / fps);
    if (!ffmpeg.stdin.write(png)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve));
    if (f % (fps * 5) === 0) {
      const rate = (f + 1) / ((Date.now() - started) / 1000);
      console.log(`frame ${f + 1}/${total} · ${rate.toFixed(1)} fps · ~${Math.round((total - f) / rate)} s left`);
    }
  }
  ffmpeg.stdin.end();
  await done;
  console.log(`wrote ${out} (${total} frames at ${fps} fps)`);
}
await browser.close();
