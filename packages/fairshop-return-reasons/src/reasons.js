// Return reasons by SKU and by customer: pure functions over returns and order lines.
import { round2, str, num, skuKey, emailKey, sha256, finding, byFinding, byStatus, sortBy, pct } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const RETURN_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Order Number'], { required: true }),
  sku: t(['SKU', 'Item SKU', 'Lineitem sku'], { required: true }),
  return_date: t(['Return Date', 'Returned At', 'Date'], { type: 'date' }),
  reason: t(['Reason', 'Return Reason', 'Customer Reason']),
  qty: t(['Quantity', 'Qty', 'Units'], { type: 'number' }),
  customer_email: t(['Customer Email', 'Email', 'Buyer Email'], { pii: 'email' }),
  customer_name: t(['Customer Name', 'Customer', 'Buyer Name'], { pii: 'name' }),
});
export const ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name'], { required: true }),
  sku: t(['SKU', 'Lineitem sku'], { required: true }),
  qty: t(['Quantity', 'Qty', 'Lineitem quantity'], { type: 'number' }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date' }),
  customer_email: t(['Customer Email', 'Email'], { pii: 'email' }),
});
export const REASON_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    sku_min_units: { type: 'integer', minimum: 1, description: 'A SKU needs this many units sold before its return rate is judged (default 10)' },
    sku_rate_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Return rate (units) at or above which a SKU is listed (default 15)' },
    returner_min_returns: { type: 'integer', minimum: 1, description: 'Returned orders before a customer is listed (default 3)' },
    returner_rate_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Share of a customer\'s orders returned at or above which they are listed (default 50)' },
    groups: { type: 'object', additionalProperties: { type: 'string' }, description: 'Your own reason wording → group (listing, size, quality, fulfillment, customer, other)' },
  },
});

const GROUPS = [[/not as (described|pictured)|different from|description|colou?r|looks different|inaccurate/, 'listing'], [/size|fit|too (small|big|large|tight|loose)/, 'size'], [/damag|defect|broke|faulty|quality|stopped working/, 'quality'], [/wrong item|incorrect item|missing|sent wrong|wrong (size|colou?r) sent/, 'fulfillment'], [/changed? (my )?mind|no longer|not needed|unwanted|better price|ordered by mistake/, 'customer']];
export const OWNER = { listing: 'merchandising (product page)', size: 'merchandising (size chart)', quality: 'product and packaging', fulfillment: 'warehouse', customer: 'none (policy)', other: 'customer service' };
export function reasonGroup(reason, own = {}) { const s = str(reason).toLowerCase(); for (const [k, v] of Object.entries(own)) if (k.toLowerCase() === s) return v; for (const [re, g] of GROUPS) if (re.test(s)) return g; return 'other'; }
const custId = (email) => `CUST-${sha256(emailKey(email)).slice(0, 10)}`;

/** Statuses: review, ok. Findings: sku_high_return_rate, listing_mismatch, repeat_returner. */
export function analyseReturns(returns, orders, s = {}) {
  const minU = s.sku_min_units ?? 10; const rate = s.sku_rate_pct ?? 15; const minR = s.returner_min_returns ?? 3; const rRate = s.returner_rate_pct ?? 50;
  const sold = new Map(); const custOrders = new Map(); const custEmail = new Map();
  for (const o of orders) { const k = skuKey(o.sku); sold.set(k, (sold.get(k) || 0) + Math.abs(num(o.qty) || 1)); const e = str(o.customer_email); if (e) { const c = custId(e); (custOrders.get(c) || custOrders.set(c, new Set()).get(c)).add(str(o.order_id)); if (!custEmail.has(c)) custEmail.set(c, e); } }
  const skus = new Map(); const custRet = new Map(); const groups = {};
  for (const r of returns) {
    const k = skuKey(r.sku); const g = reasonGroup(r.reason, s.groups); const q = Math.abs(num(r.qty) || 1);
    const x = skus.get(k) || skus.set(k, { returned: 0, groups: {} }).get(k); x.returned += q; x.groups[g] = (x.groups[g] || 0) + q; groups[g] = (groups[g] || 0) + q;
    const e = str(r.customer_email); if (e) { const c = custId(e); (custRet.get(c) || custRet.set(c, new Set()).get(c)).add(str(r.order_id)); if (!custEmail.has(c)) custEmail.set(c, e); }
  }
  const items = [];
  for (const k of [...new Set([...sold.keys(), ...skus.keys()])].sort()) {
    const u = sold.get(k) || 0; const x = skus.get(k) || { returned: 0, groups: {} }; const r = pct(x.returned, u);
    const top = Object.entries(x.groups).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]; const f = [];
    if (u >= minU && r !== null && r >= rate) f.push(finding('sku_high_return_rate', null, `${k}: ${x.returned} of ${u} unit(s) returned (${r}%). Most often "${top[0]}" (${top[1]}); owner: ${OWNER[top[0]]}.`));
    if ((x.groups.listing || 0) >= 2) f.push(finding('listing_mismatch', null, `${k}: ${x.groups.listing} return(s) say the item was not as described. Check the photos, title and description.`));
    items.push({ id: `SKU:${k}`, kind: 'sku', sku: k, customer_email: '', units_sold: u, units_returned: x.returned, return_rate_pct: r, top_reason: top ? top[0] : null, owner: top ? OWNER[top[0]] : null, reasons: x.groups, status: f.length ? 'review' : 'ok', findings: f });
  }
  for (const c of [...new Set([...custOrders.keys(), ...custRet.keys()])].sort()) {
    const n = (custOrders.get(c) || new Set()).size; const ret = (custRet.get(c) || new Set()).size; const r = n ? pct(ret, n) : null; const f = [];
    if (ret >= minR && r !== null && r >= rRate) f.push(finding('repeat_returner', null, `Customer ${custEmail.get(c)} returned ${ret} of ${n} order(s) (${r}%). Look at the orders before deciding anything; returning is allowed.`));
    items.push({ id: c, kind: 'customer', sku: '', customer_email: custEmail.get(c) || '', units_sold: n, units_returned: ret, return_rate_pct: r, top_reason: null, owner: null, reasons: {}, status: f.length ? 'review' : 'ok', findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  const totalSold = [...sold.values()].reduce((a, b) => a + b, 0); const totalRet = Object.values(groups).reduce((a, b) => a + b, 0);
  return { skus: sorted.filter((i) => i.kind === 'sku').length, customers: sorted.filter((i) => i.kind === 'customer').length, units_sold: totalSold, units_returned: totalRet, return_rate_pct: pct(totalRet, totalSold), by_reason: Object.entries(groups).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([reason, units]) => ({ reason, units, owner: OWNER[reason] })), ...byStatus(sorted, ['review', 'ok']), flagged_skus: sorted.filter((i) => i.kind === 'sku' && i.status === 'review').length, repeat_returners: sorted.filter((i) => i.kind === 'customer' && i.status === 'review').length, by_finding: byFinding(sorted), items: sorted };
}

export function reviewText(items, { from }) {
  const rows = items.filter((i) => i.kind === 'sku' && i.status === 'review');
  return { skus: rows.map((i) => i.sku), text: [
    '# Listing review', '', '**To:** [TO CONFIRM merchandising lead]', `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'These SKUs come back more than the rest. Please review each product page against the reason customers give.', '',
    '| SKU | Sold | Returned | Rate | Top reason | Owner | Change to make |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.sku} | ${i.units_sold} | ${i.units_returned} | ${i.return_rate_pct}% | ${i.top_reason} | ${i.owner} | [CHECK proposed change] |`),
  ].join('\n') };
}
