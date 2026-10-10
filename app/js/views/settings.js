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
import {
  applyTheme, applyLanguage, installState, promptInstall,
} from '../app.js';
import {
  t, catName, locale, getLang,
} from '../i18n.js';

function currencyName(code) {
  try { return new Intl.DisplayNames(locale(), { type: 'currency' }).of(code); } catch { return code; }
}

const ordinal = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : (n % 10 < 4 ? n % 10 : 0)]}`;

function openRecurringEditor(rule) {
  const r = rule || {
    amount: '', categoryId: state.categories[0]?.id, method: 'card', note: '', day: Number(today().slice(8, 10)), active: true,
  };
  const dlg = openSheet(`
    <form novalidate>
      <div class="sheet-head">
        <button type="button" class="icon-btn" data-close aria-label="${esc(t('cancel'))}">✕</button>
        <h2 class="sheet-title">${esc(t(rule ? 'editRecurring' : 'newRecurring'))}</h2>
        <span class="icon-btn-spacer"></span>
      </div>
      <label class="field"><span class="field-label">${esc(t('amountIn', { currency: state.settings.currency }))}</span>
        <input name="amount" type="number" inputmode="decimal" min="0" step="0.01" value="${r.amount}" required placeholder="0.00"></label>
      <label class="field"><span class="field-label">${esc(t('category'))}</span>
        <select name="categoryId">${state.categories.map((c) => `<option value="${esc(c.id)}" ${c.id === r.categoryId ? 'selected' : ''}>${esc(c.icon)} ${esc(catName(c))}</option>`).join('')}</select></label>
      <div class="entry-row two">
        <label class="field"><span class="field-label">${esc(t('payment'))}</span>
          <select name="method">${METHODS.map((m) => `<option value="${m.id}" ${m.id === r.method ? 'selected' : ''}>${esc(t(`method.${m.id}`))}</option>`).join('')}</select></label>
        <label class="field"><span class="field-label">${esc(t('dayOfMonth'))}</span>
          <input name="day" type="number" inputmode="numeric" min="1" max="31" value="${r.day}"></label>
      </div>
      <label class="field"><span class="field-label">${esc(t('note'))}</span>
        <input name="note" value="${esc(r.note)}" maxlength="120" placeholder="${esc(t('recurringNotePlaceholder'))}" autocomplete="off"></label>
      <p class="muted small">${esc(t('recurringHint'))} ${rule ? '' : esc(t('recurringHintNew'))}</p>
      <button type="submit" class="btn primary big">${esc(t(rule ? 'save' : 'addRecurring'))}</button>
    </form>`);
  const form = dlg.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.value);
    if (!(amount > 0)) { toast(t('enterAmountShort')); form.amount.focus(); return; }
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
    toast(added.length ? t('recurringAdded', added.length) : t('recurringSaved'));
  });
}

function exportCSV() {
  const header = t('csvHeader');
  const rows = sortedExpenses().reverse().map((e) => [
    e.date, e.amount.toFixed(2), state.settings.currency, catName(catById(e.categoryId)), methodLabel(e.method), e.note, e.recurringId ? t('yes') : '',
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
  try { data = JSON.parse(await file.text()); } catch { toast(t('invalidJson'), { kind: 'critical' }); return; }
  if (!data || !Array.isArray(data.expenses)) { toast(t('notBackup'), { kind: 'critical' }); return; }
  const ok = await confirmDialog({
    title: t('restoreTitle'),
    message: t('restoreMsg', data.expenses.length, data.exportedAt ? new Date(data.exportedAt).toLocaleDateString(locale()) : ''),
    ok: t('restore'), danger: true,
  });
  if (!ok) return;
  try {
    const res = await importBackup(data);
    applyTheme();
    applyLanguage();
    toast(t('restored', res.expenses));
  } catch (err) {
    toast(err.message || t('restoreFailed'), { kind: 'critical' });
  }
}

export function render(root) {
  const s = state.settings;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inst = installState();
  const currencies = CURRENCIES.includes(s.currency) ? CURRENCIES : [s.currency, ...CURRENCIES];

  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('settings'))}</h1></header>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('appearance'))}</h2>
      <div class="seg wide" role="group" aria-label="${esc(t('theme'))}">
        ${['system', 'light', 'dark'].map((th) => `<button type="button" class="seg-btn" data-theme-opt="${th}" aria-pressed="${s.theme === th}">${esc(t({ system: 'themeAuto', light: 'themeLight', dark: 'themeDark' }[th]))}</button>`).join('')}
      </div>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('language'))}${getLang() === 'ar' ? ' · Language' : ''}</h2>
      <div class="seg wide" role="group" aria-label="${esc(t('language'))}">
        ${[['auto', `🌐 ${t('langAuto')}`], ['en', 'English'], ['ar', 'العربية']].map(([v, label]) => `<button type="button" class="seg-btn" data-lang-opt="${v}" lang="${v === 'auto' ? getLang() : v}" aria-pressed="${(s.language || 'auto') === v}">${esc(label)}</button>`).join('')}
      </div>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('currency'))}</h2>
      <select name="currency" aria-label="${esc(t('currency'))}">
        ${currencies.map((c) => `<option value="${c}" ${c === s.currency ? 'selected' : ''}>${c} — ${esc(currencyName(c))}</option>`).join('')}
      </select>
      <p class="muted small">${esc(t('currencyExample', { amount: money(1234.5) }))}</p>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('monthlyBudgets'))}</h2>
      <label class="field inline"><span>${esc(t('overallBudget'))}</span>
        <input name="budget" type="number" inputmode="decimal" min="0" step="0.01" value="${s.budget || ''}" placeholder="${esc(t('none'))}"></label>
      <details class="cat-budgets">
        <summary>${esc(t('perCategoryBudgets'))}</summary>
        ${state.categories.map((c) => `<label class="field inline"><span>${esc(c.icon)} ${esc(catName(c))}</span>
          <input data-cat-budget="${esc(c.id)}" type="number" inputmode="decimal" min="0" step="0.01" value="${c.budget || ''}" placeholder="${esc(t('none'))}"></label>`).join('')}
      </details>
      <p class="muted small">${esc(t('budgetAlertHint'))}</p>
    </section>

    <section class="card settings-group">
      <div class="section-head"><h2 class="section-title">${esc(t('recurring'))}</h2>
        <button type="button" class="btn small secondary" data-action="add-recurring">${esc(t('add'))}</button></div>
      ${state.recurring.length ? `<ul class="list recurring">${state.recurring.map((r) => {
    const c = catById(r.categoryId);
    return `<li class="row static" data-rid="${esc(r.id)}">
          <span class="cat-dot" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
          <span class="row-main"><span class="row-title">${esc(r.note || catName(c))}</span>
            <span class="row-sub">${esc(money(r.amount))} · ${esc(t('everyDay', { day: getLang() === 'ar' ? r.day : ordinal(r.day) }))} · ${esc(methodLabel(r.method))}${r.active ? '' : ` · ${esc(t('paused'))}`}</span></span>
          <span class="row-actions">
            <button type="button" class="icon-btn small" data-r="edit" aria-label="${esc(t('edit'))}">✎</button>
            <button type="button" class="icon-btn small" data-r="toggle" aria-label="${esc(t(r.active ? 'pause' : 'resume'))}">${r.active ? '⏸' : '▶'}</button>
            <button type="button" class="icon-btn small danger-text" data-r="delete" aria-label="${esc(t('delete'))}">🗑</button>
          </span></li>`;
  }).join('')}</ul>` : `<p class="muted small">${esc(t('recurringEmpty'))}</p>`}
    </section>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('data'))}</h2>
      <p class="muted small">${esc(t('dataHint'))}</p>
      <div class="btn-col">
        <button type="button" class="btn secondary" data-action="csv">${esc(t('exportCsv'))}</button>
        <button type="button" class="btn secondary" data-action="backup">${esc(t('backupJson'))}</button>
        <label class="btn secondary file-btn">${esc(t('restoreJson'))}<input type="file" accept="application/json,.json" data-action="restore" hidden></label>
        <button type="button" class="btn danger-outline" data-action="reset">${esc(t('eraseAll'))}</button>
      </div>
    </section>

    <section class="card settings-group">
      <h2 class="section-title">${esc(t('install'))}</h2>
      ${inst === 'installed' ? `<p class="muted small">${esc(t('installed'))}</p>`
    : inst === 'available' ? `<button type="button" class="btn primary" data-action="install">${esc(t('installBtn'))}</button>`
      : `<p class="muted small">${t(isIOS ? 'installIOS' : 'installOther')}</p>`}
      <p class="muted small">${esc(t('offlineNote', state.expenses.length))}</p>
    </section>`;

  root.querySelectorAll('[data-theme-opt]').forEach((b) => b.addEventListener('click', async () => {
    const saved = saveSettings({ theme: b.dataset.themeOpt });
    applyTheme(); // state updates synchronously; apply before the DB write finishes
    await saved;
  }));
  root.querySelectorAll('[data-lang-opt]').forEach((b) => b.addEventListener('click', async () => {
    const saved = saveSettings({ language: b.dataset.langOpt });
    applyLanguage();
    await saved;
  }));
  root.querySelector('select[name=currency]').addEventListener('change', async (e) => {
    await saveSettings({ currency: e.target.value });
    toast(t('currencySet', { code: e.target.value, amount: formatMoney(10, e.target.value) }));
  });
  root.querySelector('input[name=budget]').addEventListener('change', async (e) => {
    await saveSettings({ budget: parseFloat(e.target.value) || null });
    toast(t('budgetSaved'));
  });
  root.querySelectorAll('[data-cat-budget]').forEach((inp) => inp.addEventListener('change', async () => {
    const c = state.categories.find((x) => x.id === inp.dataset.catBudget);
    await saveCategory({ ...c, budget: parseFloat(inp.value) || null });
    toast(t('catBudgetSaved', { name: catName(c) }));
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
      title: t('deleteRecurringTitle'), message: t('deleteRecurringMsg'), ok: t('delete'), danger: true,
    })) {
      await deleteRecurring(rule.id);
      toast(t('recurringDeleted'));
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
      title: t('eraseTitle'), message: t('eraseMsg'), ok: t('eraseOk'), danger: true,
    })) {
      await resetAll();
      toast(t('erased'));
    }
  });
  root.querySelector('[data-action="install"]')?.addEventListener('click', promptInstall);
}
