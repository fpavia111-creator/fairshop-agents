// Stockouts, overselling and reorder points from daily stock snapshots and orders.
import { round2, str, num, isoDate, skuKey, finding, byFinding, byStatus, sortBy } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const SNAPSHOT_FIELDS = Object.freeze({
  date: t(['Date', 'Snapshot Date', 'snapshot-date'], { type: 'date', required: true }),
  sku: t(['SKU', 'Item SKU', 'sku'], { required: true }),
  on_hand: t(['On Hand', 'Available', 'Quantity', 'Stock'], { type: 'number', required: true }),
});
export const ORDER_LINE_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name'], { required: true }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date', required: true }),
  sku: t(['SKU', 'Lineitem sku'], { required: true }),
  qty: t(['Quantity', 'Qty', 'Lineitem quantity'], { type: 'number' }),
  price: t(['Price', 'Unit Price', 'Lineitem price'], { type: 'money' }),
  status: t(['Status', 'Financial Status', 'Order Status']),
  cancel_reason: t(['Cancel Reason', 'Cancellation Reason']),
});
export const STOCKOUT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    lead_time_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 0, maximum: 365 }, description: 'Days from purchase order to stock on the shelf, per SKU, with "default" (default 14)' },
    safety_days: { type: 'integer', minimum: 0, maximum: 180, description: 'Extra days of stock to keep (default 7)' },
    order_days: { type: 'integer', minimum: 1, maximum: 365, description: 'Days of sales one purchase order should cover (default 30)' },
  },
});

/** Statuses: oversold (orders), reorder, ok (SKUs). Lost sales are an estimate. */
export function checkStockouts(snaps, orders, s = {}) {
  const lead = s.lead_time_days || {}; const safety = s.safety_days ?? 7; const cover = s.order_days ?? 30;
  const bySku = new Map(); for (const r of snaps) { const k = skuKey(r.sku); const d = isoDate(r.date); if (!k || !d) continue; (bySku.get(k) || bySku.set(k, new Map()).get(k)).set(d, num(r.on_hand) || 0); }
  const ord = new Map(); for (const o of orders) { const k = skuKey(o.sku); (ord.get(k) || ord.set(k, []).get(k)).push(o); }
  const items = [];
  for (const sku of [...new Set([...bySku.keys(), ...ord.keys()])].sort()) {
    const days = bySku.get(sku) || new Map(); const os = ord.get(sku) || []; const dates = [...days.keys()].sort();
    const inStock = dates.filter((d) => days.get(d) > 0); const out = dates.filter((d) => days.get(d) <= 0);
    const live = os.filter((o) => !/cancel|void/i.test(str(o.status)));
    const prices = os.map((o) => num(o.price)).filter((p) => p !== null); const price = prices.length ? round2(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
    const soldIn = live.filter((o) => days.get(isoDate(o.order_date)) > 0).reduce((a, o) => a + Math.abs(num(o.qty) || 1), 0);
    const daily = inStock.length ? round2(soldIn / inStock.length) : 0;
    for (const o of sortBy(os.map((x) => ({ ...x, id: str(x.order_id) })))) {
      const d = isoDate(o.order_date); const cancelled = /cancel|void/i.test(str(o.status)); const short = days.has(d) && days.get(d) <= 0;
      if ((cancelled && /stock|inventory|unavailable|sold out/i.test(str(o.cancel_reason))) || (!cancelled && short)) {
        const q = Math.abs(num(o.qty) || 1); const amt = num(o.price) === null ? null : round2(q * num(o.price));
        items.push({ id: `${o.id}:${sku}`, kind: 'order', sku, order_id: o.id, date: d, units: q, value: amt ?? 0, status: 'oversold', findings: [finding('oversold', amt, cancelled ? `Order ${o.id} for ${q} × ${sku} on ${d} was cancelled: "${str(o.cancel_reason)}".` : `Order ${o.id} for ${q} × ${sku} was taken on ${d}, a day with ${days.get(d)} on hand.`)] });
      }
    }
    const f = []; const last = dates.at(-1); const onHand = last ? days.get(last) : null;
    if (out.length) { const lost = price === null ? null : round2(daily * out.length * price); f.push(finding('out_of_stock_days', lost, `${sku} was out of stock on ${out.length} of ${dates.length} day(s) (${out[0]} to ${out.at(-1)}). At ${daily} a day that is about ${round2(daily * out.length)} unit(s)${lost === null ? '' : ` or ${lost}`} not sold (estimate).`)); }
    const lt = lead[sku] ?? lead.default ?? 14; const coverDays = daily > 0 && onHand !== null ? round2(onHand / daily) : null; let suggested = 0;
    if (coverDays !== null && coverDays < lt + safety) { suggested = Math.max(0, Math.ceil(daily * (lt + safety + cover) - onHand)); f.push(finding('reorder_now', null, `${sku}: ${onHand} on hand covers ${coverDays} day(s) at ${daily} a day; a reorder takes ${lt} day(s) plus ${safety} of safety. Suggested order: ${suggested}.`)); }
    items.push({ id: `SKU:${sku}`, kind: 'sku', sku, order_id: '', date: last || null, on_hand: onHand, daily, days_of_cover: coverDays, out_days: out.length, suggested, units: 0, value: f[0] && f[0].code === 'out_of_stock_days' ? f[0].amount || 0 : 0, status: f.some((x) => x.code === 'reorder_now') ? 'reorder' : f.length ? 'review' : 'ok', findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  return { skus: sorted.filter((i) => i.kind === 'sku').length, oversold_orders: sorted.filter((i) => i.kind === 'order').length, oversold_value: round2(sorted.filter((i) => i.kind === 'order').reduce((a, i) => a + i.value, 0)), lost_sales_estimate: round2(sorted.filter((i) => i.kind === 'sku').reduce((a, i) => a + i.value, 0)), ...byStatus(sorted, ['oversold', 'reorder', 'review', 'ok']), by_finding: byFinding(sorted), items: sorted };
}

export function poText(items, { supplier, from }) {
  const rows = items.filter((i) => i.status === 'reorder');
  return { skus: rows.map((i) => i.sku), text: [
    `# Purchase order${supplier ? `: ${supplier}` : ''}`, '', `**To:** ${supplier ? `[TO CONFIRM ${supplier} order contact]` : '[TO CONFIRM supplier]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '**PO number:** [TO CONFIRM PO number]', '',
    '| SKU | Quantity | On hand | Days of cover | Unit cost |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.sku} | ${i.suggested} | ${i.on_hand} | ${i.days_of_cover} | [TO CONFIRM cost] |`), '', '[CHECK quantities against open purchase orders and minimum order quantities]',
  ].join('\n') };
}
