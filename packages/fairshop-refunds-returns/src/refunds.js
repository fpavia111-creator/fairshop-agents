// Refunds against returns received: pure functions over refunds, the returns log and order lines.
import { round2, str, num, isoDate, addDays, skuKey, channelLabel, channelKey, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const REFUND_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Order Number', 'Name'], { required: true }),
  sku: t(['SKU', 'Lineitem sku', 'Item SKU']),
  refund_date: t(['Refund Date', 'Refunded At', 'Date'], { type: 'date', required: true }),
  amount: t(['Refund Amount', 'Amount', 'Refunded'], { type: 'money', required: true }),
  qty: t(['Quantity', 'Qty', 'Units'], { type: 'number' }),
  channel: t(['Channel', 'Source', 'Marketplace']),
  customer_email: t(['Customer Email', 'Email', 'Buyer Email'], { pii: 'email' }),
});
export const RETURN_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'RMA Order', 'Order Number'], { required: true }),
  sku: t(['SKU', 'Item SKU']),
  received_date: t(['Received', 'Received Date', 'Receipt Date', 'Date'], { type: 'date', required: true }),
  qty: t(['Quantity', 'Qty', 'Units Received'], { type: 'number' }),
  condition: t(['Condition', 'Disposition', 'Grade']),
});
export const ORDER_LINE_FIELDS = Object.freeze({ order_id: t(['Order', 'Order ID', 'Name'], { required: true }), sku: t(['SKU', 'Lineitem sku']), qty: t(['Quantity', 'Qty', 'Lineitem quantity'], { type: 'number' }), price: t(['Line Total', 'Price', 'Lineitem price', 'Amount'], { type: 'money' }) });
export const REFUND_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    grace_days: { type: 'integer', minimum: 0, maximum: 180, description: 'Days after a refund for the item to come back (default 21)' },
    refund_due_days: { type: 'integer', minimum: 0, maximum: 90, description: 'Days after a return is received to refund it (default 7)' },
    returnless_skus: { type: 'array', items: { type: 'string' }, description: 'SKUs you refund without asking for the item back' },
    damaged_conditions: { type: 'array', items: { type: 'string' }, description: 'Condition words that mean the return came back damaged or used (default damaged, used, missing parts, opened)' },
  },
});

