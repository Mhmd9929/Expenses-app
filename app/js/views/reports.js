import {
  state, monthTotal, categoryTotals, dailyTotals, catById,
} from '../store.js';
import {
  esc, monthLabel, monthShort, currentMonth, addMonths, monthRange, daysInMonth, today,
  formatPct, round2, monthOf, dayMonth, pad2,
} from '../utils.js';
import { money, moneyTick } from '../ui.js';
import { barChart, donutChart, lineChart } from '../charts.js';
import { t, catName } from '../i18n.js';

const view = { month: currentMonth(), range: 6, a: null, b: null };

function allMonths() {
  const now = currentMonth();
  const first = state.expenses.reduce((m, e) => (monthOf(e.date) < m ? monthOf(e.date) : m), addMonths(now, -11));
  const last = state.expenses.reduce((m, e) => (monthOf(e.date) > m ? monthOf(e.date) : m), now);
  return monthRange(first, last).reverse();
}

const pctChange = (from, to) => (from > 0 ? ((to - from) / from) * 100 : null);

function deltaHtml(from, to) {
  const d = round2(to - from);
  const p = pctChange(from, to);
  const cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
  const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '';
  return `<span class="delta ${cls}">${arrow} ${esc(money(Math.abs(d)))}${p !== null ? ` (${esc(formatPct(p, true))})` : ''}</span>`;
}

function insights(month) {
  const total = monthTotal(month);
  const totals = categoryTotals(month);
  const prevTotals = categoryTotals(addMonths(month, -1));
  const isCurrent = month === currentMonth();
  const isFuture = month > currentMonth();
  const dim = daysInMonth(month);
  const elapsed = isCurrent ? Number(today().slice(8, 10)) : dim;

  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const ids = new Set([...Object.keys(totals), ...Object.keys(prevTotals)]);
  let inc = null;
  for (const id of ids) {
    const d = (totals[id] || 0) - (prevTotals[id] || 0);
    if (d > 0 && (!inc || d > inc.d)) inc = { id, d, p: pctChange(prevTotals[id] || 0, totals[id] || 0) };
  }
  const avg = isFuture ? 0 : total / elapsed;
  const projected = isCurrent ? avg * dim : total;
  const budget = state.settings.budget;

  const card = (label, value, sub, testid) => `<div class="insight"><span class="muted small">${label}</span>
    <strong data-testid="${testid}">${value}</strong><span class="muted small">${sub}</span></div>`;

  return `<div class="insights">
    ${card(esc(t('biggestCategory')), top ? `${esc(catById(top[0]).icon)} ${esc(catName(catById(top[0])))}` : '—',
    esc(top ? t('ofTotal', { amount: money(top[1]), pct: formatPct((top[1] / total) * 100) }) : t('noSpending')), 'ins-top')}
    ${card(esc(t('biggestIncrease')), inc ? `${esc(catById(inc.id).icon)} ${esc(catName(catById(inc.id)))}` : '—',
    esc(inc ? t('vsMonth', {
      amount: `+${money(inc.d)}`,
      pct: inc.p !== null ? ` (${formatPct(inc.p, true)})` : t('newCat'),
      month: monthShort(addMonths(month, -1)),
    }) : t('noIncreases')), 'ins-inc')}
    ${card(esc(t('avgPerDay')), esc(money(avg)), esc(isCurrent ? t('overDaysSoFar', elapsed) : t('overDays', dim)), 'ins-avg')}
    ${card(esc(t(isCurrent ? 'projected' : 'monthTotal')), esc(money(projected)),
    budget > 0 ? (projected > budget ? `<span class="neg">${esc(t('overBudget', { amount: money(projected - budget) }))}</span>` : esc(t('underBudget', { amount: money(budget - projected) }))) : (isCurrent ? esc(t('atPace')) : '&nbsp;'), 'ins-proj')}
  </div>`;
}

function barSection() {
  const now = currentMonth();
  const months = monthRange(addMonths(now, -(view.range - 1)), now);
  const data = months.map((m) => ({
    label: monthShort(m),
    value: monthTotal(m),
    tip: `${monthLabel(m)}: ${money(monthTotal(m))}`,
    highlight: m === view.month,
  }));
  const totals = data.map((d) => d.value);
  const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
  return `<section class="card">
    <div class="section-head"><h2 class="section-title">${esc(t('monthByMonth'))}</h2>
      <div class="seg small" role="group" aria-label="${esc(t('range'))}">
        <button type="button" class="seg-btn" data-range="6" aria-pressed="${view.range === 6}">6M</button>
        <button type="button" class="seg-btn" data-range="12" aria-pressed="${view.range === 12}">12M</button>
      </div></div>
    <div class="chart-box" data-testid="bar-chart">${barChart(data, { fmtTick: moneyTick, budget: state.settings.budget })}</div>
    <p class="muted small">${esc(t('avgPerMonth', { avg: money(avg), max: money(Math.max(...totals)) }))}</p>
  </section>`;
}

