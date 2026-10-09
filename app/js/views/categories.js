import {
  state, saveCategory, deleteCategory, fallbackCategoryFor, categoryTotals,
  CATEGORY_COLORS, CATEGORY_ICONS,
} from '../store.js';
import { esc, currentMonth } from '../utils.js';
import {
  money, openSheet, confirmDialog, toast, progressBar, statusBadge,
} from '../ui.js';

export function openCategoryEditor(cat) {
  const isNew = !cat;
  const c = cat || {
    name: '', icon: CATEGORY_ICONS[0], color: CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length], budget: null,
  };
  const count = cat ? state.expenses.filter((e) => e.categoryId === cat.id).length : 0;
  const dlg = openSheet(`
    <form class="cat-form" method="dialog" novalidate>
      <div class="sheet-head">
        <button type="button" class="icon-btn" data-close aria-label="Cancel">✕</button>
        <h2 class="sheet-title">${isNew ? 'New category' : 'Edit category'}</h2>
        <span class="icon-btn-spacer"></span>
      </div>
      <div class="cat-preview"><span class="cat-dot big" style="--c:${esc(c.color)}">${esc(c.icon)}</span></div>
      <label class="field"><span class="field-label">Name</span>
        <input name="name" value="${esc(c.name)}" required maxlength="40" placeholder="e.g. Coffee" autocomplete="off"></label>
      <label class="field"><span class="field-label">Monthly budget (optional)</span>
        <input name="budget" type="number" inputmode="decimal" min="0" step="0.01" value="${c.budget || ''}" placeholder="No budget"></label>
      <div class="field"><span class="field-label">Icon</span>
        <div class="icon-grid">${CATEGORY_ICONS.map((i) => `<button type="button" class="icon-opt" data-icon="${esc(i)}" aria-pressed="${i === c.icon}">${esc(i)}</button>`).join('')}</div></div>
      <div class="field"><span class="field-label">Color</span>
        <div class="color-grid">${CATEGORY_COLORS.map((col) => `<button type="button" class="color-opt" data-color="${col}" style="--c:${col}" aria-label="Color ${col}" aria-pressed="${col === c.color}"></button>`).join('')}</div></div>
      <button type="submit" class="btn primary big">${isNew ? 'Add category' : 'Save'}</button>
      ${isNew ? '' : `<button type="button" class="btn danger-outline" data-action="delete">Delete category${count ? ` (${count} expense${count === 1 ? '' : 's'})` : ''}</button>`}
    </form>`);
  const form = dlg.querySelector('form');
  const preview = dlg.querySelector('.cat-preview .cat-dot');
  let { icon, color } = c;
  dlg.querySelector('.icon-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-icon]');
    if (!b) return;
    icon = b.dataset.icon;
    preview.textContent = icon;
    dlg.querySelectorAll('[data-icon]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  dlg.querySelector('.color-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-color]');
    if (!b) return;
    color = b.dataset.color;
    preview.style.setProperty('--c', color);
    dlg.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    if (!name) { form.name.focus(); toast('Give the category a name'); return; }
    if (state.categories.some((x) => x.id !== cat?.id && x.name.toLowerCase() === name.toLowerCase())) {
      toast('A category with that name already exists'); return;
    }
    await saveCategory({ ...(cat || {}), name, icon, color, budget: parseFloat(form.budget.value) || null });
    dlg.close();
    toast(isNew ? `Added “${name}”` : 'Category saved');
  });
  dlg.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (state.categories.length <= 1) { toast('You need at least one category'); return; }
    const fallback = fallbackCategoryFor(cat.id);
    const ok = await confirmDialog({
      title: `Delete “${cat.name}”?`,
      message: count ? `${count} expense${count === 1 ? '' : 's'} will be moved to “${fallback.name}”.` : 'This category has no expenses.',
      ok: 'Delete', danger: true,
    });
    if (!ok) return;
    await deleteCategory(cat.id, fallback.id);
    dlg.close();
    toast(`Deleted “${cat.name}”`);
  });
  return dlg;
}

export function render(root) {
  const totals = categoryTotals(currentMonth());
  root.innerHTML = `
    <header class="page-head"><h1>Categories</h1>
      <button type="button" class="icon-btn accent" data-action="new" aria-label="Add category">＋</button></header>
    <p class="muted small">This month’s spending per category. Tap to rename, change icon, color or budget.</p>
    <ul class="list card-list cats">
      ${state.categories.map((c) => {
    const spent = totals[c.id] || 0;
    return `<li><button type="button" class="row" data-id="${esc(c.id)}">
          <span class="cat-dot" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
          <span class="row-main"><span class="row-title">${esc(c.name)} ${statusBadge(spent, c.budget)}</span>
            <span class="row-sub">${esc(money(spent))}${c.budget ? ` of ${esc(money(c.budget))}` : ' · no budget'}</span>
            ${c.budget ? progressBar(spent, c.budget) : ''}</span>
          <span class="chev" aria-hidden="true">›</span>
        </button></li>`;
  }).join('')}
    </ul>
    <button type="button" class="btn secondary big" data-action="new">＋ New category</button>`;

  root.querySelectorAll('[data-action="new"]').forEach((b) => b.addEventListener('click', () => openCategoryEditor()));
  root.querySelector('.cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) openCategoryEditor(state.categories.find((c) => c.id === b.dataset.id));
  });
}
