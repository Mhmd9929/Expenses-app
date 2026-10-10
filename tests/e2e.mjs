// End-to-end test of the core flows in a mobile Chromium.
// Run: npm test   (serves ./app on a random port and drives it with Playwright)
import { chromium, devices } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'test-results');
mkdirSync(outDir, { recursive: true });
const PORT = 8000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}/`;

const server = spawn(process.execPath, [path.join(root, 'node_modules/http-server/bin/http-server'), 'app', '-p', String(PORT), '-a', '127.0.0.1', '-c-1', '-s'], { cwd: root, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const device = devices['Pixel 7'];
let failures = 0;
let pageErrors = [];

async function test(name, fn) {
  const ctx = await browser.newContext({ ...device, acceptDownloads: true });
  const page = await ctx.newPage();
  pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });
  try {
    await fn(page, ctx);
    assert.deepEqual(pageErrors, [], 'page errors');
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures++;
    console.log(`  ✗ ${name}\n    ${err.stack.split('\n').slice(0, 4).join('\n    ')}`);
    await page.screenshot({ path: path.join(outDir, `fail-${name.replace(/\W+/g, '-')}.png`), fullPage: true }).catch(() => {});
  } finally {
    await ctx.close();
  }
}

const go = async (page, route) => {
  await page.goto(`${BASE}#/${route}`);
  await page.waitForSelector('html.ready');
};
const typeAmount = async (page, s) => {
  for (const ch of s) await page.click(`.keypad [data-key="${ch}"]`);
};
const toastText = (page) => page.locator('.toast').allTextContents().then((t) => t.join(' | '));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function addExpense(page, { amount, cat, method, note, repeat }) {
  await go(page, 'home');
  await page.click('[data-testid="add-expense"]');
  await page.waitForSelector('.keypad');
  await typeAmount(page, amount);
  if (cat) await page.click(`.chip:has-text("${cat}")`);
  if (method) await page.click(`[data-method="${method}"]`);
  if (note) await page.fill('input[name=note]', note);
  if (repeat) await page.check('input[name=repeat]');
  await page.click('[data-testid="save"]');
  await page.waitForSelector('[data-testid="month-total"]');
}

