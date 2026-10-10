// Translations (English / Arabic) and locale helpers.

const en = {
  appName: 'Expenses',
  // tabs
  'tab.home': 'Home', 'tab.list': 'Expenses', 'tab.reports': 'Reports', 'tab.categories': 'Categories', 'tab.settings': 'Settings',
  // common
  today: 'Today', yesterday: 'Yesterday', cancel: 'Cancel', ok: 'OK', save: 'Save', delete: 'Delete', edit: 'Edit', close: 'Close',
  none: 'None', monthly: '↻ Monthly',
  'method.cash': 'Cash', 'method.card': 'Card', 'method.other': 'Other',
  // home
  spentThisMonth: 'Spent this month',
  left: '{amount} left', overBudget: '{amount} over budget', ofBudget: 'of {amount}',
  perDayRest: '{amount} per day for the rest of the month',
  setBudget: 'Set a monthly budget →',
  addExpense: '＋ Add expense', dailyAverage: 'Daily average',
  budgetAlerts: 'Budget alerts', overBudgetShort: 'Over budget', pctUsed: '{pct}% of budget used',
  recent: 'Recent', seeAll: 'See all', swipeHint: 'Tip: swipe left on an expense to edit or delete it.',
  noExpenses: 'No expenses yet.', noExpensesHint: 'Tap “Add expense” to log your first one.',
  // add / edit
  addTitle: 'Add expense', editTitle: 'Edit expense', deleteExpense: 'Delete expense',
  category: 'Category', paymentMethod: 'Payment method', date: 'Date', note: 'Note', optional: 'Optional',
  repeatMonthly: 'Repeat every month', addedByRecurring: '↻ Added by a monthly recurring expense (manage in Settings).',
  saveExpense: 'Save expense', saveChanges: 'Save changes', backspace: 'Backspace',
  enterAmount: 'Enter an amount first', saved: 'Saved {amount} · {category}', updated: 'Updated {amount} · {category}',
  expenseGone: 'That expense no longer exists.', backToList: 'Back to expenses',
  expenseDeleted: 'Expense deleted', undo: 'Undo',
  // budget alerts
  monthlyBudget: 'Monthly budget', budgetExceeded: '{name}: budget exceeded', budget80: '{name}: 80% of budget used',
  badgeOver: '⛔ Over budget', badge80: '⚠️ 80%+ used',
  // list
  allExpenses: 'All expenses', search: 'Search notes, categories, amounts', month: 'Month',
  allMonths: 'All months', allCategories: 'All categories', anyPayment: 'Any payment',
  noMatches: 'No matching expenses.', clearFilters: 'Clear filters',
  expenseCount: (n) => `${n} expense${n === 1 ? '' : 's'}`,
  // reports
  reports: 'Reports', reportMonth: 'Report month',
  biggestCategory: 'Biggest category', biggestIncrease: 'Biggest increase', avgPerDay: 'Average per day',
  projected: 'Projected month-end', monthTotal: 'Month total',
  ofTotal: '{amount} · {pct} of total', noSpending: 'No spending yet',
  vsMonth: '{amount}{pct} vs {month}', newCat: ' (new)', noIncreases: 'No increases vs last month',
  overDaysSoFar: (n) => `over ${n} day${n === 1 ? '' : 's'} so far`, overDays: (n) => `over ${n} days`,
  underBudget: '{amount} under budget', atPace: 'at the current pace',
  monthByMonth: 'Month by month', range: 'Range', budget: 'Budget',
  avgPerMonth: 'Average {avg} per month · highest {max}',
  byCategory: 'By category', categoriesCount: (n) => `${n} categor${n === 1 ? 'y' : 'ies'}`, others: 'Others',
  pctOfBudget: '{pct}% of budget', noExpensesMonth: 'No expenses this month.',
  dailySpending: 'Daily spending', busiestDay: 'Busiest day: {day} ({amount}) · dashed line = daily average', avg: 'avg',
  compare: 'Compare two months', firstMonth: 'First month', secondMonth: 'Second month', vs: 'vs', change: 'Change',
  difference: 'Difference', noExpensesEither: 'No expenses in either month.',
  barAria: 'Monthly totals bar chart', donutAria: 'Category breakdown donut chart', lineAria: 'Daily spending line chart',
  // categories
  categoriesTitle: 'Categories', addCategory: 'Add category', newCategoryBtn: '＋ New category',
  categoriesHint: 'This month’s spending per category. Tap to rename, change icon, color or budget.',
  ofAmount: '{spent} of {budget}', noBudget: '{spent} · no budget',
  newCategory: 'New category', editCategory: 'Edit category', name: 'Name', namePlaceholder: 'e.g. Coffee',
  budgetOptional: 'Monthly budget (optional)', noBudgetPlaceholder: 'No budget', icon: 'Icon', color: 'Color',
  deleteCategory: 'Delete category', deleteCategoryCount: (n) => `Delete category (${n} expense${n === 1 ? '' : 's'})`,
  giveName: 'Give the category a name', nameExists: 'A category with that name already exists',
  added: 'Added “{name}”', categorySaved: 'Category saved', needOneCategory: 'You need at least one category',
  deleteCatTitle: 'Delete “{name}”?', willMove: (n, to) => `${n} expense${n === 1 ? '' : 's'} will be moved to “${to}”.`,
  noCatExpenses: 'This category has no expenses.', deleted: 'Deleted “{name}”',
  // settings
  settings: 'Settings', appearance: 'Appearance', theme: 'Theme', themeAuto: '⚙️ Auto', themeLight: '☀️ Light', themeDark: '🌙 Dark',
  language: 'Language', langAuto: 'Auto',
  currency: 'Currency', currencyExample: 'Example: {amount}. Changing currency only changes how amounts are shown.',
  currencySet: 'Currency set to {code} ({amount})',
  monthlyBudgets: 'Monthly budgets', overallBudget: 'Overall budget', perCategoryBudgets: 'Per-category budgets',
  budgetAlertHint: 'You’ll get an alert when spending passes 80% and 100% of a budget.',
  budgetSaved: 'Budget saved', catBudgetSaved: '{name} budget saved',
  recurring: 'Recurring expenses', add: '＋ Add', everyDay: 'every {day}', paused: 'paused', pause: 'Pause', resume: 'Resume',
  recurringEmpty: 'Rent, subscriptions and other fixed costs can be added automatically every month.',
  editRecurring: 'Edit recurring', newRecurring: 'New recurring expense', amountIn: 'Amount ({currency})',
  payment: 'Payment', dayOfMonth: 'Day of month', recurringNotePlaceholder: 'e.g. Netflix',
  recurringHint: 'Added automatically each month on this day (or the month’s last day).',
  recurringHintNew: 'If this month’s date has already passed, it’s added right away.',
  addRecurring: 'Add recurring expense', enterAmountShort: 'Enter an amount',
  recurringAdded: (n) => `Recurring expense added (${n} entr${n === 1 ? 'y' : 'ies'} created)`, recurringSaved: 'Recurring expense saved',
  deleteRecurringTitle: 'Delete recurring expense?', deleteRecurringMsg: 'Expenses already added stay in your history.',
  recurringDeleted: 'Recurring expense deleted',
  recurringApplied: (n) => `↻ Added ${n} recurring expense${n === 1 ? '' : 's'}`,
  data: 'Data', dataHint: 'Everything is stored only on this device. Back up regularly.',
  exportCsv: '⬇️ Export to CSV', backupJson: '💾 Backup to JSON file', restoreJson: '📂 Restore from JSON', eraseAll: 'Erase all data',
  invalidJson: 'That file isn’t valid JSON', notBackup: 'This file is not an Expenses backup',
  restoreTitle: 'Restore backup?', restoreMsg: (n, d) => `This replaces all current data with ${n} expenses from the backup${d ? ` made on ${d}` : ''}.`,
  restore: 'Restore', restored: (n) => `Restored ${n} expenses`, restoreFailed: 'Restore failed',
  eraseTitle: 'Erase all data?', eraseMsg: 'All expenses, categories, budgets and recurring items will be deleted from this device. This cannot be undone.',
  eraseOk: 'Erase everything', erased: 'All data erased',
  install: 'Install', installed: '✅ Running as an installed app.', installBtn: '📲 Install app',
  installIOS: 'In Safari, tap the Share button <b>⎋</b> then <b>“Add to Home Screen”</b>.',
  installOther: 'Open your browser menu and choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.',
  offlineNote: (n) => `Expenses works fully offline. ${n} expenses stored.`,
  csvHeader: ['Date', 'Amount', 'Currency', 'Category', 'Payment method', 'Note', 'Recurring'], yes: 'yes',
  // app
  newVersion: 'A new version is available', update: 'Update',
  storageError: 'Couldn’t open local storage.', storageHint: 'Private browsing modes may block storage.',
  // default categories
  'cat.food': 'Food', 'cat.groceries': 'Groceries', 'cat.transport': 'Transport', 'cat.fuel': 'Fuel', 'cat.rent': 'Rent',
  'cat.bills': 'Bills & Utilities', 'cat.shopping': 'Shopping', 'cat.health': 'Health', 'cat.entertainment': 'Entertainment',
  'cat.education': 'Education', 'cat.travel': 'Travel', 'cat.other': 'Other',
};

