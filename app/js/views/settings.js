import {
  state, saveSettings, saveCategory, saveRecurring, deleteRecurring, applyRecurring,
  exportBackup, importBackup, resetAll, sortedExpenses, catById, METHODS, CURRENCIES,
} from '../store.js';
import {
  esc, csvCell, saveFile, today, formatMoney,
} from '../utils.js';
import {
  money, toast, openSheet, confirmDialog, methodLabel,
} from '../ui.js';
import { applyTheme, installState, promptInstall } from '../app.js';

function currencyName(code) {
  try { return new Intl.DisplayNames(undefined, { type: 'currency' }).of(code); } catch { return code; }
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]}`;

function openRecurringEditor(rule) {
  const r = rule || {
    amount: '', categoryId: state.categories[0]?.id, method: 'card', note: '', day: Number(today().slice(8, 10)), active: true,
  };
  const dlg = openSheet(`
    <form novalidate>
      <div class="sheet-head">
        <button type="button" class="icon-btn" data-close aria-label="Cancel">✕</button>
        <h2 class="sheet-title">${rule ? 'Edit recurring' : 'New recurring expense'}</h2>
        <span class="icon-btn-spacer"></span>
      </div>
      <label class="field"><span class="field-label">Amount (${esc(state.settings.currency)})</span>
        <input name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="${r.amount}" required placeholder="0.00"></label>
      <label class="field"><span class="field-label">Category</span>
        <select name="categoryId">${state.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === r.categoryId ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label>
      <div class="entry-row two">
        <label class="field"><span class="field-label">Payment</span>
          <select name="method">${METHODS.map((m) => `<option value="${m.id}" ${m.id === r.method ? 'selected' : ''}>${m.label}</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">Day of month</span>
          <input name="day" type="number" inputmode="numeric" min="1" max="31" value="${r.day}"></label>
      </div>
      <label class="field"><span class="field-label">Note</span>
        <input name="note" value="${esc(r.note)}" maxlength="120" placeholder="e.g. Netflix" autocomplete="off"></label>
      <p class="muted small">Added automatically each month on this day (or the month’s last day). ${rule ? '' : 'If this month’s date has already passed, it’s added right away.'}</p>
      <button type="submit" class="btn primary big">${rule ? 'Save' : 'Add recurring expense'}</button>
    </form>`);
  const form = dlg.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.value);
    if (!(amount > 0)) { toast('Enter an amount'); form.amount.focus(); return; }
    const data = {
      ...(rule || {}), amount, categoryId: form.categoryId.value, method: form.method.value,
      note: form.note.value, day: Number(form.day.value) || 1,
    };
    if (!rule) {
      // Start from the beginning of this month so a date already passed is added now.
      data.startDate = `${today().slice(0, 7)}-01`;
    }
    await saveRecurring(data);
    dlg.close();
    const added = await applyRecurring();
    toast(added.length ? `Recurring expense added (${added.length} entr${added.length === 1 ? 'y' : 'ies'} created)` : 'Recurring expense saved');
  });
}

function exportCSV() {
  const header = ['Date', 'Amount', 'Currency', 'Category', 'Payment method', 'Note', 'Recurring'];
  const rows = sortedExpenses().reverse().map((e) => [
    e.date, e.amount.toFixed(2), state.settings.currency, catById(e.categoryId).name, methodLabel(e.method), e.note, e.recurringId ? 'yes' : '',
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  // BOM so Excel opens UTF-8 (emoji, Arabic, etc.) correctly.
  return saveFile(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), `expenses-${today()}.csv`);
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], { type: 'application/json' });
  return saveFile(blob, `expenses-backup-${today()}.json`);
}

async function restoreJSON(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('That file isn’t valid JSON', { kind: 'critical' }); return; }
  if (!data || !Array.isArray(data.expenses)) { toast('This file is not an Expenses backup', { kind: 'critical' }); return; }
  const ok = await confirmDialog({
    title: 'Restore backup?',
    message: `This replaces all current data with ${data.expenses.length} expenses from the backup${data.exportedAt ? ` made on ${new Date(data.exportedAt).toLocaleDateString()}` : ''}.`,
    ok: 'Restore', danger: true,
  });
  if (!ok) return;
  try {
    const res = await importBackup(data);
    applyTheme();
    toast(`Restored ${res.expenses} expenses`);
  } catch (err) {
    toast(err.message || 'Restore failed', { kind: 'critical' });
  }
}

