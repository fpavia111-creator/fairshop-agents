// Shrink by store and category from inventory adjustments and sales.
import { exportProfile, round2, str, num, skuKey, finding, byFinding, byStatus, sortBy, pct } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const ADJ_PROFILES = Object.freeze([exportProfile('square_inventory_history', { date: 'Date', store: 'Location', sku: 'SKU', category: ['Category', 'Item'], qty: ['Adjustment', 'Quantity'], unit_cost: ['Unit Cost', 'Default Unit Cost'], reason: 'Reason', counted_by: ['Employee', 'Team Member'] })]);
export const ADJ_FIELDS = Object.freeze({
  date: t(['Date', 'Adjusted At'], { type: 'date' }),
  store: t(['Store', 'Location', 'Site'], { required: true }),
  sku: t(['SKU', 'Item SKU'], { required: true }),
  category: t(['Category', 'Department']),
  qty: t(['Quantity', 'Adjustment', 'Qty Change'], { type: 'number', required: true }),
  unit_cost: t(['Unit Cost', 'Cost'], { type: 'money' }),
  reason: t(['Reason', 'Adjustment Reason']),
  counted_by: t(['Counted By', 'Employee', 'User'], { pii: 'staff' }),
});
export const SALES_FIELDS = Object.freeze({ store: t(['Store', 'Location'], { required: true }), category: t(['Category', 'Department']), net_sales: t(['Net Sales', 'Sales', 'Revenue'], { type: 'money', required: true }) });
export const SHRINK_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    target_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Shrink as a percent of sales above which a store is listed (default 1.5)' },
    unexplained_reasons: { type: 'array', items: { type: 'string' }, description: 'Reasons that explain nothing (default unknown, count correction, adjustment, blank)' },
    unexplained_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Share of a store\'s losses with an unexplained reason above which it is listed (default 50)' },
    repeat_min: { type: 'integer', minimum: 2, maximum: 50, description: 'Write-offs of one SKU in one store before it is listed (default 3)' },
  },
});

/** Statuses: review, ok. Items: one per store, plus SKUs written off again and again. */
export function shrinkByStore(adjs, sales, s = {}) {
  const target = s.target_pct ?? 1.5; const unex = (s.unexplained_reasons || ['unknown', 'count correction', 'adjustment', '']).map((x) => x.toLowerCase()); const unexPct = s.unexplained_pct ?? 50; const rep = s.repeat_min ?? 3;
  const sold = new Map(); const soldCat = new Map(); for (const r of sales) { const k = str(r.store); sold.set(k, round2((sold.get(k) || 0) + (num(r.net_sales) || 0))); const c = `${k}|${str(r.category)}`; soldCat.set(c, round2((soldCat.get(c) || 0) + (num(r.net_sales) || 0))); }
  const st = new Map(); const sku = new Map(); const cat = new Map(); const reasons = new Map();
  for (const a of adjs) {
    const store = str(a.store); const v = round2(-(num(a.qty) || 0) * (num(a.unit_cost) || 0)); const r = str(a.reason); const x = st.get(store) || { shrink: 0, lost: 0, unexplained: 0 };
    x.shrink = round2(x.shrink + v); if (v > 0) { x.lost = round2(x.lost + v); if (unex.includes(r.toLowerCase())) x.unexplained = round2(x.unexplained + v); const k = `${store}|${skuKey(a.sku)}`; const y = sku.get(k) || { n: 0, v: 0 }; y.n++; y.v = round2(y.v + v); sku.set(k, y); }
    st.set(store, x); const ck = `${store}|${str(a.category)}`; cat.set(ck, round2((cat.get(ck) || 0) + v)); const rk = r || '(none)'; reasons.set(rk, round2((reasons.get(rk) || 0) + v));
  }
  const items = [];
  for (const [store, x] of [...st.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const sales = sold.get(store) ?? null; const rate = sales ? pct(x.shrink, sales) : null; const share = x.lost ? pct(x.unexplained, x.lost) : 0; const f = [];
    if (rate !== null && rate > target) f.push(finding('shrink_above_target', round2(x.shrink - sales * target / 100), `${store}: shrink ${x.shrink} is ${rate}% of ${sales} in sales; your target is ${target}%.`));
    if (rate === null) f.push(finding('no_sales_figure', null, `${store}: no sales in the sales file, so shrink cannot be put against sales.`));
    if (share > unexPct) f.push(finding('unexplained_high', null, `${store}: ${share}% of losses (${x.unexplained} of ${x.lost}) have no explaining reason.`));
    items.push({ id: `STORE:${store}`, kind: 'store', store, sku: '', sales, shrink: x.shrink, shrink_pct: rate, unexplained_pct: share, writeoffs: 0, status: f.length ? 'review' : 'ok', findings: f });
  }
  for (const [k, y] of [...sku.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) if (y.n >= rep) { const [store, s2] = k.split('|'); items.push({ id: `SKU:${store}|${s2}`, kind: 'sku', store, sku: s2, sales: null, shrink: y.v, shrink_pct: null, unexplained_pct: null, writeoffs: y.n, status: 'review', findings: [finding('repeat_sku', y.v, `${s2} was written off ${y.n} times at ${store} (${y.v}). Check where it is kept and how it is counted.`)] }); }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`); const stores = sorted.filter((i) => i.kind === 'store');
  const totalSales = round2([...sold.values()].reduce((a, b) => a + b, 0)); const total = round2(stores.reduce((a, i) => a + i.shrink, 0));
  return { stores: stores.length, shrink: total, sales: totalSales, shrink_pct: totalSales ? pct(total, totalSales) : null, ...byStatus(sorted, ['review', 'ok']), by_category: [...cat.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => { const [store, category] = k.split('|'); const sl = soldCat.get(k) ?? null; return { store, category, shrink: v, sales: sl, shrink_pct: sl ? pct(v, sl) : null }; }), by_reason: [...reasons.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([reason, shrink]) => ({ reason, shrink })), by_finding: byFinding(sorted), items: sorted };
}

export function reviewText(r) {
  const rows = r.items.filter((i) => i.status === 'review');
  return { items: rows.map((i) => i.id), text: ['# Shrink review', '', '**To:** [TO CONFIRM loss-prevention or operations lead]', '**From:** [TO CONFIRM your name]', '', `Shrink across ${r.stores} store(s) is ${r.shrink} (${r.shrink_pct}% of sales).`, '', '| Store | SKU | Shrink | % of sales | Detail | Next step |', '| --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.store} | ${i.sku} | ${i.shrink} | ${i.shrink_pct ?? ''} | ${i.findings.map((f) => f.detail).join(' ')} | [CHECK recount / move / process] |`)].join('\n') };
}
