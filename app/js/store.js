// In-memory app state, persisted write-through to IndexedDB.
import * as db from './db.js';
import {
  uid, round2, today, monthOf, currentMonth, addMonths, daysInMonth, pad2, sum,
} from './utils.js';

export const BACKUP_VERSION = 1;

export const DEFAULT_CATEGORIES = [
  ['food', 'Food', '🍔', '#eb6834'],
  ['groceries', 'Groceries', '🛒', '#1baf7a'],
  ['transport', 'Transport', '🚌', '#2a78d6'],
  ['fuel', 'Fuel', '⛽', '#eda100'],
  ['rent', 'Rent', '🏠', '#4a3aa7'],
  ['bills', 'Bills & Utilities', '💡', '#e34948'],
  ['shopping', 'Shopping', '🛍️', '#e87ba4'],
  ['health', 'Health', '💊', '#008300'],
  ['entertainment', 'Entertainment', '🎬', '#a14fc0'],
  ['education', 'Education', '📚', '#1c5cab'],
  ['travel', 'Travel', '✈️', '#0f8b8d'],
  ['other', 'Other', '📦', '#7a7873'],
].map(([id, name, icon, color], order) => ({ id, name, icon, color, order, budget: null }));

export const CATEGORY_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948',
  '#a14fc0', '#1c5cab', '#0f8b8d', '#8d6e63', '#c2185b', '#5f8f00', '#d97706', '#7a7873',
];

export const CATEGORY_ICONS = [
  '🍔', '🍕', '☕', '🛒', '🚌', '🚕', '⛽', '🚗', '🏠', '💡', '📱', '🌐', '🛍️', '👕', '💊', '🏥',
  '🎬', '🎮', '🎵', '📚', '🎓', '✈️', '🏖️', '🎁', '🐶', '👶', '💇', '🏋️', '🔧', '💼', '💳', '📦',
];

export const METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'other', label: 'Other', icon: '🔁' },
];

export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'EGP', 'SAR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'MAD', 'TND',
  'TRY', 'INR', 'PKR', 'CNY', 'JPY', 'KRW', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK',
  'PLN', 'BRL', 'MXN', 'ZAR', 'NGN', 'KES', 'IDR', 'MYR', 'SGD', 'PHP', 'THB', 'RUB',
];

const DEFAULT_SETTINGS = { key: 'settings', currency: 'USD', budget: null, theme: 'system' };

export const state = {
  expenses: [],
  categories: [],
  recurring: [],
  settings: { ...DEFAULT_SETTINGS },
};

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn());

function sortCategories() {
  state.categories.sort((a, b) => a.order - b.order);
}

export async function load() {
  const [expenses, categories, recurring, meta] = await Promise.all(
    ['expenses', 'categories', 'recurring', 'meta'].map((s) => db.getAll(s)),
  );
  const settings = meta.find((m) => m.key === 'settings');
  if (!settings && categories.length === 0) {
    // First launch: seed defaults.
    state.categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    state.settings = { ...DEFAULT_SETTINGS };
    await db.put('categories', ...state.categories);
    await db.put('meta', state.settings);
  } else {
    state.categories = categories;
    state.settings = { ...DEFAULT_SETTINGS, ...settings };
  }
  state.expenses = expenses;
  state.recurring = recurring;
  sortCategories();
}

// ---------- lookups & aggregates ----------

export const catById = (id) => state.categories.find((c) => c.id === id)
  || { id, name: 'Unknown', icon: '❔', color: '#7a7873', budget: null };

export const expensesInMonth = (month) => state.expenses.filter((e) => e.date.startsWith(month));

export const monthTotal = (month) => round2(sum(expensesInMonth(month), (e) => e.amount));

/** Map categoryId -> total for a month. */
export function categoryTotals(month) {
  const out = {};
  for (const e of expensesInMonth(month)) out[e.categoryId] = (out[e.categoryId] || 0) + e.amount;
  for (const k of Object.keys(out)) out[k] = round2(out[k]);
  return out;
}

