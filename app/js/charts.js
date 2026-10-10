// Dependency-free SVG charts. Each function returns an SVG string.
// Hit targets carry data-tip so the app's shared tooltip can show values on hover/tap.
import { esc } from './utils.js';
import { t } from './i18n.js';

function niceMax(v, ticks = 4) {
  if (!(v > 0)) return { max: 1, step: 0.25 };
  const raw = v / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return { max: step * Math.ceil(v / step), step };
}

/** Bar path with 4px rounded top, square at the baseline. */
function barPath(x, y, w, h, r = 4) {
  if (h <= 0) return '';
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function yAxis({ max, step }, W, padL, padR, top, plotH, fmtTick) {
  let out = '';
  for (let v = 0; v <= max + step / 2; v += step) {
    const y = top + plotH - (v / max) * plotH;
    out += `<line class="grid${v === 0 ? ' base' : ''}" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`;
    out += `<text class="tick" x="${padL - 6}" y="${y + 3.5}" text-anchor="end">${esc(fmtTick(v))}</text>`;
  }
  return out;
}

/**
 * Vertical bar chart.
 * data: [{ label, value, tip, highlight }]
 */
export function barChart(data, { fmtTick, budget = null, height = 190 } = {}) {
  const W = 340; const H = height; const padL = 44; const padR = 8; const top = 18; const bottom = 22;
  const plotW = W - padL - padR; const plotH = H - top - bottom;
  const peak = Math.max(...data.map((d) => d.value), budget || 0);
  const scale = niceMax(peak);
  const slot = plotW / data.length;
  const bw = Math.min(28, slot * 0.62);
  let bars = ''; let labels = ''; let hits = '';
  data.forEach((d, i) => {
    const h = (d.value / scale.max) * plotH;
    const x = padL + i * slot + (slot - bw) / 2;
    const y = top + plotH - h;
    bars += `<path class="bar${d.highlight ? ' hl' : ''}" d="${barPath(x, y, bw, h)}"/>`;
    labels += `<text class="tick${d.highlight ? ' strong' : ''}" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
    if (d.highlight && d.value > 0) {
      labels += `<text class="vlabel" x="${x + bw / 2}" y="${y - 5}" text-anchor="middle">${esc(fmtTick(d.value))}</text>`;
    }
    hits += `<rect class="hit" x="${padL + i * slot}" y="${top}" width="${slot}" height="${plotH}" data-tip="${esc(d.tip)}"/>`;
  });
  let budgetLine = '';
  if (budget > 0) {
    const y = top + plotH - (budget / scale.max) * plotH;
    budgetLine = `<line class="budget-line" x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}"/>`
      + `<text class="tick" x="${W - padR}" y="${y - 4}" text-anchor="end">${esc(t('budget'))}</text>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('barAria'))}">
    ${yAxis(scale, W, padL, padR, top, plotH, fmtTick)}${bars}${budgetLine}${labels}${hits}</svg>`;
}

function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0); const [x1, y1] = p(a1);
  return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
}

/**
 * Donut chart. segments: [{ label, value, color, tip }]
 */
export function donutChart(segments, { centerTop = '', centerBottom = '' } = {}) {
  const S = 200; const c = S / 2; const r = 74; const sw = 26;
  const total = segments.reduce((s, x) => s + x.value, 0);
  let paths = '';
  if (total > 0) {
    const visible = segments.filter((s) => s.value > 0);
    if (visible.length === 1) {
      const s = visible[0];
      paths = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" data-tip="${esc(s.tip)}"/>`;
    } else {
      let a = 0;
      for (const s of visible) {
        const span = (s.value / total) * Math.PI * 2;
        // 2px surface gap between segments.
        const gap = Math.min(0.012 * 2, span / 3);
        paths += `<path d="${arc(c, c, r, a + gap / 2, a + span - gap / 2)}" fill="none" stroke="${s.color}" stroke-width="${sw}" data-tip="${esc(s.tip)}"/>`;
        a += span;
      }
    }
  } else {
    paths = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" class="empty-ring" stroke-width="${sw}"/>`;
  }
  return `<svg class="chart donut" viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(t('donutAria'))}">
    ${paths}
    <text class="donut-top" x="${c}" y="${c - 4}" text-anchor="middle">${esc(centerTop)}</text>
    <text class="donut-bottom" x="${c}" y="${c + 16}" text-anchor="middle">${esc(centerBottom)}</text>
  </svg>`;
}

/**
 * Line chart for daily spending. values: number[] (index = day-1).
 * opts.tips: string[]; opts.avg: number (dashed reference); opts.lastDay: draw line only up to this day.
 */
export function lineChart(values, { fmtTick, tips = [], avg = null, lastDay = values.length, height = 180 } = {}) {
  const W = 340; const H = height; const padL = 44; const padR = 10; const top = 14; const bottom = 22;
  const plotW = W - padL - padR; const plotH = H - top - bottom;
  const n = values.length;
  const scale = niceMax(Math.max(...values, avg || 0));
  const x = (i) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v) => top + plotH - (v / scale.max) * plotH;
  const shown = values.slice(0, Math.max(1, lastDay));
  const pts = shown.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `<path class="line" d="M${pts.join('L')}"/>`;
  const area = `<path class="area" d="M${x(0)},${y(0)}L${pts.join('L')}L${x(shown.length - 1)},${y(0)}Z"/>`;
  let ticks = '';
  const tickDays = [1, 8, 15, 22, n];
  tickDays.forEach((d) => {
    ticks += `<text class="tick" x="${x(d - 1)}" y="${H - 6}" text-anchor="middle">${d}</text>`;
  });
  let avgLine = '';
  if (avg > 0) {
    avgLine = `<line class="avg-line" x1="${padL}" x2="${W - padR}" y1="${y(avg)}" y2="${y(avg)}"/>`
      + `<text class="tick" x="${W - padR}" y="${y(avg) - 4}" text-anchor="end">${esc(t('avg'))}</text>`;
  }
  let hits = '';
  const slot = plotW / Math.max(1, n - 1);
  for (let i = 0; i < shown.length; i++) {
    hits += `<g class="pt"><line class="xhair" x1="${x(i)}" x2="${x(i)}" y1="${top}" y2="${top + plotH}"/>`
      + `<circle class="dot" cx="${x(i)}" cy="${y(shown[i])}" r="4"/>`
      + `<rect class="hit" x="${x(i) - slot / 2}" y="${top}" width="${slot}" height="${plotH}" data-tip="${esc(tips[i] || '')}"/></g>`;
  }
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('lineAria'))}">
    ${yAxis(scale, W, padL, padR, top, plotH, fmtTick)}${area}${avgLine}${line}${ticks}${hits}</svg>`;
}