async function restore(page, data) {
  await go(page, 'settings');
  await page.setInputFiles('input[data-action="restore"]', {
    name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.click('dialog [data-ok]');
  await page.waitForFunction(() => document.querySelector('.toast')?.textContent.includes('Restored'));
}

console.log('Expenses e2e');

await test('first launch shows empty home and default categories', async (page) => {
  await go(page, 'home');
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$0.00');
  await page.click('.tabbar a[data-tab="categories"]');
  await page.waitForSelector('.cats');
  assert.equal(await page.locator('.cats li').count(), 12);
  const names = await page.locator('.cats .row-title').allTextContents();
  for (const n of ['Food', 'Groceries', 'Transport', 'Fuel', 'Rent', 'Bills & Utilities', 'Shopping', 'Health', 'Entertainment', 'Education', 'Travel', 'Other']) {
    assert.ok(names.some((x) => x.includes(n)), `category ${n}`);
  }
  await page.screenshot({ path: path.join(outDir, 'categories.png') });
});

await test('add, edit and delete (with undo) an expense', async (page) => {
  await addExpense(page, { amount: '12.5', cat: 'Groceries', method: 'cash', note: 'Milk' });
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$12.50');
  assert.match(await page.textContent('#recent'), /Milk/);
  assert.match(await toastText(page), /Saved \$12\.50 · Groceries/);

  // Tap the row to edit; amount is pre-filled.
  await page.click('#recent .swipe-content');
  await page.waitForSelector('.keypad');
  assert.equal(await page.textContent('[data-testid="amount"]'), '12.5');
  for (let i = 0; i < 4; i++) await page.click('[data-key="del"]');
  await typeAmount(page, '20');
  await page.click('[data-testid="save"]');
  await page.waitForSelector('[data-testid="month-total"]');
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$20.00');

  // Swipe left to reveal actions, then delete.
  const row = page.locator('#recent .swipe-content').first();
  const box = await row.boundingBox();
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.move(box.x + box.width - 220, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForSelector('#recent .swipe.open');
  await page.click('#recent [data-act="delete"]');
  await page.waitForFunction(() => document.querySelector('[data-testid="month-total"]')?.textContent === '$0.00');
  await page.click('.toast button:has-text("Undo")');
  await page.waitForFunction(() => document.querySelector('[data-testid="month-total"]')?.textContent === '$20.00');

  // Data survives a reload (IndexedDB).
  await page.reload();
  await page.waitForSelector('html.ready');
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$20.00');
});

await test('zero amount is rejected', async (page) => {
  await go(page, 'add');
  await page.click('[data-testid="save"]');
  assert.match(await toastText(page), /Enter an amount/);
  assert.equal(await page.locator('.keypad').count(), 1);
});

await test('budgets and 80% / 100% alerts', async (page) => {
  await go(page, 'settings');
  await page.fill('input[name=budget]', '100');
  await page.locator('input[name=budget]').dispatchEvent('change');
  await page.click('.cat-budgets summary');
  await page.fill('input[data-cat-budget="food"]', '50');
  await page.locator('input[data-cat-budget="food"]').dispatchEvent('change');

  await addExpense(page, { amount: '42', cat: 'Food' });
  assert.match(await toastText(page), /Food: 80% of budget used/);
  await page.waitForTimeout(400);
  await addExpense(page, { amount: '10', cat: 'Food' });
  await page.waitForTimeout(400);
  assert.match(await toastText(page), /Food: budget exceeded/);
  assert.match(await page.textContent('[data-testid="remaining"]'), /\$48\.00 left/);
  assert.match(await page.textContent('.alerts'), /Over budget/);
  await addExpense(page, { amount: '60', cat: 'Rent' });
  await page.waitForTimeout(400);
  assert.match(await toastText(page), /Monthly budget: budget exceeded/);
  assert.match(await page.textContent('[data-testid="remaining"]'), /\$12\.00 over budget/);
  await page.screenshot({ path: path.join(outDir, 'home.png') });
});

const now = new Date();
const thisMonth = iso(now).slice(0, 7);
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const prevMonth = iso(prev).slice(0, 7);
const backup = {
  app: 'expenses', version: 1, settings: { currency: 'USD', budget: 1000, theme: 'system' },
  categories: [
    { id: 'food', name: 'Food', icon: '🍔', color: '#eb6834', order: 0, budget: 300 },
    { id: 'transport', name: 'Transport', icon: '🚌', color: '#2a78d6', order: 1, budget: null },
    { id: 'other', name: 'Other', icon: '📦', color: '#7a7873', order: 2, budget: null },
  ],
  expenses: [
    { id: 'a1', amount: 100, date: `${prevMonth}-03`, categoryId: 'food', method: 'card', note: 'Dinner' },
    { id: 'a2', amount: 50, date: `${prevMonth}-10`, categoryId: 'transport', method: 'cash', note: 'Taxi' },
    { id: 'b1', amount: 150, date: `${thisMonth}-01`, categoryId: 'food', method: 'card', note: 'Pizza party, "big"' },
    { id: 'b2', amount: 30, date: `${thisMonth}-01`, categoryId: 'transport', method: 'other', note: 'Bus pass' },
    { id: 'b3', amount: 20, date: `${thisMonth}-01`, categoryId: 'other', method: 'cash', note: '' },
  ],
  recurring: [],
};

await test('restore backup, list filters and search', async (page) => {
  await restore(page, backup);
  await go(page, 'list');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^3 expenses/);
  assert.equal(await page.textContent('[data-testid="result-total"]'), '$200.00');
  await page.selectOption('select[name=month]', '');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^5 expenses/);
  await page.selectOption('select[name=category]', 'food');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^2 expenses/);
  await page.selectOption('select[name=method]', 'card');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^2 expenses/);
  await page.selectOption('select[name=category]', '');
  await page.selectOption('select[name=method]', 'cash');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^2 expenses/);
  await page.selectOption('select[name=method]', '');
  await page.fill('input[name=q]', 'taxi');
  assert.match(await page.textContent('[data-testid="result-count"]'), /^1 expense/);
  await page.fill('input[name=q]', 'nothing-matches');
  assert.match(await page.textContent('#results'), /No matching expenses/);
});

