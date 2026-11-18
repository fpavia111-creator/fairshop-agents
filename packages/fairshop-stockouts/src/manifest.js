import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { SNAPSHOT_FIELDS, ORDER_LINE_FIELDS, STOCKOUT_SETTINGS_SCHEMA, checkStockouts, poText } from './stockouts.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  snapshots: { type: 'string', description: 'Daily stock snapshots under --root (one row per SKU and day): date, SKU, on hand' },
  orders: { type: 'string', description: 'Order lines for the same days under --root: order, date, SKU, quantity, price, status, cancel reason' },
  settings: { type: 'string', description: 'Optional settings JSON: lead_time_days per SKU, safety_days, order_days' },
};
const run = (a, ctx) => checkStockouts(ctx.records(a.snapshots, 'snapshots'), ctx.records(a.orders, 'orders'), a.settings ? ctx.readJson(a.settings, 'stockout_settings') : {});
const line = (r) => `${r.skus} SKU(s): ${r.oversold_orders} order(s) taken or cancelled while out of stock (${r.oversold_value}), about ${r.lost_sales_estimate} not sold on out-of-stock days (estimate), ${r.reorder} SKU(s) to reorder now, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'stockouts', label: 'Fairshop Stockouts',
  description: 'Reads daily stock snapshots and orders per SKU: orders taken or cancelled while out of stock, days out of stock with an estimate of sales lost, and SKUs that will run out before a reorder could arrive, with a suggested quantity. Drafts the purchase order; a person sends it.',
  files, required: ['snapshots', 'orders'],
  sources: { snapshots: { label: 'Daily stock snapshots', args: ['snapshots'], fields: SNAPSHOT_FIELDS }, orders: { label: 'Order lines', args: ['orders'], fields: ORDER_LINE_FIELDS } },
  configSchemas: { stockout_settings: STOCKOUT_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Find stockouts and oversold orders', description: 'Per SKU: days out of stock, orders taken or cancelled on those days, sales rate on in-stock days, days of cover and whether to reorder now.' },
  explain: { arg: 'sku', argDescription: 'SKU or order id from stockouts_audit', title: 'Explain one SKU', description: 'Show one SKU (or order) with its stock days, sales rate and reorder point.', match: (i, w) => i.sku === w.toUpperCase() || i.order_id === w, text: (i) => `${i.id}: ${i.status}${i.kind === 'sku' ? `, ${i.on_hand} on hand, ${i.daily} a day, ${i.days_of_cover ?? 'n/a'} day(s) of cover` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'stockouts', title: 'Stockouts and overselling', description: 'Write stockouts.csv and .html (SKUs to reorder or review, every oversold order) into out_dir (default fairshop-out/stockouts).',
    columns: ['id', 'kind', 'sku', 'order_id', 'date', 'units', 'status', 'value', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'sku', 'date', 'units', 'status', 'value', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'kind', 'sku', 'order_id', 'date', 'units'], 'value'),
    sections: (r) => [{ title: 'By SKU', rows: r.items.filter((i) => i.kind === 'sku').map((i) => ({ sku: i.sku, on_hand: i.on_hand, daily: i.daily, days_of_cover: i.days_of_cover, out_days: i.out_days, suggested: i.suggested })), columns: ['sku', 'on_hand', 'daily', 'days_of_cover', 'out_days', 'suggested'] }, { title: 'Oversold orders', rows: r.items.filter((i) => i.kind === 'order').map((i) => ({ order_id: i.order_id, sku: i.sku, date: i.date, units: i.units, value: i.value })), columns: ['order_id', 'sku', 'date', 'units', 'value'] }],
    limits: [LIMITS.files, 'Lost sales are an estimate: the in-stock daily rate times the out-of-stock days.', 'Lead times are your settings. Seasonality and promotions are not modelled.', LIMITS.advice],
  },
  draft: {
    noun: 'purchase_order', verb: 'send', category: 'binding_send',
    description: 'Write drafts/purchase_order-<supplier>.md with the suggested quantity of every SKU to reorder now. Marked DRAFT with PO number and costs to confirm. Sending goes through stockouts_request_send (one click); a person sends it to the supplier.',
    args: { supplier: { type: 'string', description: 'Supplier name, for the To line' }, from: { type: 'string', description: 'Your name and company' } },
    build: (a, ctx, r) => { const d = poText(r.items, a); if (!d.skus.length) throw new Error('no SKU needs a reorder now'); return { id: a.supplier || 'supplier', text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'supplier_po_send', category: 'binding_send', description: 'Fairshop Stockouts never sends a purchase order; a person does.' },
    { name: 'order_cancel', category: 'move_money', description: 'Fairshop Stockouts never cancels or refunds an order.' },
  ],
  prompt: { name: 'stockouts', title: 'Find stockouts and what to reorder', description: 'Walks the host model through stockouts and reorders.',
    text: 'You are helping a store with stockouts, using fairshop-stockouts. Snapshots: {{snapshots}}. Orders: {{orders}}.\n\nRules: lost sales are estimates; say so. supplier_po_send and order_cancel are blocked.\n\n1. Call stockouts_audit. Lead with SKUs to reorder now, then oversold orders.\n2. stockouts_explain for a SKU.\n3. stockouts_write_report.\n4. Offer stockouts_draft_purchase_order; stockouts_request_send only when asked (one named click).' },
});