export function render(root) {
  const s = state.settings;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inst = installState();
  const currencies = CURRENCIES.includes(s.currency) ? CURRENCIES : [s.currency, ...CURRENCIES];

  root.innerHTML = `
    <header class="page-head"><h1>Settings</h1></header>

    <section class="card settings-group">
      <h2 class="section-title">Appearance</h2>
      <div class="seg wide" role="group" aria-label="Theme">
        ${['system', 'light', 'dark'].map((t) => `<button type="button" class="seg-btn" data-theme-opt="${t}" aria-pressed="${s.theme === t}">${{ system: '⚙️ Auto', light: '☀️ Light', dark: '🌙 Dark' }[t]}</button>`).join('')}
      </div>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">Currency</h2>
      <select name="currency" aria-label="Currency">
        ${currencies.map((c) => `<option value="${c}" ${c === s.currency ? 'selected' : ''}>${c} — ${esc(currencyName(c))}</option>`).join('')}
      </select>
      <p class="muted small">Example: ${esc(money(1234.5))}. Changing currency only changes how amounts are shown.</p>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">Monthly budgets</h2>
      <label class="field inline"><span>Overall budget</span>
        <input name="budget" type="number" inputmode="decimal" min="0" step="0.01" value="${s.budget || ''}" placeholder="None"></label>
      <details class="cat-budgets">
        <summary>Per-category budgets</summary>
        ${state.categories.map((c) => `<label class="field inline"><span>${esc(c.icon)} ${esc(c.name)}</span>
          <input data-cat-budget="${esc(c.id)}" type="number" inputmode="decimal" min="0" step="0.01" value="${c.budget || ''}" placeholder="None"></label>`).join('')}
      </details>
      <p class="muted small">You’ll get an alert when spending passes 80% and 100% of a budget.</p>
    </section>

    <section class="card settings-group">
      <div class="section-head"><h2 class="section-title">Recurring expenses</h2>
        <button type="button" class="btn small secondary" data-action="add-recurring">＋ Add</button></div>
      ${state.recurring.length ? `<ul class="list recurring">${state.recurring.map((r) => {
    const c = catById(r.categoryId);
    return `<li class="row static" data-rid="${esc(r.id)}">
          <span class="cat-dot" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
          <span class="row-main"><span class="row-title">${esc(r.note || c.name)}</span>
            <span class="row-sub">${esc(money(r.amount))} · every ${ordinal(r.day)} · ${esc(methodLabel(r.method))}${r.active ? '' : ' · paused'}</span></span>
          <span class="row-actions">
            <button type="button" class="icon-btn small" data-r="edit" aria-label="Edit">✎</button>
            <button type="button" class="icon-btn small" data-r="toggle" aria-label="${r.active ? 'Pause' : 'Resume'}">${r.active ? '⏸' : '▶'}</button>
            <button type="button" class="icon-btn small danger-text" data-r="delete" aria-label="Delete">🗑</button>
          </span></li>`;
  }).join('')}</ul>` : '<p class="muted small">Rent, subscriptions and other fixed costs can be added automatically every month.</p>'}
    </section>

    <section class="card settings-group">
      <h2 class="section-title">Data</h2>
      <p class="muted small">Everything is stored only on this device. Back up regularly.</p>
      <div class="btn-col">
        <button type="button" class="btn secondary" data-action="csv">⬇️ Export to CSV</button>
        <button type="button" class="btn secondary" data-action="backup">💾 Backup to JSON file</button>
        <label class="btn secondary file-btn">📂 Restore from JSON<input type="file" accept="application/json,.json" data-action="restore" hidden></label>
        <button type="button" class="btn danger-outline" data-action="reset">Erase all data</button>
      </div>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">Install</h2>
      ${inst === 'installed' ? '<p class="muted small">✅ Running as an installed app.</p>'
    : inst === 'available' ? '<button type="button" class="btn primary" data-action="install">📲 Install app</button>'
      : isIOS ? '<p class="muted small">In Safari, tap the Share button <b>⎋</b> then <b>“Add to Home Screen”</b>.</p>'
        : '<p class="muted small">Open your browser menu and choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.</p>'}
      <p class="muted small">Expenses works fully offline. ${state.expenses.length} expenses stored.</p>
    </section>`;

  root.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', async () => {
    const saved = saveSettings({ theme: b.dataset.themeOpt });
    applyTheme(); // state updates synchronously; apply before the DB write finishes
    await saved;
  }));
  root.querySelector('select[name=currency]').addEventListener('change', async (e) => {
    await saveSettings({ currency: e.target.value });
    toast(`Currency set to ${e.target.value} (${formatMoney(10, e.target.value)})`);
  });
  root.querySelector('input[name=budget]').addEventListener('change', async (e) => {
    await saveSettings({ budget: parseFloat(e.target.value) || null });
    toast('Budget saved');
  });
  root.querySelectorAll('[data-cat-budget]').forEach((inp) => inp.addEventListener('change', async () => {
    const c = state.categories.find((x) => x.id === inp.dataset.catBudget);
    await saveCategory({ ...c, budget: parseFloat(inp.value) || null });
    toast(`${c.name} budget saved`);
  }));

  root.querySelector('[data-action="add-recurring"]').addEventListener('click', () => openRecurringEditor());
  root.querySelector('.recurring')?.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-r]')?.dataset.r;
    const rule = state.recurring.find((r) => r.id === e.target.closest('[data-rid]')?.dataset.rid);
    if (!act || !rule) return;
    if (act === 'edit') openRecurringEditor(rule);
    if (act === 'toggle') {
      // When resuming, don't back-fill the paused months.
      const resume = !rule.active;
      await saveRecurring({ ...rule, active: resume, ...(resume ? { startDate: today() } : {}) });
      if (resume) await applyRecurring();
    }
    if (act === 'delete' && await confirmDialog({
      title: 'Delete recurring expense?', message: 'Expenses already added stay in your history.', ok: 'Delete', danger: true,
    })) {
      await deleteRecurring(rule.id);
      toast('Recurring expense deleted');
    }
  });

  root.querySelector('[data-action="csv"]').addEventListener('click', exportCSV);
  root.querySelector('[data-action="backup"]').addEventListener('click', exportJSON);
  root.querySelector('[data-action="restore"]').addEventListener('change', (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) restoreJSON(f);
  });
  root.querySelector('[data-action="reset"]').addEventListener('click', async () => {
    if (await confirmDialog({
      title: 'Erase all data?', message: 'All expenses, categories, budgets and recurring items will be deleted from this device. This cannot be undone.', ok: 'Erase everything', danger: true,
    })) {
      await resetAll();
      toast('All data erased');
    }
  });
  root.querySelector('[data-action="install"]')?.addEventListener('click', promptInstall);
}
