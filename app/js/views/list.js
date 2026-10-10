import {
  state, METHODS, sortedExpenses, catById, monthsWithData,
} from '../store.js';
import {
  esc, monthLabel, dayLabel, currentMonth, round2,
} from '../utils.js';
import { money, expenseRow, enableSwipe } from '../ui.js';
import { navigate } from '../router.js';
import { t, catName } from '../i18n.js';

// Filters persist while the app is open.
const filters = { month: currentMonth(), category: '', method: '', q: '' };

export function setFilters(patch) { Object.assign(filters, patch); }

function filtered() {
  const q = filters.q.trim().toLowerCase();
  return sortedExpenses().filter((e) => {
    if (filters.month && !e.date.startsWith(filters.month)) return false;
    if (filters.category && e.categoryId !== filters.category) return false;
    if (filters.method && e.method !== filters.method) return false;
    if (q) {
      const c = catById(e.categoryId);
      const hay = `${e.note} ${c.name} ${catName(c)} ${e.amount}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function resultsHtml() {
  const items = filtered();
  if (!items.length) {
    return `<div class="empty"><p class="empty-icon">🔍</p><p>${esc(t('noMatches'))}</p>
      ${state.expenses.length ? `<button type="button" class="btn secondary" data-action="clear">${esc(t('clearFilters'))}</button>` : ''}</div>`;
  }
  const total = round2(items.reduce((s, e) => s + e.amount, 0));
  const groups = new Map();
  for (const e of items) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date).push(e);
  }
  let html = `<p class="result-summary"><span data-testid="result-count">${esc(t('expenseCount', items.length))}</span>
    <strong data-testid="result-total">${esc(money(total))}</strong></p>`;
  for (const [date, list] of groups) {
    const dayTotal = list.reduce((s, e) => s + e.amount, 0);
    html += `<div class="day-head"><span>${esc(dayLabel(date))}</span><span>${esc(money(dayTotal))}</span></div>
      <ul class="list card-list">${list.map((e) => expenseRow(e)).join('')}</ul>`;
  }
  return html;
}

export function render(root) {
  const months = monthsWithData();
  if (filters.month && !months.includes(filters.month)) months.unshift(filters.month);
  const opt = (v, label, sel) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label)}</option>`;

  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('allExpenses'))}</h1>
      <button type="button" class="icon-btn accent" data-action="add" aria-label="${esc(t('addTitle'))}">＋</button></header>
    <div class="search">
      <input type="search" name="q" placeholder="${esc(t('search'))}" value="${esc(filters.q)}" aria-label="${esc(t('search'))}" autocomplete="off">
    </div>
    <div class="filters">
      <select name="month" aria-label="${esc(t('month'))}">${opt('', t('allMonths'), filters.month)}${months.map((m) => opt(m, monthLabel(m), filters.month)).join('')}</select>
      <select name="category" aria-label="${esc(t('category'))}">${opt('', t('allCategories'), filters.category)}${state.categories.map((c) => opt(c.id, `${c.icon} ${catName(c)}`, filters.category)).join('')}</select>
      <select name="method" aria-label="${esc(t('paymentMethod'))}">${opt('', t('anyPayment'), filters.method)}${METHODS.map((m) => opt(m.id, t(`method.${m.id}`), filters.method)).join('')}</select>
    </div>
    <div id="results">${resultsHtml()}</div>`;

  const results = root.querySelector('#results');
  const refresh = () => { results.innerHTML = resultsHtml(); };

  root.querySelectorAll('.filters select').forEach((s) => s.addEventListener('change', () => {
    filters[s.name] = s.value;
    refresh();
  }));
  root.querySelector('input[name=q]').addEventListener('input', (e) => {
    filters.q = e.target.value;
    refresh();
  });
  root.querySelector('[data-action="add"]').addEventListener('click', () => navigate('add'));
  results.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="clear"]')) {
      Object.assign(filters, { month: '', category: '', method: '', q: '' });
      render(root);
    }
  });
  enableSwipe(results, { onEdit: (id) => navigate(`edit/${id}`) });
}
