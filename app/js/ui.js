// Shared UI pieces: toasts, dialogs, sheets, tooltip, swipeable rows.
import {
  state, catById, METHODS, deleteExpense, saveExpense, budgetLevels,
} from './store.js';
import { esc, formatMoney, dayLabel, monthOf } from './utils.js';

export const money = (n, opts) => formatMoney(n, state.settings.currency, opts);
export const moneyTick = (n) => formatMoney(n, state.settings.currency, { compact: true });

// ---------- toast ----------

export function toast(message, { action, onAction, kind = '', duration = 3500 } = {}) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  };
  if (action) {
    el.querySelector('button').addEventListener('click', () => { close(); onAction?.(); });
  }
  setTimeout(close, duration);
  return close;
}

// ---------- modal dialog / bottom sheet ----------

/** Open a bottom sheet with given inner HTML. Returns the <dialog> element. */
export function openSheet(html, { className = '' } = {}) {
  const dlg = document.createElement('dialog');
  dlg.className = `sheet ${className}`;
  dlg.innerHTML = `<div class="sheet-body">${html}</div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  // Tap on backdrop closes.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.showModal();
  return dlg;
}

export function confirmDialog({ title, message = '', ok = 'OK', danger = false }) {
  return new Promise((resolve) => {
    const dlg = openSheet(`
      <h2 class="sheet-title">${esc(title)}</h2>
      ${message ? `<p class="muted">${esc(message)}</p>` : ''}
      <div class="sheet-actions">
        <button type="button" class="btn secondary" data-close>Cancel</button>
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>
      </div>`, { className: 'confirm' });
    let result = false;
    dlg.querySelector('[data-ok]').addEventListener('click', () => { result = true; dlg.close(); });
    dlg.addEventListener('close', () => resolve(result));
  });
}

// ---------- tooltip for charts ----------

export function initTooltip() {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let active = null;
  const hide = () => {
    tip.classList.remove('show');
    active?.closest('.pt')?.classList.remove('on');
    active = null;
  };
  const show = (target, x, y) => {
    const text = target.getAttribute('data-tip');
    if (!text) return hide();
    if (active !== target) {
      active?.closest('.pt')?.classList.remove('on');
      active = target;
      target.closest('.pt')?.classList.add('on');
    }
    tip.textContent = text;
    tip.classList.add('show');
    const r = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    const top = y - r.height - 14 < 8 ? y + 18 : y - r.height - 14;
    tip.style.transform = `translate(${left}px, ${top}px)`;
  };
  document.addEventListener('pointermove', (e) => {
    const t = e.target.closest?.('svg.chart [data-tip]');
    if (t) show(t, e.clientX, e.clientY);
    else if (e.pointerType === 'mouse') hide();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('svg.chart [data-tip]');
    if (t) show(t, e.clientX, e.clientY); else hide();
  });
  window.addEventListener('scroll', hide, { passive: true, capture: true });
  window.addEventListener('hashchange', hide);
}

// ---------- expense rows ----------

export function methodLabel(id) {
  return METHODS.find((m) => m.id === id)?.label || 'Other';
}

export function expenseRow(e, { showDate = false } = {}) {
  const c = catById(e.categoryId);
  const sub = [showDate ? dayLabel(e.date) : null, methodLabel(e.method), e.recurringId ? '↻ Monthly' : null]
    .filter(Boolean).join(' · ');
  return `<li class="swipe" data-id="${esc(e.id)}">
    <div class="swipe-actions">
      <button type="button" class="act-edit" data-act="edit">Edit</button>
      <button type="button" class="act-del" data-act="delete">Delete</button>
    </div>
    <button type="button" class="swipe-content row" aria-label="Edit ${esc(c.name)} ${esc(money(e.amount))}">
      <span class="cat-dot" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
      <span class="row-main">
        <span class="row-title">${esc(e.note || c.name)}</span>
        <span class="row-sub">${esc(e.note ? `${c.name} · ${sub}` : sub)}</span>
      </span>
      <span class="row-amount">${esc(money(e.amount))}</span>
    </button>
  </li>`;
}

/** Delete with an Undo toast. */
export async function deleteWithUndo(id) {
  const e = state.expenses.find((x) => x.id === id);
  if (!e) return;
  const copy = { ...e };
  await deleteExpense(id);
  toast('Expense deleted', { action: 'Undo', onAction: () => saveExpense(copy), duration: 5000 });
}

/**
 * Swipe-left to reveal Edit/Delete on .swipe rows inside `list`; tap to edit.
 */
export function enableSwipe(list, { onEdit }) {
  const OPEN = -144;
  let start = null;
  const closeAll = (except) => list.querySelectorAll('.swipe.open').forEach((r) => {
    if (r !== except) { r.classList.remove('open'); r.querySelector('.swipe-content').style.transform = ''; }
  });

  list.addEventListener('pointerdown', (e) => {
    const content = e.target.closest('.swipe-content');
    if (!content) return;
    const row = content.closest('.swipe');
    start = {
      x: e.clientX, y: e.clientY, row, content, base: row.classList.contains('open') ? OPEN : 0, dx: 0, dir: null,
    };
  });
  list.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x; const dy = e.clientY - start.y;
    if (!start.dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) start.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    if (start.dir !== 'h') return;
    start.dx = dx;
    start.row.classList.add('dragging');
    const x = Math.min(0, Math.max(OPEN - 40, start.base + dx));
    start.content.style.transition = 'none';
    start.content.style.transform = `translateX(${x}px)`;
  });
  const end = () => {
    if (!start) return;
    const { row, content, base, dx, dir } = start;
    start = null;
    row.classList.remove('dragging');
    content.style.transition = '';
    if (dir === 'h') {
      const open = base + dx < OPEN / 2;
      row.classList.toggle('open', open);
      content.style.transform = open ? `translateX(${OPEN}px)` : '';
      if (open) closeAll(row);
      row.dataset.swiped = '1';
      setTimeout(() => { delete row.dataset.swiped; }, 50);
    }
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.swipe');
    if (!row) return;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'edit') return onEdit(row.dataset.id);
    if (act === 'delete') return deleteWithUndo(row.dataset.id);
    if (row.dataset.swiped) return;
    if (row.classList.contains('open')) { closeAll(); return; }
    closeAll();
    onEdit(row.dataset.id);
  });
}

// ---------- budget alerts ----------

/** Compare budget levels before/after a change and toast any newly crossed threshold. */
export function announceBudgetCrossings(month, before) {
  const after = budgetLevels(month);
  const msgs = [];
  for (const [id, lvl] of Object.entries(after)) {
    if (lvl > (before[id] || 0)) {
      const name = id === '__total' ? 'Monthly budget' : catById(id).name;
      msgs.push({ lvl, text: lvl >= 100 ? `${name}: budget exceeded` : `${name}: 80% of budget used` });
    }
  }
  msgs.sort((a, b) => b.lvl - a.lvl).slice(0, 2).forEach((m, i) => {
    setTimeout(() => toast(`${m.lvl >= 100 ? '⛔' : '⚠️'} ${m.text}`, { kind: m.lvl >= 100 ? 'critical' : 'warning', duration: 5000 }), i * 300);
  });
  return msgs.length;
}

export const monthOfExpense = (e) => monthOf(e.date);

export function progressBar(spent, budget) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  const cls = pct >= 100 ? 'critical' : pct >= 80 ? 'warning' : 'good';
  return `<div class="progress ${cls}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100">
    <span style="width:${Math.min(100, pct)}%"></span></div>`;
}

export function statusBadge(spent, budget) {
  const pct = budget > 0 ? (spent / budget) * 100 : 0;
  if (pct >= 100) return '<span class="badge critical">⛔ Over budget</span>';
  if (pct >= 80) return '<span class="badge warning">⚠️ 80%+ used</span>';
  return '';
}