/** Daily totals for a month as an array indexed by day-1. */
export function dailyTotals(month) {
  const arr = new Array(daysInMonth(month)).fill(0);
  for (const e of expensesInMonth(month)) arr[Number(e.date.slice(8, 10)) - 1] += e.amount;
  return arr.map(round2);
}

export function sortedExpenses(list = state.expenses) {
  return [...list].sort((a, b) => (b.date.localeCompare(a.date)) || ((b.createdAt || 0) - (a.createdAt || 0)));
}

export function monthsWithData() {
  const set = new Set(state.expenses.map((e) => monthOf(e.date)));
  set.add(currentMonth());
  return [...set].sort().reverse();
}

/**
 * Budget usage levels for a month: { [categoryId|'__total']: 0 | 80 | 100 }.
 * Used to detect when a save pushes something across 80% / 100%.
 */
export function budgetLevels(month) {
  const levels = {};
  const level = (spent, budget) => (!budget ? 0 : spent >= budget ? 100 : spent >= budget * 0.8 ? 80 : 0);
  const totals = categoryTotals(month);
  for (const c of state.categories) levels[c.id] = level(totals[c.id] || 0, c.budget);
  levels.__total = level(monthTotal(month), state.settings.budget);
  return levels;
}

// ---------- expenses ----------

function normalizeExpense(e) {
  return {
    id: e.id || uid(),
    amount: round2(Math.abs(Number(e.amount) || 0)),
    date: e.date || today(),
    categoryId: e.categoryId || state.categories[0]?.id || 'other',
    method: ['cash', 'card', 'other'].includes(e.method) ? e.method : 'other',
    note: (e.note || '').trim(),
    recurringId: e.recurringId || null,
    createdAt: e.createdAt || Date.now(),
  };
}

export async function saveExpense(data) {
  const e = normalizeExpense(data);
  const i = state.expenses.findIndex((x) => x.id === e.id);
  if (i >= 0) state.expenses[i] = e; else state.expenses.push(e);
  await db.put('expenses', e);
  emit();
  return e;
}

export async function deleteExpense(id) {
  state.expenses = state.expenses.filter((e) => e.id !== id);
  await db.del('expenses', id);
  emit();
}

// ---------- categories ----------

export async function saveCategory(data) {
  const existing = state.categories.find((c) => c.id === data.id);
  const c = {
    id: data.id || uid(),
    name: (data.name || '').trim() || 'Untitled',
    icon: data.icon || '📦',
    color: data.color || CATEGORY_COLORS[0],
    order: existing ? existing.order : Math.max(-1, ...state.categories.map((x) => x.order)) + 1,
    budget: data.budget > 0 ? round2(data.budget) : null,
  };
  if (existing) Object.assign(existing, c); else state.categories.push(c);
  sortCategories();
  await db.put('categories', c);
  emit();
  return c;
}

/** Delete a category; its expenses and recurring rules move to `fallbackId`. */
export async function deleteCategory(id, fallbackId) {
  if (state.categories.length <= 1) throw new Error('At least one category is required.');
  const moved = state.expenses.filter((e) => e.categoryId === id);
  moved.forEach((e) => { e.categoryId = fallbackId; });
  const movedRec = state.recurring.filter((r) => r.categoryId === id);
  movedRec.forEach((r) => { r.categoryId = fallbackId; });
  state.categories = state.categories.filter((c) => c.id !== id);
  if (moved.length) await db.put('expenses', ...moved);
  if (movedRec.length) await db.put('recurring', ...movedRec);
  await db.del('categories', id);
  emit();
  return moved.length;
}

export function fallbackCategoryFor(id) {
  return state.categories.find((c) => c.id !== id && c.id === 'other')
    || state.categories.find((c) => c.id !== id && /^other$/i.test(c.name))
    || state.categories.find((c) => c.id !== id);
}

// ---------- settings ----------

export async function saveSettings(patch) {
  Object.assign(state.settings, patch, { key: 'settings' });
  if (!(state.settings.budget > 0)) state.settings.budget = null;
  await db.put('meta', { ...state.settings });
  emit();
}

// ---------- recurring ----------

