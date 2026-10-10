import {
  state, saveCategory, deleteCategory, fallbackCategoryFor, categoryTotals,
  CATEGORY_COLORS, CATEGORY_ICONS,
} from '../store.js';
import { esc, currentMonth } from '../utils.js';
import {
  money, openSheet, confirmDialog, toast, progressBar, statusBadge,
} from '../ui.js';
import { t, catName } from '../i18n.js';

export function openCategoryEditor(cat) {
  const isNew = !cat;
  const c = cat || {
    name: '', icon: CATEGORY_ICONS[0], color: CATEGORY_COLORS[state.categories.length % CATEGORY_COLORS.length], budget: null,
  };
  const count = cat ? state.expenses.filter((e) => e.categoryId === cat.id).length : 0;
  const dlg = openSheet(`
    <form class="cat-form" method="dialog" novalidate>
      <div class="sheet-head">
        <button type="button" class="icon-btn" data-close aria-label="${esc(t('cancel'))}">✕</button>
        <h2 class="sheet-title">${esc(t(isNew ? 'newCategory' : 'editCategory'))}</h2>
        <span class="icon-btn-spacer"></span>
      </div>
      <div class="cat-preview"><span class="cat-dot big" style="--c:${esc(c.color)}">${esc(c.icon)}</span></div>
      <label class="field"><span class="field-label">${esc(t('name'))}</span>
        <input name="name" value="${esc(catName(c))}" required maxlength="40" placeholder="${esc(t('namePlaceholder'))}" autocomplete="off"></label>
      <label class="field"><span class="field-label">${esc(t('budgetOptional'))}</span>
        <input name="budget" type="number" inputmode="decimal" min="0" step="0.01" value="${c.budget || ''}" placeholder="${esc(t('noBudgetPlaceholder'))}"></label>
      <div class="field"><span class="field-label">${esc(t('icon'))}</span>
        <div class="icon-grid">${CATEGORY_ICONS.map((i) => `<button type="button" class="icon-opt" data-icon="${esc(i)}" aria-pressed="${i === c.icon}">${esc(i)}</button>`).join('')}</div></div>
      <div class="field"><span class="field-label">${esc(t('color'))}</span>
        <div class="color-grid">${CATEGORY_COLORS.map((col) => `<button type="button" class="color-opt" data-color="${col}" style="--c:${col}" aria-label="${esc(t('color'))} ${col}" aria-pressed="${col === c.color}"></button>`).join('')}</div></div>
      <button type="submit" class="btn primary big">${esc(t(isNew ? 'addCategory' : 'save'))}</button>
      ${isNew ? '' : `<button type="button" class="btn danger-outline" data-action="delete">${esc(count ? t('deleteCategoryCount', count) : t('deleteCategory'))}</button>`}
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
    const entered = form.name.value.trim();
    if (!entered) { form.name.focus(); toast(t('giveName')); return; }
    // Keep the stored name when a translated built-in name wasn't changed.
    const name = cat && entered === catName(cat) ? cat.name : entered;
    const lower = entered.toLowerCase();
    if (state.categories.some((x) => x.id !== cat?.id && (x.name.toLowerCase() === lower || catName(x).toLowerCase() === lower))) {
      toast(t('nameExists')); return;
    }
    await saveCategory({ ...(cat || {}), name, icon, color, budget: parseFloat(form.budget.value) || null });
    dlg.close();
    toast(isNew ? t('added', { name: entered }) : t('categorySaved'));
  });
  dlg.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
    if (state.categories.length <= 1) { toast(t('needOneCategory')); return; }
    const fallback = fallbackCategoryFor(cat.id);
    const ok = await confirmDialog({
      title: t('deleteCatTitle', { name: catName(cat) }),
      message: count ? t('willMove', count, catName(fallback)) : t('noCatExpenses'),
      ok: t('delete'), danger: true,
    });
    if (!ok) return;
    await deleteCategory(cat.id, fallback.id);
    dlg.close();
    toast(t('deleted', { name: catName(cat) }));
  });
  return dlg;
}

export function render(root) {
  const totals = categoryTotals(currentMonth());
  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('categoriesTitle'))}</h1>
      <button type="button" class="icon-btn accent" data-action="new" aria-label="${esc(t('addCategory'))}">＋</button></header>
    <p class="muted small">${esc(t('categoriesHint'))}</p>
    <ul class="list card-list cats">
      ${state.categories.map((c) => {
    const spent = totals[c.id] || 0;
    return `<li><button type="button" class="row" data-id="${esc(c.id)}">
          <span class="cat-dot" style="--c:${esc(c.color)}">${esc(c.icon)}</span>
          <span class="row-main"><span class="row-title">${esc(catName(c))} ${statusBadge(spent, c.budget)}</span>
            <span class="row-sub">${esc(c.budget ? t('ofAmount', { spent: money(spent), budget: money(c.budget) }) : t('noBudget', { spent: money(spent) }))}</span>
            ${c.budget ? progressBar(spent, c.budget) : ''}</span>
          <span class="chev" aria-hidden="true">›</span>
        </button></li>`;
  }).join('')}
    </ul>
    <button type="button" class="btn secondary big" data-action="new">${esc(t('newCategoryBtn'))}</button>`;

  root.querySelectorAll('[data-action="new"]').forEach((b) => b.addEventListener('click', () => openCategoryEditor()));
  root.querySelector('.cats').addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (b) openCategoryEditor(state.categories.find((c) => c.id === b.dataset.id));
  });
}
