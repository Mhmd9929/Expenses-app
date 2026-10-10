// Small shared helpers: dates, formatting, escaping, ids, files.
import { locale, t } from './i18n.js';

export const pad2 = (n) => String(n).padStart(2, '0');

/** Local date as YYYY-MM-DD (never UTC, so late-night entries stay on the right day). */
export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
export const today = () => toISODate(new Date());
export const monthOf = (isoDate) => isoDate.slice(0, 7);
export const currentMonth = () => monthOf(today());

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
}

/** Shift a YYYY-MM month key by n months. */
export function addMonths(monthKey, n) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** Months from a to b inclusive (YYYY-MM keys). */
export function monthRange(a, b) {
  const out = [];
  for (let k = a; k <= b; k = addMonths(k, 1)) out.push(k);
  return out;
}

export function monthLabel(monthKey, style = 'long') {
  const d = parseISODate(`${monthKey}-01`);
  return d.toLocaleDateString(locale(), { month: style, year: 'numeric' });
}
export function monthShort(monthKey) {
  return parseISODate(`${monthKey}-01`).toLocaleDateString(locale(), { month: 'short' });
}

/** Short "day month" label, e.g. "Oct 5" / "5 أكتوبر". */
export function dayMonth(iso) {
  return parseISODate(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

export function dayLabel(iso) {
  const td = today();
  if (iso === td) return t('today');
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (iso === toISODate(y)) return t('yesterday');
  return parseISODate(iso).toLocaleDateString(locale(), {
    weekday: 'short', day: 'numeric', month: 'short',
    year: iso.slice(0, 4) === td.slice(0, 4) ? undefined : 'numeric',
  });
}

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const fmtCache = new Map();
export function formatMoney(amount, currency, opts = {}) {
  const loc = locale();
  const key = `${loc}|${currency}|${opts.compact ? 1 : 0}`;
  let f = fmtCache.get(key);
  if (!f) {
    try {
      const nf = new Intl.NumberFormat(loc, {
        style: 'currency', currency,
        notation: opts.compact ? 'compact' : 'standard',
        maximumFractionDigits: opts.compact ? 1 : 2,
      });
      f = nf;
      if (loc.startsWith('ar')) {
        // Isolate the symbol so Latin ones like "US$" don't get reordered in RTL text.
        f = {
          format: (n) => nf.formatToParts(n)
            .map((p) => (p.type === 'currency' ? `\u2068${p.value}\u2069` : p.value)).join(''),
        };
      }
    } catch {
      f = { format: (n) => `${currency} ${Number(n).toFixed(2)}` };
    }
    fmtCache.set(key, f);
  }
  return f.format(amount || 0);
}

export function formatPct(p, signed = false) {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—';
  const s = `${Math.abs(p) >= 10 ? Math.round(p) : p.toFixed(1)}%`;
  return signed && p > 0 ? `+${s}` : s;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Save a Blob: share sheet on mobile when available, otherwise a normal download. */
export async function saveFile(blob, filename) {
  const file = typeof File !== 'undefined' ? new File([blob], filename, { type: blob.type }) : null;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  // iOS home-screen apps can't trigger downloads, so prefer the share sheet there.
  if (standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export const sum = (arr, f = (x) => x) => arr.reduce((s, x) => s + f(x), 0);