/** Arabic noun forms by count: [one, two, few (3-10), many (11+)]. */
const arCount = (n, [one, two, few, many]) => {
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  return `${n} ${r >= 3 && r <= 10 ? few : many}`;
};

const ar = {
  appName: 'المصروفات',
  'tab.home': 'الرئيسية', 'tab.list': 'المصروفات', 'tab.reports': 'التقارير', 'tab.categories': 'الفئات', 'tab.settings': 'الإعدادات',
  today: 'اليوم', yesterday: 'أمس', cancel: 'إلغاء', ok: 'موافق', save: 'حفظ', delete: 'حذف', edit: 'تعديل', close: 'إغلاق',
  none: 'لا يوجد', monthly: '↻ شهري',
  'method.cash': 'نقدًا', 'method.card': 'بطاقة', 'method.other': 'أخرى',
  spentThisMonth: 'مصروفات هذا الشهر',
  left: 'متبقٍ {amount}', overBudget: 'تجاوزت الميزانية بـ {amount}', ofBudget: 'من {amount}',
  perDayRest: '{amount} يوميًا لبقية الشهر',
  setBudget: 'حدّد ميزانية شهرية ←',
  addExpense: '＋ إضافة مصروف', dailyAverage: 'المتوسط اليومي',
  budgetAlerts: 'تنبيهات الميزانية', overBudgetShort: 'تجاوز الميزانية', pctUsed: 'تم استخدام {pct}% من الميزانية',
  recent: 'الأحدث', seeAll: 'عرض الكل', swipeHint: 'تلميح: اسحب المصروف لتعديله أو حذفه.',
  noExpenses: 'لا توجد مصروفات بعد.', noExpensesHint: 'اضغط «إضافة مصروف» لتسجيل أول مصروف.',
  addTitle: 'إضافة مصروف', editTitle: 'تعديل المصروف', deleteExpense: 'حذف المصروف',
  category: 'الفئة', paymentMethod: 'طريقة الدفع', date: 'التاريخ', note: 'ملاحظة', optional: 'اختياري',
  repeatMonthly: 'تكرار كل شهر', addedByRecurring: '↻ أُضيف تلقائيًا من مصروف شهري متكرر (يمكن إدارته من الإعدادات).',
  saveExpense: 'حفظ المصروف', saveChanges: 'حفظ التغييرات', backspace: 'مسح',
  enterAmount: 'أدخل المبلغ أولًا', saved: 'تم حفظ {amount} · {category}', updated: 'تم تحديث {amount} · {category}',
  expenseGone: 'هذا المصروف لم يعد موجودًا.', backToList: 'العودة إلى المصروفات',
  expenseDeleted: 'تم حذف المصروف', undo: 'تراجع',
  monthlyBudget: 'الميزانية الشهرية', budgetExceeded: '{name}: تم تجاوز الميزانية', budget80: '{name}: تم استخدام 80% من الميزانية',
  badgeOver: '⛔ تجاوز الميزانية', badge80: '⚠️ أكثر من 80%',
  allExpenses: 'كل المصروفات', search: 'ابحث في الملاحظات أو الفئات أو المبالغ', month: 'الشهر',
  allMonths: 'كل الشهور', allCategories: 'كل الفئات', anyPayment: 'أي طريقة دفع',
  noMatches: 'لا توجد مصروفات مطابقة.', clearFilters: 'مسح عوامل التصفية',
  expenseCount: (n) => `عدد المصروفات: ${n}`,
  reports: 'التقارير', reportMonth: 'شهر التقرير',
  biggestCategory: 'أكبر فئة', biggestIncrease: 'أكبر زيادة', avgPerDay: 'المتوسط اليومي',
  projected: 'المتوقع بنهاية الشهر', monthTotal: 'إجمالي الشهر',
  ofTotal: '{amount} · {pct} من الإجمالي', noSpending: 'لا توجد مصروفات بعد',
  vsMonth: '{amount}{pct} مقارنة بـ {month}', newCat: ' (جديدة)', noIncreases: 'لا زيادات مقارنة بالشهر الماضي',
  overDaysSoFar: (n) => `خلال ${arCount(n, ['يوم واحد', 'يومين', 'أيام', 'يومًا'])} حتى الآن`, overDays: (n) => `خلال ${arCount(n, ['يوم واحد', 'يومين', 'أيام', 'يومًا'])}`,
  underBudget: 'أقل من الميزانية بـ {amount}', atPace: 'بالمعدل الحالي',
  monthByMonth: 'شهرًا بشهر', range: 'المدة', budget: 'الميزانية',
  avgPerMonth: 'المتوسط {avg} شهريًا · الأعلى {max}',
  byCategory: 'حسب الفئة', categoriesCount: (n) => arCount(n, ['فئة واحدة', 'فئتان', 'فئات', 'فئة']), others: 'أخرى',
  pctOfBudget: '{pct}% من الميزانية', noExpensesMonth: 'لا توجد مصروفات هذا الشهر.',
  dailySpending: 'الإنفاق اليومي', busiestDay: 'أكثر يوم إنفاقًا: {day} ({amount}) · الخط المتقطع = المتوسط اليومي', avg: 'متوسط',
  compare: 'مقارنة شهرين', firstMonth: 'الشهر الأول', secondMonth: 'الشهر الثاني', vs: 'مقابل', change: 'التغيّر',
  difference: 'الفرق', noExpensesEither: 'لا توجد مصروفات في أي من الشهرين.',
  barAria: 'رسم بياني للإجمالي الشهري', donutAria: 'رسم دائري لتوزيع الفئات', lineAria: 'رسم خطي للإنفاق اليومي',
  categoriesTitle: 'الفئات', addCategory: 'إضافة فئة', newCategoryBtn: '＋ فئة جديدة',
  categoriesHint: 'إنفاق هذا الشهر لكل فئة. اضغط لتغيير الاسم أو الأيقونة أو اللون أو الميزانية.',
  ofAmount: '{spent} من {budget}', noBudget: '{spent} · بدون ميزانية',
  newCategory: 'فئة جديدة', editCategory: 'تعديل الفئة', name: 'الاسم', namePlaceholder: 'مثال: قهوة',
  budgetOptional: 'الميزانية الشهرية (اختياري)', noBudgetPlaceholder: 'بدون ميزانية', icon: 'الأيقونة', color: 'اللون',
  deleteCategory: 'حذف الفئة', deleteCategoryCount: (n) => `حذف الفئة (${n} مصروفات)`,
  giveName: 'أدخل اسمًا للفئة', nameExists: 'توجد فئة بهذا الاسم بالفعل',
  added: 'تمت إضافة «{name}»', categorySaved: 'تم حفظ الفئة', needOneCategory: 'يجب وجود فئة واحدة على الأقل',
  deleteCatTitle: 'حذف «{name}»؟', willMove: (n, to) => `سيتم نقل ${n} من المصروفات إلى «${to}».`,
  noCatExpenses: 'لا توجد مصروفات في هذه الفئة.', deleted: 'تم حذف «{name}»',
  settings: 'الإعدادات', appearance: 'المظهر', theme: 'السمة', themeAuto: '⚙️ تلقائي', themeLight: '☀️ فاتح', themeDark: '🌙 داكن',
  language: 'اللغة', langAuto: 'تلقائي',
  currency: 'العملة', currencyExample: 'مثال: {amount}. تغيير العملة يغيّر طريقة عرض المبالغ فقط.',
  currencySet: 'تم تعيين العملة إلى {code} ({amount})',
  monthlyBudgets: 'الميزانيات الشهرية', overallBudget: 'الميزانية الإجمالية', perCategoryBudgets: 'ميزانية لكل فئة',
  budgetAlertHint: 'ستصلك تنبيهات عند تجاوز الإنفاق 80% و100% من الميزانية.',
  budgetSaved: 'تم حفظ الميزانية', catBudgetSaved: 'تم حفظ ميزانية {name}',
  recurring: 'المصروفات المتكررة', add: '＋ إضافة', everyDay: 'يوم {day} من كل شهر', paused: 'متوقف', pause: 'إيقاف مؤقت', resume: 'استئناف',
  recurringEmpty: 'يمكن إضافة الإيجار والاشتراكات والتكاليف الثابتة تلقائيًا كل شهر.',
  editRecurring: 'تعديل المصروف المتكرر', newRecurring: 'مصروف متكرر جديد', amountIn: 'المبلغ ({currency})',
  payment: 'الدفع', dayOfMonth: 'يوم الشهر', recurringNotePlaceholder: 'مثال: نتفليكس',
  recurringHint: 'يُضاف تلقائيًا كل شهر في هذا اليوم (أو آخر يوم في الشهر).',
  recurringHintNew: 'إذا كان تاريخ هذا الشهر قد مضى، فسيُضاف فورًا.',
  addRecurring: 'إضافة مصروف متكرر', enterAmountShort: 'أدخل المبلغ',
  recurringAdded: (n) => `تمت إضافة المصروف المتكرر (أُنشئ ${n})`, recurringSaved: 'تم حفظ المصروف المتكرر',
  deleteRecurringTitle: 'حذف المصروف المتكرر؟', deleteRecurringMsg: 'المصروفات المضافة سابقًا ستبقى في السجل.',
  recurringDeleted: 'تم حذف المصروف المتكرر',
  recurringApplied: (n) => `↻ تمت إضافة ${n} من المصروفات المتكررة`,
  data: 'البيانات', dataHint: 'كل البيانات محفوظة على هذا الجهاز فقط. احتفظ بنسخة احتياطية بانتظام.',
  exportCsv: '⬇️ تصدير إلى CSV', backupJson: '💾 نسخة احتياطية (JSON)', restoreJson: '📂 استعادة من JSON', eraseAll: 'مسح كل البيانات',
  invalidJson: 'هذا الملف ليس بصيغة JSON صالحة', notBackup: 'هذا الملف ليس نسخة احتياطية من التطبيق',
  restoreTitle: 'استعادة النسخة الاحتياطية؟', restoreMsg: (n, d) => `سيتم استبدال كل البيانات الحالية بـ ${n} من المصروفات من النسخة الاحتياطية${d ? ` بتاريخ ${d}` : ''}.`,
  restore: 'استعادة', restored: (n) => `تمت استعادة ${n} من المصروفات`, restoreFailed: 'فشلت الاستعادة',
  eraseTitle: 'مسح كل البيانات؟', eraseMsg: 'سيتم حذف كل المصروفات والفئات والميزانيات والمصروفات المتكررة من هذا الجهاز. لا يمكن التراجع عن ذلك.',
  eraseOk: 'مسح الكل', erased: 'تم مسح كل البيانات',
  install: 'التثبيت', installed: '✅ التطبيق مثبّت.', installBtn: '📲 تثبيت التطبيق',
  installIOS: 'في Safari، اضغط زر المشاركة <b>⎋</b> ثم <b>«إضافة إلى الشاشة الرئيسية»</b>.',
  installOther: 'افتح قائمة المتصفح واختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.',
  offlineNote: (n) => `يعمل التطبيق بالكامل دون إنترنت. عدد المصروفات المحفوظة: ${n}.`,
  csvHeader: ['التاريخ', 'المبلغ', 'العملة', 'الفئة', 'طريقة الدفع', 'ملاحظة', 'متكرر'], yes: 'نعم',
  newVersion: 'يتوفر إصدار جديد', update: 'تحديث',
  storageError: 'تعذّر فتح التخزين المحلي.', storageHint: 'قد يمنع وضع التصفح الخاص التخزين.',
  'cat.food': 'طعام', 'cat.groceries': 'بقالة', 'cat.transport': 'مواصلات', 'cat.fuel': 'وقود', 'cat.rent': 'إيجار',
  'cat.bills': 'فواتير ومرافق', 'cat.shopping': 'تسوق', 'cat.health': 'صحة', 'cat.entertainment': 'ترفيه',
  'cat.education': 'تعليم', 'cat.travel': 'سفر', 'cat.other': 'أخرى',
};

