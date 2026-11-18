// Payout reconciliation: pure functions over order rows and payout lines.
import { exportProfile, firstRowPer, round2, str, num, isoDate, addDays, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, pct, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });

/** Named exports (core exports.js). Written from knowledge of the exports; not checked against a live account. */
export const ORDER_PROFILES = Object.freeze([
  exportProfile('shopify_orders', { order_id: 'Name', order_date: 'Created at', total: 'Total', refunded: 'Refunded Amount', status: 'Financial Status', gateway: 'Payment Method', channel: { value: 'Shopify' } }, { rows: firstRowPer('order_id'), note: 'Shopify orders export: one row per order is kept (Shopify repeats the order once per line item).' }),
  exportProfile('woocommerce_orders', { order_id: 'Order Number', order_date: ['Order Date', 'Date'], total: 'Order Total Amount', refunded: ['Order Refund Amount', 'Refund Amount'], status: 'Order Status', gateway: ['Payment Method Title', 'Payment Method'], channel: { value: 'WooCommerce' } }, { rows: firstRowPer('order_id') }),
  exportProfile('bigcommerce_orders', { order_id: 'Order ID', order_date: 'Order Date', total: 'Order Total (inc tax)', refunded: ['Refund Amount', 'Total Refunded'], status: 'Order Status', gateway: 'Payment Method', channel: { value: 'BigCommerce' } }, { rows: firstRowPer('order_id') }),
]);
export const PAYOUT_PROFILES = Object.freeze([
  exportProfile('shopify_payout_transactions', { payout_id: ['Payout ID', 'Payout Date'], payout_date: 'Payout Date', order_id: 'Order', type: 'Type', gross: 'Amount', fee: 'Fee', net: 'Net', channel: { value: 'Shopify' } }, { note: 'Shopify Payments transactions: the payout date stands in for the payout id when the export has no id column.' }),
  exportProfile('stripe_balance_transactions', { payout_id: ['Automatic Payout ID', 'Transfer'], payout_date: ['Available On (UTC)', 'Available On'], order_id: ['order_id (metadata)', 'Description'], type: ['Reporting Category', 'Type'], gross: 'Amount', fee: 'Fee', net: 'Net', channel: { value: 'Stripe' } }),
  exportProfile('paypal_activity', { payout_id: ['Transfer ID', 'Transaction ID'], payout_date: 'Date', order_id: ['Invoice Number', 'Item ID'], type: 'Type', gross: 'Gross', fee: 'Fee', net: 'Net', channel: { value: 'PayPal' } }, { note: 'PayPal activity: PayPal sends money to the balance, not straight to the bank; the transaction id stands in for the payout id.' }),
  exportProfile('amazon_transaction_view', { payout_id: 'settlement id', payout_date: ['date/time', 'date'], order_id: 'order id', type: 'type', gross: 'product sales', fee: { from: ['selling fees', 'fba fees'], compute: (_r, get) => -((num(get('selling fees')) || 0) + (num(get('fba fees')) || 0)) }, net: 'total', channel: { value: 'Amazon' } }, { note: 'Amazon date range report: selling and FBA fees are added together as the fee; product sales are read as the gross.' }),
  exportProfile('ebay_transaction_report', { payout_id: ['Payout ID', 'Payout id'], payout_date: ['Payout date', 'Transaction creation date'], order_id: 'Order number', type: 'Type', gross: ['Gross transaction amount', 'Item subtotal'], fee: ['Final Value Fee - fixed', 'Total fees'], net: 'Net amount', channel: { value: 'eBay' } }),
  exportProfile('etsy_payments_csv', { payout_id: ['Deposit ID', 'Info'], payout_date: 'Date', order_id: { from: ['Info', 'Title'], compute: (_r, get) => (/Order #?(\d+)/i.exec(`${get('Info') || ''} ${get('Title') || ''}`) || [])[1] || '' }, type: 'Type', gross: 'Amount', fee: 'Fees & Taxes', net: 'Net', channel: { value: 'Etsy' } }, { note: 'Etsy payment account CSV: the order number is read from the Info or Title text ("Order #1234").' }),
  exportProfile('walmart_recon', { payout_id: ['Period Start Date'], payout_date: ['Transaction Posted Timestamp', 'Period End Date'], order_id: 'Customer Order #', type: 'Transaction Type', gross: { from: ['Amount Type', 'Amount'], compute: (_r, get) => (/fee|commission/i.test(String(get('Amount Type') || '')) ? 0 : num(get('Amount'))) }, fee: { from: ['Amount Type', 'Amount'], compute: (_r, get) => (/fee|commission/i.test(String(get('Amount Type') || '')) ? num(get('Amount')) : 0) }, net: 'Amount', channel: { value: 'Walmart' } }, { note: 'Walmart reconciliation: lines whose amount type mentions a fee or commission are read as fees; the period stands in for the payout id.' }),
]);

export const ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Order Number', 'Order #', 'Name', 'order-id', 'Customer Order #', 'Order No'], { required: true }),
  channel: t(['Channel', 'Sales Channel', 'Source', 'Marketplace', 'Store']),
  order_date: t(['Order Date', 'Created at', 'Date', 'purchase-date', 'Paid at', 'Sale Date'], { type: 'date' }),
  total: t(['Total', 'Order Total', 'Grand Total', 'Order Total Amount', 'Total Amount', 'Order Value'], { type: 'money' }),
  refunded: t(['Refunded', 'Refunded Amount', 'Total Refunded', 'Refund Amount'], { type: 'money' }),
  status: t(['Status', 'Financial Status', 'Payment Status', 'Order Status']),
  gateway: t(['Gateway', 'Payment Method', 'Payment Gateway', 'Processor']),
});
export const PAYOUT_FIELDS = Object.freeze({
  payout_id: t(['Payout ID', 'Payout', 'settlement-id', 'Settlement ID', 'Transfer ID', 'Deposit ID']),
  payout_date: t(['Payout Date', 'Deposit Date', 'deposit-date', 'Available On', 'Settlement Date'], { type: 'date' }),
  order_id: t(['Order', 'Order ID', 'order-id', 'Order Number', 'Order #', 'Invoice Number', 'Customer Order #']),
  type: t(['Type', 'Transaction Type', 'transaction-type', 'Reporting Category']),
  gross: t(['Gross', 'Amount', 'Gross Amount', 'Charge Amount'], { type: 'money' }),
  fee: t(['Fee', 'Fees', 'Fee Amount', 'Processing Fee'], { type: 'money' }),
  net: t(['Net', 'Net Amount', 'Net Total'], { type: 'money' }),
  channel: t(['Channel', 'Processor', 'Marketplace', 'Source']),
});

export const PAYOUT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    payout_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 0, maximum: 120 }, description: 'Days from order to payout per channel (shopify, amazon, etsy, ...); "default" for the rest (default 7)' },
    max_fee_pct: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 100 }, description: 'Highest fee you expect per channel, as a percent of the order (from your own agreement)' },
    tolerance: { type: 'number', minimum: 0, maximum: 100, description: 'Differences up to this amount are treated as rounding (default 0.05)' },
    skip_statuses: { type: 'array', items: { type: 'string' }, description: 'Order statuses that never pay out (default voided, cancelled, pending, authorized, expired)' },
    skip_gateways: { type: 'array', items: { type: 'string' }, description: 'Payment methods that do not go through these payouts (default manual, cash, gift card, cash on delivery, bank transfer)' },
  },
});

