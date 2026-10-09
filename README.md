# Expenses

A mobile-first Progressive Web App for tracking personal monthly expenses.
It installs to the home screen on iPhone and Android and works fully offline.
All data stays on your device in IndexedDB, so there's no backend and no login.

**App URL:** https://mhmd9929.github.io/Expenses-app/
(The link works after GitHub Pages is enabled; see below.)

## Features

- **Home**: this month's total, remaining budget, a big "Add expense" button, budget alerts and recent expenses.
- **Fast entry**: an on-screen amount keypad, category chips, Cash/Card/Other, and a date that defaults to today, plus an optional note and an optional "Repeat every month".
- **Edit or delete**: tap an expense to edit it, or swipe left to show Edit and Delete. Delete has an Undo.
- **Expenses list**: filter by month, category and payment method; search notes, categories and amounts. Results are grouped by day with totals.
- **Reports**:
  - a month-by-month bar chart (last 6 or 12 months, with a budget line)
  - compare any two months side by side (totals, difference per category, % change)
  - a category donut chart for the selected month
  - a daily spending line chart
  - insights: biggest category, biggest increase vs last month, average daily spend and projected month-end total
- **Categories**: 12 defaults (Food, Groceries, Transport, Fuel, Rent, Bills & Utilities, Shopping, Health, Entertainment, Education, Travel, Other) with icons and colors. You can add, rename, recolor and delete them; a deleted category's expenses move to "Other".
- **Settings**: currency (shown on all amounts), overall and per-category monthly budgets, auto/light/dark theme, recurring expenses, CSV export, JSON backup and restore, and erase all data.
- **Recurring expenses**: rent, subscriptions and similar costs are added automatically each month. Months missed while the app was closed are caught up next time you open it.
- **Budget alerts**: a notice appears when a category or the overall budget passes 80% and again at 100%. Categories over 80% are also flagged on Home.

## Project layout

```
app/                    ← the deployed static site (no build step)
  index.html
  manifest.webmanifest
  sw.js                 ← service worker (offline cache)
  css/styles.css
  js/                   ← ES modules: store (IndexedDB), charts (SVG), views/*
  icons/                ← PNG + SVG icons (regenerate: npm run icons)
tests/e2e.mjs           ← Playwright end-to-end tests of the core flows
.github/workflows/deploy.yml
```

## Enable GitHub Pages (one-time)

1. Merge this code into the `main` branch on GitHub.
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open the **Actions** tab. The **Test & deploy to GitHub Pages** workflow runs on every push to `main`. You can also start it with **Run workflow**. It runs the tests, then publishes the `app/` folder.
5. When it finishes, the app is live at **https://mhmd9929.github.io/Expenses-app/**.

Each deploy stamps the service worker with the commit hash. When an installed app sees a new version, it shows an **"Update"** button.

## Add to Home Screen

### iPhone / iPad (Safari)
1. Open https://mhmd9929.github.io/Expenses-app/ in **Safari** (other iOS browsers also work on iOS 16.4+).
2. Tap the **Share** button (the square with an up arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Launch **Expenses** from the home screen. It opens full screen and works offline.

### Android (Chrome)
1. Open https://mhmd9929.github.io/Expenses-app/ in **Chrome**.
2. Tap **Install app** if a banner appears. Otherwise open the **⋮** menu and choose **Install app** (or **Add to Home screen**).
3. Confirm with **Install**. You can also use **Settings → Install app** inside Expenses.

> Your data lives only in that browser or installed app on that device.
> Use **Settings → Backup to JSON file** regularly, and **Restore from JSON** to move your data to another phone.
> Note: on iPhone the installed app and Safari keep separate storage.

## Run locally

```bash
npm install
npm start            # http://localhost:8080
npm test             # end-to-end tests (Playwright + Chromium)
```

You can also serve the `app/` folder with any static file server. Service workers need `http://localhost` or HTTPS.