export async function saveRecurring(data) {
  const existing = state.recurring.find((r) => r.id === data.id);
  const r = {
    id: data.id || uid(),
    amount: round2(Math.abs(Number(data.amount) || 0)),
    categoryId: data.categoryId,
    method: data.method || 'other',
    note: (data.note || '').trim(),
    day: Math.min(31, Math.max(1, Number(data.day) || 1)),
    startDate: data.startDate || today(),
    lastMonth: data.lastMonth ?? existing?.lastMonth ?? null,
    active: data.active !== false,
  };
  if (existing) Object.assign(existing, r); else state.recurring.push(r);
  await db.put('recurring', r);
  emit();
  return r;
}

export async function deleteRecurring(id) {
  state.recurring = state.recurring.filter((r) => r.id !== id);
  await db.del('recurring', id);
  emit();
}

/** Date a rule fires in a given month (clamped to the month's last day). */
export const recurringDate = (rule, month) => `${month}-${pad2(Math.min(rule.day, daysInMonth(month)))}`;

/**
 * Add any recurring expenses that are due (catching up on missed months).
 * Returns the list of expenses that were created.
 */
export async function applyRecurring() {
  const t = today();
  const now = currentMonth();
  const created = [];
  const touched = [];
  for (const rule of state.recurring) {
    if (!rule.active) continue;
    let m = rule.lastMonth ? addMonths(rule.lastMonth, 1) : monthOf(rule.startDate);
    let changed = false;
    for (; m <= now; m = addMonths(m, 1)) {
      const date = recurringDate(rule, m);
      if (date > t) break; // not due yet this month
      if (date >= rule.startDate) {
        created.push(normalizeExpense({
          amount: rule.amount, date, categoryId: rule.categoryId, method: rule.method,
          note: rule.note, recurringId: rule.id,
        }));
      }
      rule.lastMonth = m;
      changed = true;
    }
    if (changed) touched.push(rule);
  }
  if (created.length) {
    state.expenses.push(...created);
    await db.put('expenses', ...created);
  }
  if (touched.length) await db.put('recurring', ...touched);
  if (created.length || touched.length) emit();
  return created;
}

// ---------- backup / restore ----------

export function exportBackup() {
  return {
    app: 'expenses',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: { ...state.settings },
    categories: state.categories,
    expenses: sortedExpenses(),
    recurring: state.recurring,
  };
}

export async function importBackup(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.expenses) || !Array.isArray(data.categories)) {
    throw new Error('This file is not an Expenses backup.');
  }
  const categories = data.categories
    .filter((c) => c && c.id)
    .map((c, i) => ({
      id: String(c.id), name: String(c.name || 'Untitled'), icon: c.icon || '📦',
      color: c.color || CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      order: Number.isFinite(c.order) ? c.order : i, budget: c.budget > 0 ? round2(c.budget) : null,
    }));
  if (!categories.length) throw new Error('Backup has no categories.');
  const prevCats = state.categories;
  state.categories = categories; // normalizeExpense falls back to these
  const expenses = data.expenses
    .filter((e) => e && Number(e.amount) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .map((e) => normalizeExpense({ ...e, id: e.id ? String(e.id) : undefined }));
  const recurring = (Array.isArray(data.recurring) ? data.recurring : []).filter((r) => r && r.id && r.categoryId);
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}), key: 'settings' };
  try {
    await db.replaceAll({ categories, expenses, recurring, meta: [settings] });
  } catch (err) {
    state.categories = prevCats;
    throw err;
  }
  Object.assign(state, { categories, expenses, recurring, settings });
  sortCategories();
  emit();
  return { expenses: expenses.length, categories: categories.length };
}

export async function resetAll() {
  const categories = DEFAULT_CATEGORIES.map((c) => ({ ...c }));
  const settings = { ...DEFAULT_SETTINGS, currency: state.settings.currency, theme: state.settings.theme };
  await db.replaceAll({ categories, expenses: [], recurring: [], meta: [settings] });
  Object.assign(state, { categories, expenses: [], recurring: [], settings });
  emit();
}
