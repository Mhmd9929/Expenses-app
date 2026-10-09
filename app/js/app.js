// App entry: boot, routing, theme, service worker, install prompt.
import * as store from './store.js';
import { parseRoute } from './router.js';
import { initTooltip, toast } from './ui.js';
import * as home from './views/home.js';
import * as add from './views/add.js';
import * as list from './views/list.js';
import * as reports from './views/reports.js';
import * as categories from './views/categories.js';
import * as settings from './views/settings.js';

const ROUTES = {
  home, list, reports, categories, settings, add, edit: add,
};

const viewEl = () => document.getElementById('view');
let current = null;

function render() {
  const route = parseRoute();
  const view = ROUTES[route.name] || home;
  const name = ROUTES[route.name] ? route.name : 'home';
  const changed = current?.name !== name || current?.param !== route.param;
  current = { name, param: route.param, view };
  document.body.dataset.route = name;
  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const el = viewEl();
  view.render(el, route);
  if (changed) {
    window.scrollTo(0, 0);
    el.classList.remove('enter');
    void el.offsetWidth;
    el.classList.add('enter');
  }
}

// ---------- theme ----------

export function applyTheme() {
  const t = store.state.settings.theme;
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
  try { localStorage.setItem('expenses:theme', t); } catch { /* ignore */ }
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#121212' : '#f6f6f3');
}

// ---------- install prompt ----------

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
window.addEventListener('appinstalled', () => { deferredPrompt = null; });

export function installState() {
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return 'installed';
  return deferredPrompt ? 'available' : 'manual';
}
export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  render();
}

// ---------- service worker ----------

let updateRequested = false;

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const offerUpdate = (worker) => {
      toast('A new version is available', {
        action: 'Update', duration: 15000,
        onAction: () => {
          updateRequested = true;
          worker.postMessage({ type: 'SKIP_WAITING' });
        },
      });
    };
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
      });
    });
  }).catch(() => { /* offline support unavailable */ });
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Only reload when the user asked for the update (not on first install).
    if (reloading || !updateRequested) return;
    reloading = true;
    location.reload();
  });
}

// ---------- boot ----------

async function runRecurring() {
  const added = await store.applyRecurring();
  if (added.length) {
    toast(`↻ Added ${added.length} recurring expense${added.length === 1 ? '' : 's'}`);
  }
}

async function boot() {
  try {
    await store.load();
  } catch (err) {
    viewEl().innerHTML = `<div class="empty"><p class="empty-icon">⚠️</p><p>Couldn’t open local storage.</p>
      <p class="muted small">${String(err?.message || err)}. Private browsing modes may block storage.</p></div>`;
    return;
  }
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
  initTooltip();
  window.addEventListener('hashchange', render);
  // Re-render live views when data changes (the entry form manages itself).
  store.subscribe(() => {
    if (current && current.view.live !== false) render();
  });
  if (!location.hash) history.replaceState(null, '', '#/home');
  render();
  await runRecurring();
  // Catch up when the app is resumed on another day.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') runRecurring();
  });
  registerSW();
  document.documentElement.classList.add('ready');
}

boot();
