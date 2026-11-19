// Register closeouts against bank deposits for physical stores.
import { exportProfile, round2, str, num, isoDate, daysBetween, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CLOSEOUT_PROFILES = Object.freeze([
  exportProfile('square_cash_drawers', { date: ['Date', 'Ended'], store: ['Location', 'Store'], register: 'Drawer', cashier: ['Employee', 'Closed By'], expected_cash: ['Expected Cash', 'Expected In Drawer'], counted_cash: ['Actual Cash', 'Actual In Drawer'], float: ['Starting Cash', 'Starting Cash Amount'] }),
  exportProfile('shopify_pos_cash', { date: ['Closed at', 'Date'], store: 'Location', register: 'Session', cashier: ['Closed by', 'Staff'], expected_cash: 'Expected cash', counted_cash: 'Counted cash', float: ['Opening float', 'Opening cash'] }),
]);
export const CLOSEOUT_FIELDS = Object.freeze({
  date: t(['Date', 'Business Date', 'Closed At'], { type: 'date', required: true }),
  store: t(['Store', 'Location', 'Site'], { required: true }),
  register: t(['Register', 'Drawer', 'Terminal']),
  cashier: t(['Cashier', 'Employee', 'Closed By'], { pii: 'staff' }),
  expected_cash: t(['Expected Cash', 'Expected', 'Expected In Drawer'], { type: 'money', required: true }),
  counted_cash: t(['Counted Cash', 'Counted', 'Actual Cash'], { type: 'money', required: true }),
  float: t(['Float', 'Starting Cash', 'Opening Float'], { type: 'money' }),
});
export const DEPOSIT_FIELDS = Object.freeze({ date: t(['Date', 'Deposit Date', 'Posted Date'], { type: 'date', required: true }), store: t(['Store', 'Location', 'Account']), amount: t(['Amount', 'Deposit', 'Credit'], { type: 'money', required: true }), reference: t(['Reference', 'Memo', 'Slip']) });
export const CASH_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    tolerance: { type: 'number', minimum: 0, description: 'Over or short up to this amount per drawer is accepted (default 2.00)' },
    repeat_min: { type: 'integer', minimum: 2, maximum: 50, description: 'Shortages by one cashier in the period before they are listed (default 3)' },
    deposit_days: { type: 'integer', minimum: 0, maximum: 14, description: 'Days after the closeout for the deposit to reach the bank (default 2)' },
  },
});