await test('reports: insights, charts and month comparison', async (page) => {
  await restore(page, backup);
  await go(page, 'reports');
  assert.match(await page.textContent('[data-testid="ins-top"]'), /Food/);
  assert.match(await page.textContent('[data-testid="ins-inc"]'), /Food/); // +50 vs +20 for Other
  assert.equal(await page.locator('[data-testid="bar-chart"] .bar').count(), 6);
  await page.click('[data-range="12"]');
  assert.equal(await page.locator('[data-testid="bar-chart"] .bar').count(), 12);
  assert.equal(await page.locator('[data-testid="donut"] path').count(), 3);
  assert.equal(await page.locator('[data-testid="line-chart"] .line').count(), 1);
  assert.equal(await page.textContent('[data-testid="cmp-a"]'), '$150.00');
  assert.equal(await page.textContent('[data-testid="cmp-b"]'), '$200.00');
  assert.match(await page.textContent('[data-testid="cmp-delta"]'), /\$50\.00 \(\+33%\)/);
  const rows = await page.locator('.compare-table tbody tr').allTextContents();
  assert.ok(rows.some((r) => /Food[\s\S]*\$100\.00[\s\S]*\$150\.00[\s\S]*\+50%/.test(r)), rows.join('\n'));
  assert.ok(rows.some((r) => /Transport[\s\S]*\$50\.00[\s\S]*\$30\.00[\s\S]*-40%/.test(r)), rows.join('\n'));
  // Projection = total / days elapsed * days in month
  const day = now.getDate();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const proj = (200 / day) * dim;
  assert.equal(await page.textContent('[data-testid="ins-proj"]'), `$${proj.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  // Tooltip on tap
  await page.locator('[data-testid="bar-chart"] .hit').last().click();
  assert.match(await page.textContent('.tooltip'), /\$200\.00/);
  // Selecting the previous month swaps the insights
  await page.selectOption('select[name=month]', prevMonth);
  assert.match(await page.textContent('[data-testid="ins-proj"]'), /\$150\.00/);
  await page.selectOption('select[name=month]', thisMonth);
  await page.screenshot({ path: path.join(outDir, 'reports.png'), fullPage: true });
});

await test('categories: add, rename, delete moves expenses', async (page) => {
  await go(page, 'categories');
  await page.click('.page-head [data-action="new"]');
  await page.fill('dialog input[name=name]', 'Coffee');
  await page.click('dialog [data-icon="☕"]');
  await page.click('dialog button[type=submit]');
  await page.waitForSelector('.cats .row-title:has-text("Coffee")');
  await addExpense(page, { amount: '4', cat: 'Coffee' });
  await go(page, 'categories');
  await page.click('.cats .row:has-text("Coffee")');
  await page.fill('dialog input[name=name]', 'Cafe');
  await page.click('dialog button[type=submit]');
  await page.waitForSelector('.cats .row-title:has-text("Cafe")');
  await page.click('.cats .row:has-text("Cafe")');
  await page.click('dialog [data-action="delete"]');
  await page.waitForSelector('dialog.confirm');
  assert.match(await page.textContent('dialog.confirm'), /1 expense will be moved to “Other”/);
  await page.click('dialog.confirm [data-ok]');
  await page.waitForFunction(() => ![...document.querySelectorAll('.cats .row-title')].some((e) => e.textContent.includes('Cafe')));
  assert.match(await page.textContent('.cats .row:has-text("Other")'), /\$4\.00/);
});

await test('currency, theme, CSV export and JSON backup', async (page) => {
  await restore(page, backup);
  await page.selectOption('select[name=currency]', 'EUR');
  await go(page, 'home');
  assert.match(await page.textContent('[data-testid="month-total"]'), /€/);
  await go(page, 'settings');
  await page.click('[data-theme-opt="dark"]');
  await page.waitForSelector('html[data-theme="dark"]');
  await page.screenshot({ path: path.join(outDir, 'settings-dark.png'), fullPage: true });

  const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="csv"]')]);
  const csv = readFileSync(await csvDl.path(), 'utf8').replace(/^﻿/, '');
  const lines = csv.split('\r\n');
  assert.equal(lines[0], 'Date,Amount,Currency,Category,Payment method,Note,Recurring');
  assert.equal(lines.length, 6);
  assert.ok(lines.includes(`${thisMonth}-01,150.00,EUR,Food,Card,"Pizza party, ""big""",`), csv);

  const [jsonDl] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="backup"]')]);
  const data = JSON.parse(readFileSync(await jsonDl.path(), 'utf8'));
  assert.equal(data.expenses.length, 5);
  assert.equal(data.settings.currency, 'EUR');
  assert.equal(data.settings.theme, 'dark');
});

await test('recurring expenses auto-add each month', async (page) => {
  await page.clock.install({ time: new Date(2026, 6, 20, 10, 0) }); // 20 Jul 2026
  await addExpense(page, { amount: '800', cat: 'Rent', note: 'Flat rent', repeat: true });
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$800.00');
  // Come back on 25 Sep: Aug 20 and Sep 20 should be added once each.
  await page.clock.setSystemTime(new Date(2026, 8, 25, 9, 0));
  await page.reload();
  await page.waitForSelector('html.ready');
  await page.waitForFunction(() => document.querySelector('[data-testid="month-total"]')?.textContent === '$800.00'
    && document.querySelectorAll('#recent .swipe').length === 3);
  assert.match(await toastText(page), /Added 2 recurring expenses/);
  await page.reload();
  await page.waitForSelector('html.ready');
  assert.equal(await page.locator('#recent .swipe').count(), 3, 'no duplicates on reload');
  await go(page, 'settings');
  assert.match(await page.textContent('.recurring'), /Flat rent[\s\S]*every 20th/);
});

await test('manifest and offline support', async (page, ctx) => {
  const manifest = await (await page.request.get(`${BASE}manifest.webmanifest`)).json();
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'maskable'));
  for (const i of manifest.icons) assert.equal((await page.request.get(BASE + i.src)).status(), 200, i.src);

  await go(page, 'home');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await addExpense(page, { amount: '7', cat: 'Food' });
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector('html.ready');
  assert.equal(await page.textContent('[data-testid="month-total"]'), '$7.00');
  await go(page, 'reports');
  assert.equal(await page.locator('[data-testid="bar-chart"]').count(), 1);
  await ctx.setOffline(false);
});

await test('Arabic: language switch, RTL layout and translated UI', async (page) => {
  await go(page, 'settings');
  await page.click('[data-lang-opt="ar"]');
  await page.waitForSelector('html[dir="rtl"][lang="ar"]');
  assert.equal(await page.textContent('.tabbar [data-i18n="tab.home"]'), 'الرئيسية');
  assert.match(await page.textContent('.page-head h1'), /الإعدادات/);

  await addExpense(page, { amount: '25', cat: 'طعام', method: 'cash', note: 'غداء' });
  assert.match(await toastText(page), /تم حفظ/);
  assert.match(await page.textContent('.hero'), /مصروفات هذا الشهر/);
  assert.match(await page.textContent('[data-testid="month-total"]'), /25\.00/);
  assert.match(await page.textContent('#recent'), /غداء[\s\S]*طعام · اليوم · نقدًا/);
  await page.screenshot({ path: path.join(outDir, 'ar-home.png') });

  // In RTL, swiping right reveals the actions.
  const row = page.locator('#recent .swipe-content').first();
  const box = await row.boundingBox();
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + box.height / 2, { steps: 8 });
  await page.mouse.move(box.x + 220, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForSelector('#recent .swipe.open');
  assert.equal(await page.textContent('#recent .swipe.open [data-act="delete"]'), 'حذف');
  const actions = await page.locator('#recent .swipe.open .swipe-actions').boundingBox();
  assert.ok(actions.x < box.x + 10, 'actions sit on the left edge in RTL');

  await go(page, 'list');
  assert.equal(await page.textContent('[data-testid="result-count"]'), 'عدد المصروفات: 1');
  await page.fill('input[name=q]', 'طعام');
  assert.equal(await page.textContent('[data-testid="result-count"]'), 'عدد المصروفات: 1');

  await go(page, 'reports');
  assert.match(await page.textContent('[data-testid="ins-top"]'), /طعام/);
  await page.screenshot({ path: path.join(outDir, 'ar-reports.png'), fullPage: true });

  // Saving a built-in category without renaming keeps its stored English name.
  await go(page, 'categories');
  assert.match(await page.textContent('.cats'), /فواتير ومرافق/);
  await page.click('.cats .row:has-text("طعام")');
  assert.equal(await page.inputValue('dialog input[name=name]'), 'طعام');
  await page.click('dialog button[type=submit]');
  await page.screenshot({ path: path.join(outDir, 'ar-categories.png') });

  await go(page, 'add');
  await page.screenshot({ path: path.join(outDir, 'ar-add.png') });

  // Back to English: built-in names come back in English.
  await go(page, 'settings');
  await page.click('[data-lang-opt="en"]');
  await page.waitForSelector('html[dir="ltr"][lang="en"]');
  await go(page, 'categories');
  assert.match(await page.textContent('.cats'), /Food/);
  await page.reload();
  await page.waitForSelector('html.ready');
  assert.equal(await page.getAttribute('html', 'dir'), 'ltr');
});

await test('Arabic is picked automatically on Arabic devices', async () => {
  const ctx = await browser.newContext({ ...device, locale: 'ar-EG' });
  const page = await ctx.newPage();
  await go(page, 'home');
  assert.equal(await page.getAttribute('html', 'dir'), 'rtl');
  assert.match(await page.textContent('.page-head h1'), /المصروفات/);
  await ctx.close();
});

await browser.close();
server.kill();
console.log(failures ? `\n${failures} test(s) failed` : '\nAll tests passed');
process.exit(failures ? 1 : 0);