function donutSection(month) {
  const totals = categoryTotals(month);
  const total = monthTotal(month);
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  // At most 7 named slices; the tail folds into "Others".
  const MAX = 7;
  const segs = rows.slice(0, MAX).map(([id, v]) => {
    const c = catById(id);
    return {
      label: catName(c), value: v, color: c.color, tip: `${catName(c)}: ${money(v)} (${formatPct((v / total) * 100)})`,
    };
  });
  const rest = rows.slice(MAX).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) segs.push({
    label: t('others'), value: rest, color: 'var(--muted)', tip: `${t('others')}: ${money(rest)}`,
  });
  const legend = rows.map(([id, v]) => {
    const c = catById(id);
    const b = c.budget;
    return `<tr><td><span class="swatch" style="--c:${esc(c.color)}"></span>${esc(c.icon)} ${esc(catName(c))}</td>
      <td class="num">${esc(money(v))}</td><td class="num muted">${esc(formatPct((v / total) * 100))}</td>
      <td class="num muted small">${b > 0 ? esc(t('pctOfBudget', { pct: Math.round((v / b) * 100) })) : ''}</td></tr>`;
  }).join('');
  return `<section class="card">
    <h2 class="section-title">${esc(t('byCategory'))}</h2>
    ${rows.length ? `<div class="donut-wrap" data-testid="donut">${donutChart(segs, { centerTop: money(total), centerBottom: t('categoriesCount', rows.length) })}</div>
      <table class="table legend-table">${legend}</table>` : `<p class="muted">${esc(t('noExpensesMonth'))}</p>`}
  </section>`;
}

function lineSection(month) {
  const values = dailyTotals(month);
  const isCurrent = month === currentMonth();
  const lastDay = isCurrent ? Number(today().slice(8, 10)) : values.length;
  const total = values.reduce((s, v) => s + v, 0);
  const avg = lastDay ? total / lastDay : 0;
  const tips = values.map((v, i) => `${dayMonth(`${month}-${pad2(i + 1)}`)}: ${money(v)}`);
  const peak = values.slice(0, lastDay).reduce((best, v, i) => (v > best.v ? { v, i } : best), { v: 0, i: -1 });
  return `<section class="card">
    <h2 class="section-title">${esc(t('dailySpending'))}</h2>
    ${total > 0 ? `<div class="chart-box" data-testid="line-chart">${lineChart(values, { fmtTick: moneyTick, tips, avg, lastDay })}</div>
      <p class="muted small">${esc(t('busiestDay', { day: dayMonth(`${month}-${pad2(peak.i + 1)}`), amount: money(peak.v) }))}</p>`
    : `<p class="muted">${esc(t('noExpensesMonth'))}</p>`}
  </section>`;
}

function compareSection(months) {
  const a = view.a; const b = view.b;
  const ta = categoryTotals(a); const tb = categoryTotals(b);
  const totalA = monthTotal(a); const totalB = monthTotal(b);
  const ids = [...new Set([...Object.keys(ta), ...Object.keys(tb)])]
    .sort((x, y) => Math.max(tb[y] || 0, ta[y] || 0) - Math.max(tb[x] || 0, ta[x] || 0));
  const opt = (m, sel) => `<option value="${m}" ${m === sel ? 'selected' : ''}>${esc(monthLabel(m, 'short'))}</option>`;
  const rows = ids.map((id) => {
    const c = catById(id);
    return `<tr><td>${esc(c.icon)} ${esc(catName(c))}</td><td class="num">${esc(money(ta[id] || 0))}</td>
      <td class="num">${esc(money(tb[id] || 0))}</td><td class="num">${deltaHtml(ta[id] || 0, tb[id] || 0)}</td></tr>`;
  }).join('');
  return `<section class="card">
    <h2 class="section-title">${esc(t('compare'))}</h2>
    <div class="compare-pick">
      <select name="a" aria-label="${esc(t('firstMonth'))}">${months.map((m) => opt(m, a)).join('')}</select>
      <span class="muted">${esc(t('vs'))}</span>
      <select name="b" aria-label="${esc(t('secondMonth'))}">${months.map((m) => opt(m, b)).join('')}</select>
    </div>
    <div class="compare-totals">
      <div><span class="muted small">${esc(monthLabel(a, 'short'))}</span><strong data-testid="cmp-a">${esc(money(totalA))}</strong></div>
      <div><span class="muted small">${esc(monthLabel(b, 'short'))}</span><strong data-testid="cmp-b">${esc(money(totalB))}</strong></div>
      <div><span class="muted small">${esc(t('change'))}</span><strong data-testid="cmp-delta">${deltaHtml(totalA, totalB)}</strong></div>
    </div>
    ${rows ? `<div class="table-scroll"><table class="table compare-table">
      <thead><tr><th>${esc(t('category'))}</th><th class="num">${esc(monthShort(a))}</th><th class="num">${esc(monthShort(b))}</th><th class="num">${esc(t('difference'))}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>` : `<p class="muted">${esc(t('noExpensesEither'))}</p>`}
  </section>`;
}

export function render(root) {
  const months = allMonths();
  if (!months.includes(view.month)) view.month = currentMonth();
  if (!view.b || !months.includes(view.b)) view.b = view.month;
  if (!view.a || !months.includes(view.a)) view.a = addMonths(view.b, -1);
  if (!months.includes(view.a)) view.a = months[months.length - 1];

  root.innerHTML = `
    <header class="page-head"><h1>${esc(t('reports'))}</h1>
      <select class="month-select" name="month" aria-label="${esc(t('reportMonth'))}">
        ${months.map((m) => `<option value="${m}" ${m === view.month ? 'selected' : ''}>${esc(monthLabel(m))}</option>`).join('')}
      </select></header>
    ${insights(view.month)}
    ${barSection()}
    ${donutSection(view.month)}
    ${lineSection(view.month)}
    ${compareSection(months)}`;

  root.querySelector('select[name=month]').addEventListener('change', (e) => {
    view.month = e.target.value;
    view.b = view.month;
    view.a = addMonths(view.month, -1);
    render(root);
  });
  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => {
    view.range = Number(b.dataset.range);
    render(root);
  }));
  root.querySelectorAll('.compare-pick select').forEach((s) => s.addEventListener('change', () => {
    view[s.name] = s.value;
    render(root);
  }));
}
