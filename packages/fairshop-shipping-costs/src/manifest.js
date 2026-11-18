import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { ORDER_FIELDS, LABEL_FIELDS, LABEL_PROFILES, SHIPPING_SETTINGS_SCHEMA, checkShipping, refundText } from './shipping.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  orders: { type: 'string', description: 'Orders under --root: order, date, channel, shipping charged, subtotal, shipping method' },
  labels: { type: 'string', description: 'Labels bought under --root (ShipStation, Shippo, Pirate Ship or your own CSV): order, date, carrier, service, label cost, tracking, voided, refund status' },
  settings: { type: 'string', description: 'Optional settings JSON: free_shipping_threshold, loss_tolerance, void_refund_days' },
  as_of: AS_OF,
};
const run = (a, ctx) => checkShipping(ctx.records(a.orders, 'orders'), ctx.records(a.labels, 'labels'), a.settings ? ctx.readJson(a.settings, 'shipping_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.orders} order(s): ${r.charged} charged for shipping against ${r.label_cost} in labels; ${r.claim} to claim (${r.to_claim}), ${r.review} to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'shipping', label: 'Fairshop Shipping Costs',
  description: 'Compares what each order charged for shipping with the labels bought for it: labels costing more than was charged, free shipping under your threshold, two labels on one order, voided labels not refunded, and labels with no order. Drafts a label refund request; a person sends it.',
  files, required: ['orders', 'labels'],
  sources: { orders: { label: 'Orders', args: ['orders'], fields: ORDER_FIELDS }, labels: { label: 'Shipping labels', args: ['labels'], fields: LABEL_FIELDS, profiles: LABEL_PROFILES } },
  configSchemas: { shipping_settings: SHIPPING_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Compare shipping charged with label cost', description: 'For every order: shipping charged against the labels bought, duplicate labels and free shipping under your threshold; for every label: voided and not refunded, or with no order.' },
  explain: { arg: 'order_id', argDescription: 'Order number or label id (LABEL:tracking) from shipping_audit', title: 'Explain one order', description: 'Show one order (or label) with charges, labels and findings.', match: (i, w) => i.order_id === w.replace(/^#/, '') || i.id.toUpperCase() === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}, charged ${i.charged}, labels ${i.label_cost} (${i.labels}). ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'shipping-costs', title: 'Shipping charged against label cost', description: 'Write shipping-costs.csv and .html (by channel, every order or label to look at) into out_dir (default fairshop-out/shipping).',
    columns: ['id', 'kind', 'order_id', 'channel', 'charged', 'label_cost', 'labels', 'tracking', 'status', 'at_stake', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'channel', 'charged', 'label_cost', 'labels', 'status', 'at_stake', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'kind', 'order_id', 'channel', 'charged', 'label_cost', 'labels', 'tracking'], 'at_stake'),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'charged', 'label_cost'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Label costs are the ones in your export; carrier adjustments billed later are not in them.', LIMITS.advice],
  },
  draft: {
    noun: 'label_refund_request', verb: 'send', category: 'binding_send',
    description: 'Write drafts/label_refund_request-<platform>.md listing duplicate labels and voided labels not refunded. Marked DRAFT. Sending goes through shipping_request_send (one click); a person sends it.',
    args: { platform: { type: 'string', description: 'Shipping platform or carrier to ask' }, from: { type: 'string', description: 'Your name and store' } },
    build: (a, ctx, r) => { const d = refundText(r.items, a); if (!d.labels.length) throw new Error('no label to claim'); return { id: a.platform || 'labels', text: d.text, amount: d.total, extra: { labels: d.labels } }; },
  },
  refused: [
    { name: 'label_purchase', category: 'move_money', description: 'Fairshop Shipping Costs never buys or voids a label.' },
    { name: 'shipping_rule_update', category: 'go_live', description: 'Fairshop Shipping Costs never changes shipping rates or rules in a store.' },
  ],
  prompt: { name: 'shipping_costs', title: 'Find shipping you are paying for twice or not charging', description: 'Walks the host model through shipping costs.',
    text: 'You are helping a store compare shipping charged with labels, using fairshop-shipping-costs. Orders: {{orders}}. Labels: {{labels}}.\n\nRules: label_purchase and shipping_rule_update are blocked.\n\n1. Call shipping_audit. Lead with labels to claim back.\n2. shipping_explain for an order.\n3. shipping_write_report.\n4. Offer shipping_draft_label_refund_request; shipping_request_send only when asked (one named click).' },
});
