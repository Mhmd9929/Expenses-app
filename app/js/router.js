// Hash router (works on GitHub Pages sub-paths and offline).

export function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'home', param: parts[1] ? decodeURIComponent(parts[1]) : null, query: new URLSearchParams(query) };
}

let depth = 0; // in-app navigations, so "back" never leaves the app

export function navigate(path, { replace = false } = {}) {
  const url = `#/${path}`;
  if (replace) location.replace(url);
  else { depth += 1; location.hash = url; }
}

export function back(fallback = 'home') {
  if (depth > 0) { depth -= 1; history.back(); } else navigate(fallback, { replace: true });
}
