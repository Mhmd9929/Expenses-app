import {
  state, monthTotal, categoryTotals, sortedExpenses,
} from '../store.js';
import {
  currentMonth, monthLabel, today, esc, daysInMonth,
} from '../utils.js';
import {
  money, expenseRow, enableSwipe, progressBar,
} from '../ui.js';
import { navigate } from '../router.js';

export function render(root) {
  const month = currentMonth();
  const total = monthTotal(month);
  const budget = state.settings.budget;
  const totals = categoryTotals(month);
  const todayTotal = state.expenses.filter((e) => e.date === today()).reduce((s, e) => s + e.amount, 0);
  const day = Number(today().slice(8, 10));
  const recent = sortedExpenses().slice(0, 8);

  let budgetHtml;
  if (budget > 0) {
    const left = budget - total;
    budgetHtml = `
      <div class="budget-line-text">
        <span class="${left < 0 ? 'neg' : ''}" data-testid="remaining">${left >= 0 ? `${esc(money(left))} left` : `${esc(money(-left))} over budget`}</span>
        <span class="muted">of ${esc(money(budget))}</span>
      </div>
      ${progressBar(total, budget)}
      <div class="muted small">${left > 0 ? `${esc(money(left / (daysInMonth(month) - day + 1)))} per day for the rest of the month` : ''}</div>`;
  } else {
    budgetHtml = '<a class="link small" href="#/settings">Set a monthly budget →</a>';
  }

  const alerts = state.categories
    .filter((c) => c.budget > 0 && (totals[c.id] || 0) >= c.budget * 0.8)
    .map((c) => {
      const spent = totals[c.id] || 0;
      const over = spent >= c.budget;
      return `<li class="alert ${over ? 'critical' : 'warning'}">
        <span class="alert-icon" aria-hidden="true">${over ? '⛔' : '⚠️'}</span>
        <span class="row-main"><span class="row-title">${esc(c.icon)} ${esc(c.name)}</span>
        <span class="row-sub">${over ? 'Over budget' : `${Math.round((spent / c.budget) * 100)}% of budget used`} · ${esc(money(spent))} / ${esc(money(c.budget))}</span></span>
      </li>`;
    }).join('');

  root.innerHTML = `
    <header class="page-head">
      <div><p class="eyebrow">${esc(monthLabel(month))}</p><h1>Expenses</h1></div>
    </header>
    <section class="card hero">
      <p class="muted">Spent this month</p>
      <p class="hero-amount" data-testid="month-total">${esc(money(total))}</p>
      ${budgetHtml}
    </section>
    <button type="button" class="btn primary big add-btn" data-testid="add-expense">＋ Add expense</button>
    <section class="stats">
      <div class="stat"><span class="muted small">Today</span><strong>${esc(money(todayTotal))}</strong></div>
      <div class="stat"><span class="muted small">Daily average</span><strong>${esc(money(total / day))}</strong></div>
    </section>
    ${alerts ? `<section><h2 class="section-title">Budget alerts</h2><ul class="list alerts">${alerts}</ul></section>` : ''}
    <section>
      <div class="section-head"><h2 class="section-title">Recent</h2>${recent.length ? '<a class="link" href="#/list">See all</a>' : ''}</div>
      ${recent.length
    ? `<ul class="list card-list" id="recent">${recent.map((e) => expenseRow(e, { showDate: true })).join('')}</ul>
           <p class="hint">Tip: swipe left on an expense to edit or delete it.</p>`
    : `<div class="empty"><p class="empty-icon">🧾</p><p>No expenses yet.</p><p class="muted small">Tap “Add expense” to log your first one.</p></div>`}
    </section>`;

  root.querySelector('.add-btn').addEventListener('click', () => navigate('add'));
  const list = root.querySelector('#recent');
  if (list) enableSwipe(list, { onEdit: (id) => navigate(`edit/${id}`) });
}