export const LANGUAGES = { en, ar };
let lang = (() => {
  try {
    const saved = localStorage.getItem('expenses:lang');
    if (saved === 'en' || saved === 'ar') return saved;
  } catch { /* ignore */ }
  return /^ar\b/i.test(navigator.language || '') ? 'ar' : 'en';
})();

/** Resolve a language setting ('auto' | 'en' | 'ar') to a supported language. */
export function resolveLang(setting) {
  if (setting === 'en' || setting === 'ar') return setting;
  return /^ar\b/i.test(navigator.language || '') ? 'ar' : 'en';
}

export function setLang(setting) {
  lang = resolveLang(setting);
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  try { localStorage.setItem('expenses:lang', lang); } catch { /* ignore */ }
  return lang;
}

export const getLang = () => lang;
export const isRTL = () => lang === 'ar';

/** Locale for Intl formatting. Arabic keeps Western digits to match the keypad. */
export function locale() {
  if (lang === 'ar') return 'ar-u-nu-latn';
  const nav = navigator.language || 'en';
  if (/^ar\b/i.test(nav)) return 'en';
  try {
    return Intl.getCanonicalLocales(nav)[0];
  } catch {
    return 'en'; // e.g. "en-US@posix" from some environments
  }
}

/**
 * Translate a key. String values interpolate {name} placeholders from `vars`;
 * function values are called with the remaining arguments.
 */
export function t(key, ...args) {
  const v = LANGUAGES[lang][key] ?? en[key] ?? key;
  if (typeof v === 'function') return v(...args);
  if (Array.isArray(v)) return v;
  const vars = args[0];
  return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : v;
}

/**
 * Display name for a category: built-in categories that still have their
 * original English name are shown translated.
 */
export function catName(c) {
  if (!c) return '';
  const key = `cat.${c.id}`;
  if (en[key] && c.name === en[key]) return t(key);
  return c.name;
}