const DEFAULT_SKIP_STATUS = ['voided', 'cancelled', 'canceled', 'pending', 'authorized', 'expired'];
const DEFAULT_SKIP_GATEWAY = ['manual', 'cash', 'gift card', 'gift_card', 'cash on delivery', 'cod', 'bank transfer', 'bank deposit'];
/** "#1001", "1001 " and "# 1001" are one order. */
export const orderKey = (v) => str(v).replace(/^#\s*/, '').toUpperCase();

/**
 * Reconcile orders against payout lines. Order statuses: chase, waiting, review, ok, skipped.
 * Finding codes: not_paid_out, paid_short, paid_twice, refund_not_deducted, paid_more,
 * fee_above_rate, no_matching_order, payout_adjustment.
 */
export function reconcilePayouts(orders, lines, { settings = {}, asOf } = {}) {
  const day = today(asOf);
  const tol = settings.tolerance ?? 0.05;
  const lag = settings.payout_days || {};
  const maxFee = settings.max_fee_pct || {};
  const skipStatus = new Set((settings.skip_statuses || DEFAULT_SKIP_STATUS).map((x) => x.toLowerCase()));
  const skipGateway = (settings.skip_gateways || DEFAULT_SKIP_GATEWAY).map((x) => x.toLowerCase());
  const byOrder = new Map(); const loose = [];
  for (const l of lines) {
    const k = orderKey(l.order_id);
    const line = { payout_id: str(l.payout_id) || str(l.payout_date) || '(no payout id)', payout_date: isoDate(l.payout_date), type: str(l.type), gross: num(l.gross) ?? num(l.net) ?? 0, fee: Math.abs(num(l.fee) || 0), net: num(l.net) ?? 0, channel: channelKey(l.channel) };
    if (!k) { if (line.gross || line.net) loose.push(line); continue; }
    (byOrder.get(k) || byOrder.set(k, []).get(k)).push(line);
  }
  const seen = new Set(); const items = [];
  // Orders sorted by key so "the first" of two rows for one order never depends on file order.
  for (const o of sortBy(orders.map((o) => ({ ...o, id: orderKey(o.order_id) })), (o) => o.id)) {
    const id = o.id; if (!id || seen.has(id)) continue; seen.add(id);
    const ch = channelKey(o.channel) || channelKey(o.gateway) || 'unknown';
    const total = round2(num(o.total) || 0); const refunded = round2(Math.abs(num(o.refunded) || 0));
    const expected = round2(total - refunded);
    const ls = sortBy((byOrder.get(id) || []).map((l, i) => ({ ...l, id: `${l.payout_id}|${l.type}|${l.gross}|${i}` })));
    const received = round2(ls.reduce((s, l) => s + l.gross, 0));
    const fees = round2(ls.reduce((s, l) => s + l.fee, 0));
    const charges = ls.filter((l) => l.gross > 0); const refundsPaid = ls.filter((l) => l.gross < 0);
    const base = { id, order_id: str(o.order_id), channel: channelLabel(ch), channel_key: ch, order_date: isoDate(o.order_date), total, refunded, expected, received, fees, payouts: [...new Set(ls.map((l) => l.payout_id))], owed: 0 };
    const f = [];
    const status = str(o.status).toLowerCase(); const gw = str(o.gateway).toLowerCase();
    if (skipStatus.has(status) || (gw && skipGateway.some((g) => gw.includes(g)))) { items.push({ ...base, status: 'skipped', findings: [], why: skipStatus.has(status) ? `status ${status}` : `paid by ${o.gateway}` }); continue; }
    const days = lag[ch] ?? lag.default ?? 7;
    const due = base.order_date ? addDays(base.order_date, days) : null;
    let st = 'ok';
    if (!ls.length) {
      if (expected > tol) {
        if (due && due >= day) st = 'waiting';
        else { f.push(finding('not_paid_out', expected, `No payout line for order ${base.order_id} on ${channelLabel(ch)}; it was due by ${due || 'an unknown date'} (${days} day(s) after the order).`)); base.owed = expected; st = 'chase'; }
      }
    } else {
      const diff = round2(expected - received);
      const chargeIds = new Set(charges.map((l) => l.payout_id));
      if (diff > tol) { f.push(finding('paid_short', diff, `Expected ${expected} for order ${base.order_id}, payouts show ${received}. ${diff} is missing.`)); base.owed = diff; st = 'chase'; }
      else if (diff < -tol) {
        if (chargeIds.size > 1 && charges.length > 1) { f.push(finding('paid_twice', -diff, `Order ${base.order_id} was paid in ${chargeIds.size} payouts (${[...chargeIds].join(', ')}). The extra ${-diff} may be taken back later; keep it until the channel confirms.`)); }
        else if (refunded > 0 && !refundsPaid.length) f.push(finding('refund_not_deducted', null, `Refund of ${refunded} on order ${base.order_id} is not in any payout yet; expect ${-diff} to be deducted from a later payout.`));
        else f.push(finding('paid_more', null, `Payouts show ${received} for order ${base.order_id}, more than the ${expected} expected. Check for a refund or adjustment still to come.`));
        st = 'review';
      }
      const cap = maxFee[ch];
      const chargeGross = round2(charges.reduce((s, l) => s + l.gross, 0));
      if (cap !== undefined && chargeGross > 0 && fees > round2(chargeGross * cap / 100) + tol) {
        const over = round2(fees - chargeGross * cap / 100);
        f.push(finding('fee_above_rate', over, `Fees ${fees} on ${chargeGross} are ${pct(fees, chargeGross)}%, above your ${cap}% for ${channelLabel(ch)}.`));
        if (st === 'ok') st = 'review';
      }
    }
    items.push({ ...base, status: st, due_by: due, findings: f });
  }
  // Payout lines for orders not in the orders file, and lines with no order at all.
  for (const [k, raw] of [...byOrder.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (seen.has(k)) continue;
    const ls = sortBy(raw.map((l) => ({ ...l, id: `${l.payout_id}|${l.type}|${l.gross}` })));
    const amt = round2(ls.reduce((s, l) => s + l.gross, 0));
    items.push({ id: `${ls[0].payout_id}:${k}`, order_id: k, channel: channelLabel(ls[0].channel), channel_key: ls[0].channel, order_date: null, total: 0, refunded: 0, expected: 0, received: amt, fees: round2(ls.reduce((s, l) => s + l.fee, 0)), payouts: [...new Set(ls.map((l) => l.payout_id))], owed: 0, status: 'review', findings: [finding('no_matching_order', amt, `Payout ${ls[0].payout_id} pays ${amt} for order ${k}, which is not in the orders file. Check the date range of the orders export, or whether it is another store's order.`)] });
  }
  for (const l of sortBy(loose.map((l, i) => ({ ...l, id: `${l.payout_id}|${l.type}|${l.gross}|${i}` })), (l) => `${l.payout_id}|${l.type}|${l.gross}`)) {
    items.push({ id: `${l.payout_id}:${l.type || 'line'}:${l.gross}`, order_id: '', channel: channelLabel(l.channel), channel_key: l.channel, order_date: null, total: 0, refunded: 0, expected: 0, received: l.gross, fees: l.fee, payouts: [l.payout_id], owed: 0, status: 'review', findings: [finding('payout_adjustment', null, `Payout ${l.payout_id} has a ${l.type || 'line'} of ${l.gross} with no order (a reserve, hold, chargeback or fee). Match it to the channel's statement.`)] });
  }
  const sorted = sortBy(items, (i) => `${i.channel_key}|${i.id}`);
  const counts = byStatus(sorted, ['chase', 'waiting', 'review', 'ok', 'skipped']);
  const owed = round2(sorted.reduce((s, i) => s + (i.owed || 0), 0));
  const byChannel = rollup(sorted.filter((i) => i.status !== 'skipped'), (i) => i.channel, ['expected', 'received', 'fees', 'owed']).map(({ key, ...v }) => ({ channel: key, ...v }));
  return { as_of: day, orders: seen.size, channels: byChannel.length, owed, ...counts, by_channel: byChannel, by_finding: byFinding(sorted), items: sorted };
}

/** Inquiry text for one channel: every order to chase, with what is missing. */
export function inquiryText(items, { channel, from, account }) {
  const rows = items.filter((i) => i.status === 'chase');
  const total = round2(rows.reduce((s, i) => s + i.owed, 0));
  return { total, orders: rows.map((i) => i.order_id), text: [
    `# Payout inquiry: ${channel}`, '',
    `**To:** [TO CONFIRM ${channel} seller support or payments contact]`,
    `**From:** ${from || '[TO CONFIRM your name and store]'}`,
    `**Store or seller account:** ${account || '[TO CONFIRM store or seller id]'}`, '',
    `We cannot find payouts for the ${rows.length} order(s) below, ${total} in total. Please tell us when each was or will be paid, or why it was not.`, '',
    '| Order | Order date | Expected | Received | Missing | Reason |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.order_id} | ${i.order_date || ''} | ${i.expected} | ${i.received} | ${i.owed} | ${i.findings.map((x) => x.detail).join(' ')} |`),
    '', `**Total missing:** ${total}`,
  ].join('\n') };
}
