// Contribution margin per SKU and channel from sales, fees, shipping labels and unit costs.
import { round2, str, num, skuKey, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, pct } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const SALES_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name'], { required: true }),
  date: t(['Date', 'Order Date', 'Created at'], { type: 'date' }),
  channel: t(['Channel', 'Source', 'Marketplace']),
  sku: t(['SKU', 'Lineitem sku', 'Item SKU'], { required: true }),
  qty: t(['Quantity', 'Qty', 'Units'], { type: 'number' }),
  revenue: t(['Revenue', 'Net Sales', 'Line Total', 'Item Price'], { type: 'money', required: true }),
  shipping_charged: t(['Shipping Charged', 'Shipping', 'Shipping Revenue'], { type: 'money' }),
  fees: t(['Fees', 'Marketplace Fees', 'Selling Fees', 'Payment Fees'], { type: 'money' }),
});
export const COST_FIELDS = Object.freeze({ sku: t(['SKU', 'Item SKU', 'Variant SKU'], { required: true }), unit_cost: t(['Unit Cost', 'Cost', 'Cost per item', 'COGS'], { type: 'money', required: true }) });
export const LABEL_FIELDS = Object.freeze({ order_id: t(['Order', 'Order ID', 'Order Number'], { required: true }), label_cost: t(['Label Cost', 'Shipping Cost', 'Postage', 'Rate Amount'], { type: 'money', required: true }) });
export const MARGIN_SETTINGS_SCHEMA = Object.freeze({ type: 'object', additionalProperties: false, properties: { note: { type: 'string' }, margin_floor_pct: { type: 'number', minimum: -100, maximum: 100, description: 'Contribution margin under which a SKU and channel is listed (default 15)' } } });

/** Statuses: fix (loses money), review (under the floor or no cost), ok. */
export function marginBySku(sales, costs, labels = [], s = {}) {
  const floor = s.margin_floor_pct ?? 15; const cost = new Map(costs.map((c) => [skuKey(c.sku), num(c.unit_cost)]));
  const label = new Map(); for (const l of labels) { const k = str(l.order_id).replace(/^#/, ''); label.set(k, round2((label.get(k) || 0) + (num(l.label_cost) || 0))); }
  const orderRev = new Map(); for (const r of sales) { const k = str(r.order_id).replace(/^#/, ''); orderRev.set(k, round2((orderRev.get(k) || 0) + (num(r.revenue) || 0))); }
  const g = new Map();
  for (const r of sales) {
    const oid = str(r.order_id).replace(/^#/, ''); const sku = skuKey(r.sku); const ch = channelLabel(channelKey(r.channel)) || '(none)'; const key = `${ch}|${sku}`; const rev = num(r.revenue) || 0; const qty = Math.abs(num(r.qty) || 1);
    const share = orderRev.get(oid) ? rev / orderRev.get(oid) : 0; const x = g.get(key) || { id: key, channel: ch, sku, units: 0, revenue: 0, shipping_charged: 0, fees: 0, shipping_cost: 0, cogs: 0, cost_known: cost.get(sku) !== undefined && cost.get(sku) !== null };
    x.units += qty; x.revenue = round2(x.revenue + rev); x.shipping_charged = round2(x.shipping_charged + (num(r.shipping_charged) || 0)); x.fees = round2(x.fees + Math.abs(num(r.fees) || 0)); x.shipping_cost = round2(x.shipping_cost + (label.get(oid) || 0) * share); if (x.cost_known) x.cogs = round2(x.cogs + qty * cost.get(sku)); g.set(key, x);
  }
  const items = [];
  for (const x of [...g.values()]) {
    const income = round2(x.revenue + x.shipping_charged); const contribution = x.cost_known ? round2(income - x.cogs - x.fees - x.shipping_cost) : null; const m = contribution === null ? null : pct(contribution, income);
    const f = []; let status = 'ok';
    if (!x.cost_known) { f.push(finding('missing_cost', null, `${x.sku} has no unit cost on file, so its margin on ${x.channel} cannot be worked out.`)); status = 'review'; }
    else if (contribution < 0) { f.push(finding('negative_margin', -contribution, `${x.sku} on ${x.channel} lost ${-contribution}: income ${income}, cost ${x.cogs}, fees ${x.fees}, shipping ${x.shipping_cost}.`)); status = 'fix'; }
    else if (m < floor) { f.push(finding('below_floor', null, `${x.sku} on ${x.channel} kept ${m}% (${contribution} on ${income}); your floor is ${floor}%.`)); status = 'review'; }
    items.push({ ...x, income, contribution, margin_pct: m, status, findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.sku}|${i.channel}`);
  const known = sorted.filter((i) => i.contribution !== null);
  return { lines: sales.length, combos: sorted.length, revenue: round2(sorted.reduce((a, i) => a + i.revenue, 0)), contribution: round2(known.reduce((a, i) => a + i.contribution, 0)), ...byStatus(sorted, ['fix', 'review', 'ok']), by_channel: rollup(known, (i) => i.channel, ['income', 'contribution']).map(({ key, ...v }) => ({ channel: key, ...v, margin_pct: pct(v.contribution, v.income) })), by_finding: byFinding(sorted), items: sorted };
}

export function reviewText(items, { from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  return { skus: rows.map((i) => i.id), text: ['# Pricing review', '', '**To:** [TO CONFIRM the person who sets prices]', `**From:** ${from || '[TO CONFIRM your name]'}`, '', '| Channel | SKU | Income | Contribution | Margin | Option |', '| --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.channel} | ${i.sku} | ${i.income} | ${i.contribution ?? 'no cost'} | ${i.margin_pct ?? ''}% | [CHECK raise price / cut cost / change shipping / stop selling here] |`)].join('\n') };
}
