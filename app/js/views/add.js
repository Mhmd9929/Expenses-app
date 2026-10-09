import {
  state, METHODS, saveExpense, saveRecurring, budgetLevels, catById,
} from '../store.js';
import {
  today, esc, monthOf, round2,
} from '../utils.js';
import {
  toast, announceBudgetCrossings, deleteWithUndo, money,
} from '../ui.js';
import { back } from '../router.js';

const LAST_KEY = 'expenses:last';
const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST_KEY)) || {}; } catch { return {}; } };
const writeLast = (v) => { try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch { /* ignore */ } };

function currencySymbol() {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency: state.settings.currency }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || state.settings.currency;
  } catch { return state.settings.currency; }
}

function amountToString(n) {
  if (!n) return '0';
  return String(round2(n));
}

export const live = false; // don't re-render while the user is typing

export function render(root, { param, query }) {
  const editing = param ? state.expenses.find((e) => e.id === param) : null;
  if (param && !editing) {
    root.innerHTML = '<div class="empty"><p>That expense no longer exists.</p><a class="link" href="#/list">Back to expenses</a></div>';
    return;
  }
  const last = readLast();
  const validCat = (id) => state.categories.some((c) => c.id === id);
  const form = {
    amount: editing ? amountToString(editing.amount) : '0',
    categoryId: editing?.categoryId
      || (validCat(query.get('cat')) && query.get('cat'))
      || (validCat(last.categoryId) && last.categoryId)
      || state.categories[0]?.id,
    method: editing?.method || last.method || 'card',
    date: editing?.date || today(),
    note: editing?.note || '',
    repeat: false,
  };

  const chips = state.categories.map((c) => `
    <button type="button" class="chip" data-cat="${esc(c.id)}" style="--c:${esc(c.color)}" aria-pressed="${c.id === form.categoryId}">
      <span class="chip-icon">${esc(c.icon)}</span><span>${esc(c.name)}</span>
    </button>`).join('');

  const methods = METHODS.map((m) => `
    <button type="button" class="seg-btn" data-method="${m.id}" aria-pressed="${m.id === form.method}">${m.icon} ${m.label}</button>`).join('');

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

  root.innerHTML = `
    <header class="top-bar">
      <button type="button" class="icon-btn" data-action="close" aria-label="Close">✕</button>
      <h1 class="top-title">${editing ? 'Edit expense' : 'Add expense'}</h1>
      ${editing ? '<button type="button" class="icon-btn danger-text" data-action="delete" aria-label="Delete expense">🗑</button>' : '<span class="icon-btn-spacer"></span>'}
    </header>
    <form class="entry" novalidate>
      <div class="amount-display" aria-live="polite">
        <span class="amount-currency">${esc(currencySymbol())}</span>
        <span class="amount-value" data-testid="amount">${esc(form.amount)}</span>
      </div>
      <div class="chips" role="group" aria-label="Category">${chips}</div>
      <div class="entry-row">
        <div class="seg" role="group" aria-label="Payment method">${methods}</div>
      </div>
      <div class="entry-row two">
        <label class="field compact"><span class="field-label">Date</span>
          <input type="date" name="date" value="${esc(form.date)}" max="2100-12-31" required></label>
        <label class="field compact"><span class="field-label">Note</span>
          <input type="text" name="note" value="${esc(form.note)}" placeholder="Optional" maxlength="120" enterkeyhint="done" autocomplete="off"></label>
      </div>
      ${editing
    ? (editing.recurringId ? '<p class="muted small center">↻ Added by a monthly recurring expense (manage in Settings).</p>' : '')
    : `<label class="toggle-row"><input type="checkbox" name="repeat"><span>Repeat every month</span></label>`}
      <div class="keypad">
        ${keys.map((k) => `<button type="button" class="key" data-key="${k}" aria-label="${k === 'del' ? 'Backspace' : k}">${k === 'del' ? '⌫' : k}</button>`).join('')}
      </div>
      <button type="submit" class="btn primary big" data-testid="save">${editing ? 'Save changes' : 'Save expense'}</button>
    </form>`;

  const $ = (s) => root.querySelector(s);
  const amountEl = $('.amount-value');
  const formEl = $('form');

  const setAmount = (v) => {
    form.amount = v;
    amountEl.textContent = v;
    amountEl.classList.toggle('placeholder', v === '0');
  };
  setAmount(form.amount);

  const press = (k) => {
    let a = form.amount;
    if (k === 'del') a = a.length > 1 ? a.slice(0, -1) : '0';
    else if (k === '.') { if (!a.includes('.')) a += '.'; }
    else {
      const [int, dec] = a.split('.');
      if (dec !== undefined && dec.length >= 2) return;
      if (dec === undefined && int.length >= 9) return;
      a = a === '0' ? k : a + k;
    }
    setAmount(a);
  };

  root.querySelector('.keypad').addEventListener('click', (e) => {
    const k = e.target.closest('[data-key]')?.dataset.key;
    if (k) press(k);
  });

  const onKey = (e) => {
    if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === '.' || e.key === ',') press('.');
    else if (e.key === 'Backspace') press('del');
    else if (e.key === 'Enter') formEl.requestSubmit();
    else if (e.key === 'Escape') back();
    else return;
    e.preventDefault();
  };
  document.addEventListener('keydown', onKey);

  root.querySelector('.chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    form.categoryId = b.dataset.cat;
    root.querySelectorAll('[data-cat]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  // Scroll the selected chip into view.
  root.querySelector('.chip[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });

  root.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-method]');
    if (!b) return;
    form.method = b.dataset.method;
    root.querySelectorAll('[data-method]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });

  $('[data-action="close"]').addEventListener('click', () => back());
  $('[data-action="delete"]')?.addEventListener('click', async () => {
    await deleteWithUndo(editing.id);
    back();
  });

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = round2(parseFloat(form.amount));
    if (!(amount > 0)) {
      amountEl.parentElement.classList.remove('shake');
      void amountEl.offsetWidth;
      amountEl.parentElement.classList.add('shake');
      toast('Enter an amount first');
      return;
    }
    const date = formEl.date.value || today();
    const note = formEl.note.value;
    const month = monthOf(date);
    const before = budgetLevels(month);
    const saved = await saveExpense({
      ...(editing || {}), amount, date, categoryId: form.categoryId, method: form.method, note,
    });
    if (!editing && formEl.repeat?.checked) {
      const rule = await saveRecurring({
        amount, categoryId: form.categoryId, method: form.method, note,
        day: Number(date.slice(8, 10)), startDate: date, lastMonth: month,
      });
      saved.recurringId = rule.id;
      await saveExpense(saved);
    }
    writeLast({ categoryId: form.categoryId, method: form.method });
    document.removeEventListener('keydown', onKey);
    const crossed = announceBudgetCrossings(month, before);
    if (!crossed) toast(`${editing ? 'Updated' : 'Saved'} ${money(amount)} · ${catById(form.categoryId).name}`);
    back();
  });
}
