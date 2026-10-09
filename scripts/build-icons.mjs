// Rasterize the SVG icons into the PNG sizes the manifest / iOS need.
// Usage: node scripts/build-icons.mjs   (requires Playwright + Chromium)
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app', 'icons');
const jobs = [
  ['favicon.svg', 'icon-192.png', 192],
  ['favicon.svg', 'icon-512.png', 512],
  ['favicon.svg', 'favicon-32.png', 32],
  ['maskable.svg', 'maskable-512.png', 512],
  ['apple.svg', 'apple-touch-icon.png', 180],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, out, size] of jobs) {
  const svg = readFileSync(path.join(dir, src), 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
  await page.screenshot({ path: path.join(dir, out), omitBackground: true });
  console.log('wrote', out);
}
await browser.close();