/** Statuses: chase (deposit), review (over/short, repeats), ok. */
export function checkCash(closeouts, deposits, s = {}) {
  const tol = s.tolerance ?? 2; const rep = s.repeat_min ?? 3; const lag = s.deposit_days ?? 2;
  // Day numbers and two indexes (store + amount in cents; store sorted by day), so matching stays fast at 10,000 rows.
  const dayNo = (d) => (d ? Math.round(Date.parse(`${d}T00:00:00Z`) / 86400000) : NaN);
  const cents = (v) => Math.round(v * 100);
  const deps = sortBy(deposits.map((d, i) => ({ date: isoDate(d.date), store: str(d.store).toLowerCase(), amount: round2(num(d.amount) || 0), ref: str(d.reference), used: false, id: `${isoDate(d.date)}|${str(d.store)}|${num(d.amount)}|${i}` })).map((d) => ({ ...d, dn: dayNo(d.date) })), (d) => `${d.date}|${d.id}`);
  const byAmount = new Map(); const byStore = new Map();
  for (const d of deps) { for (const k of [`${d.store}|${cents(d.amount)}`, `${d.store}|${cents(d.amount) - 1}`, `${d.store}|${cents(d.amount) + 1}`]) (byAmount.get(k) || byAmount.set(k, []).get(k)).push(d); (byStore.get(d.store) || byStore.set(d.store, []).get(d.store)).push(d); }
  const cos = sortBy(closeouts.map((c) => ({ ...c, id: `${isoDate(c.date)}|${str(c.store)}|${str(c.register)}` })));
  const due = (c) => round2((num(c.counted_cash) || 0) - (num(c.float) || 0));
  const inWin = (c, d) => { const cd = dayNo(isoDate(c.date)); return d.dn >= cd && d.dn - cd <= lag; };
  const match = new Map();
  for (const c of cos) { const d = (byAmount.get(`${str(c.store).toLowerCase()}|${cents(due(c))}`) || []).find((x) => !x.used && inWin(c, x) && Math.abs(x.amount - due(c)) <= 0.01); if (d) { d.used = true; match.set(c.id, d); } }
  for (const c of cos) if (!match.has(c.id)) {
    const list = byStore.get(str(c.store).toLowerCase()) || []; const cd = dayNo(isoDate(c.date)); let lo = 0, hi = list.length; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].dn < cd) lo = m + 1; else hi = m; }
    let best = null; for (let i = lo; i < list.length && list[i].dn - cd <= lag; i++) { const x = list[i]; if (x.used) continue; if (!best || Math.abs(x.amount - due(c)) < Math.abs(best.amount - due(c)) || (Math.abs(x.amount - due(c)) === Math.abs(best.amount - due(c)) && x.id < best.id)) best = x; }
    if (best) { best.used = true; match.set(c.id, best); }
  }
  const items = []; const shortBy = new Map();
  for (const c of cos) {
    const diff = round2((num(c.counted_cash) || 0) - (num(c.expected_cash) || 0)); const f = []; let status = 'ok'; const d = match.get(c.id); const want = due(c);
    if (Math.abs(diff) > tol) { f.push(finding(diff < 0 ? 'drawer_short' : 'drawer_over', Math.abs(diff), `${c.store} ${c.register} on ${isoDate(c.date)} counted ${num(c.counted_cash)} against ${num(c.expected_cash)} expected (${diff}).`)); status = 'review'; }
    if (diff < -tol && str(c.cashier)) { const k = str(c.cashier); shortBy.set(k, [...(shortBy.get(k) || []), { date: isoDate(c.date), store: str(c.store), diff }]); }
    if (!d) { f.push(finding('deposit_missing', want, `No deposit of ${want} from ${c.store} within ${lag} day(s) of ${isoDate(c.date)}.`)); status = 'chase'; }
    else if (Math.abs(d.amount - want) > 0.01) { f.push(finding('deposit_differs', want - d.amount, `${c.store} ${isoDate(c.date)}: ${want} should have been deposited; the bank shows ${d.amount} on ${d.date}.`)); status = 'chase'; }
    items.push({ id: c.id, kind: 'closeout', date: isoDate(c.date), store: str(c.store), register: str(c.register), cashier: str(c.cashier), expected: round2(num(c.expected_cash) || 0), counted: round2(num(c.counted_cash) || 0), over_short: diff, deposit_due: want, deposited: d ? d.amount : null, status, findings: f });
  }
  for (const [k, list] of [...shortBy.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) if (list.length >= rep) items.push({ id: `STAFF:${items.length}`, kind: 'cashier', date: null, store: [...new Set(list.map((x) => x.store))].join(', '), register: '', cashier: k, expected: 0, counted: 0, over_short: round2(list.reduce((a, x) => a + x.diff, 0)), deposit_due: 0, deposited: null, status: 'review', findings: [finding('repeat_shortages', null, `${k} closed ${list.length} drawer(s) short (${list.map((x) => x.date).join(', ')}). Look at the drawers and the process before anything else.`)] });
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`).map((i, n) => (i.kind === 'cashier' ? { ...i, id: `CASHIER-${String(n).padStart(2, '0')}` } : i));
  const co = sorted.filter((i) => i.kind === 'closeout');
  return { closeouts: co.length, short: round2(-co.filter((i) => i.over_short < -tol).reduce((a, i) => a + i.over_short, 0)), over: round2(co.filter((i) => i.over_short > tol).reduce((a, i) => a + i.over_short, 0)), deposit_gap: round2(co.flatMap((i) => i.findings).filter((f) => /deposit/.test(f.code)).reduce((a, f) => a + (f.amount || 0), 0)), ...byStatus(sorted, ['chase', 'review', 'ok']), by_store: rollup(co, (i) => i.store, ['over_short', 'deposit_due']).map(({ key, ...v }) => ({ store: key, ...v })), by_register: rollup(co, (i) => `${i.store} ${i.register}`, ['over_short']).map(({ key, ...v }) => ({ register: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function noteText(items, { store }) {
  const rows = items.filter((i) => i.status !== 'ok' && (!store || i.store.toLowerCase().includes(String(store).toLowerCase())));
  return { lines: rows.map((i) => i.id), text: [`# Cash review${store ? `: ${store}` : ''}`, '', '**To:** [TO CONFIRM store manager]', '**From:** [TO CONFIRM your name]', '', 'Please look at the drawers and deposits below and note what you find.', '', '| Date | Register | Cashier | Over/short | Deposit due | Deposited | Detail | Note |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.date || ''} | ${i.register} | ${i.cashier} | ${i.over_short} | ${i.deposit_due} | ${i.deposited ?? ''} | ${i.findings.map((f) => f.detail).join(' ')} | [CHECK manager note] |`)].join('\n') };
}