/** Statuses: chase, owed, review, waiting, ok. Findings: refunded_not_returned, returned_not_refunded, refunded_twice, refund_over_price, full_refund_damaged. */
export function matchRefunds(refunds, returns, orders = [], settings = {}, { asOf } = {}) {
  const day = today(asOf); const grace = settings.grace_days ?? 21; const due = settings.refund_due_days ?? 7;
  const noReturn = new Set((settings.returnless_skus || []).map(skuKey)); const damaged = (settings.damaged_conditions || ['damaged', 'used', 'missing parts', 'opened']).map((x) => x.toLowerCase());
  const key = (o, s) => `${str(o).replace(/^#/, '')}|${skuKey(s)}`;
  const g = new Map(); const get = (k) => g.get(k) || g.set(k, { refunds: [], returns: [], order: null }).get(k);
  for (const r of refunds) get(key(r.order_id, r.sku)).refunds.push(r);
  for (const r of returns) get(key(r.order_id, r.sku)).returns.push(r);
  for (const o of orders) { const k = key(o.order_id, o.sku); if (g.has(k)) g.get(k).order = o; }
  const items = [];
  for (const [k, v] of [...g.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [order_id, sku] = k.split('|');
    const refunded = round2(v.refunds.reduce((s, r) => s + Math.abs(num(r.amount) || 0), 0)); const rQty = v.refunds.reduce((s, r) => s + Math.abs(num(r.qty) || 1), 0);
    const back = v.returns.reduce((s, r) => s + Math.abs(num(r.qty) || 1), 0);
    const dates = v.refunds.map((r) => isoDate(r.refund_date)).filter(Boolean).sort(); const recvd = v.returns.map((r) => isoDate(r.received_date)).filter(Boolean).sort();
    const price = v.order ? round2(num(v.order.price) || 0) : null; const ordered = v.order ? Math.abs(num(v.order.qty) || 1) : null;
    const cond = v.returns.map((r) => str(r.condition).toLowerCase()).filter(Boolean);
    const first = v.refunds[0] || {}; const f = []; let status = 'ok'; let atRisk = 0;
    const rank = { chase: 5, owed: 4, review: 3, waiting: 2, ok: 1 }; const set = (s) => { if (rank[s] > rank[status]) status = s; };
    const expectBack = ordered !== null ? Math.min(rQty, ordered) : rQty; // a second refund for the same unit is not a second unit to get back
    if (v.refunds.length && expectBack > back && !noReturn.has(sku)) {
      const dueBack = addDays(dates[0], grace);
      if (dueBack < day) { atRisk = round2(refunded * (expectBack - back) / rQty); f.push(finding('refunded_not_returned', atRisk, `Refunded ${refunded} on ${dates[0]} for ${rQty} unit(s) of ${sku}; ${back} came back by ${day} (due by ${dueBack}).`)); set('chase'); } else set('waiting');
    }
    if (!v.refunds.length && back) { const by = addDays(recvd[0], due); const owed = price !== null && ordered ? round2(price * Math.min(back, ordered) / ordered) : null; if (by < day) { f.push(finding('returned_not_refunded', owed, `${back} unit(s) of ${sku} on order ${order_id} were received on ${recvd[0]} and no refund is on file (due by ${by}).`)); set('owed'); } else set('waiting'); }
    if (ordered !== null && rQty > ordered) { f.push(finding('refunded_twice', refunded - price, `${v.refunds.length} refunds for ${rQty} unit(s) of ${sku}; the order had ${ordered}.`)); set('review'); }
    else if (price !== null && refunded > price + 0.01) { f.push(finding('refund_over_price', refunded - price, `Refunded ${refunded} for ${sku}; the line was ${price}.`)); set('review'); }
    if (price !== null && v.refunds.length && cond.some((c) => damaged.some((d) => c.includes(d))) && refunded >= price - 0.01) { f.push(finding('full_refund_damaged', null, `${sku} came back "${cond.join(', ')}" and was refunded in full (${refunded}). Check your restocking policy.`)); set('review'); }
    items.push({ id: `${order_id}:${sku}`, order_id, sku, channel: channelLabel(channelKey(first.channel)) || '', customer_email: str(first.customer_email), refunded, units_refunded: rQty, units_returned: back, price, refund_date: dates[0] || null, received_date: recvd[0] || null, at_risk: atRisk, status, findings: f });
  }
  const sorted = sortBy(items);
  return { as_of: day, lines: sorted.length, at_risk: round2(sorted.reduce((s, i) => s + i.at_risk, 0)), owed_to_customers: round2(sorted.flatMap((i) => i.findings).filter((f) => f.code === 'returned_not_refunded').reduce((s, f) => s + (f.amount || 0), 0)), ...byStatus(sorted, ['chase', 'owed', 'review', 'waiting', 'ok']), by_channel: rollup(sorted.filter((i) => i.status !== 'ok'), (i) => i.channel || '(none)', ['refunded', 'at_risk']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function remindersText(items) {
  const rows = items.filter((i) => i.status === 'chase');
  return { orders: rows.map((i) => i.id), text: [
    '# Return reminders', '', '**To:** [TO CONFIRM each customer below, from your order system]', '**From:** [TO CONFIRM your customer service address]', '',
    'Hello, we refunded your order and have not received the item back yet. Please send it back using the return label from your refund e-mail, or reply if there is a problem.', '',
    '| Order | Item | Customer | Refunded | Refund date |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.order_id} | ${i.sku} | ${i.customer_email || '[CHECK customer]'} | ${i.refunded} | ${i.refund_date} |`),
  ].join('\n') };
}
