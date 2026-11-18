import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { REFUND_FIELDS, RETURN_FIELDS, ORDER_LINE_FIELDS, REFUND_SETTINGS_SCHEMA, matchRefunds, remindersText } from './refunds.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  refunds: { type: 'string', description: 'Refunds export under --root: order, SKU, refund date, amount, quantity, channel, customer e-mail' },
  returns: { type: 'string', description: 'Returns received log under --root (warehouse, 3PL or returns app): order, SKU, received date, quantity, condition' },
  orders: { type: 'string', description: 'Order lines under --root (optional): order, SKU, quantity, line total' },
  settings: { type: 'string', description: 'Optional settings JSON: grace_days, refund_due_days, returnless_skus, damaged_conditions' },
  as_of: AS_OF,
};
const run = (a, ctx) => matchRefunds(ctx.records(a.refunds, 'refunds'), ctx.records(a.returns, 'returns'), a.orders ? ctx.records(a.orders, 'orders') : [], a.settings ? ctx.readJson(a.settings, 'refund_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.lines} order line(s): ${r.chase} refunded and not returned (${r.at_risk} at risk), ${r.owed} returned and not refunded (${r.owed_to_customers} owed to customers), ${r.review} to review, ${r.waiting} still inside the window, ${r.ok} matched.`;

export const manifest = shopAgent({
  pkg, prefix: 'refunds', label: 'Fairshop Refunds and Returns',
  description: 'Matches refunds to returns received: refunds whose item never came back, returns received but not refunded, refunds paid twice or above the price, and full refunds on damaged returns. Drafts return reminders; a person sends them and decides every refund.',
  files, required: ['refunds', 'returns'],
  sources: { refunds: { label: 'Refunds', args: ['refunds'], fields: REFUND_FIELDS }, returns: { label: 'Returns received', args: ['returns'], fields: RETURN_FIELDS }, orders: { label: 'Order lines', args: ['orders'], fields: ORDER_LINE_FIELDS } },
  configSchemas: { refund_settings: REFUND_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Match refunds to returns received', description: 'Match every refund to the returns log by order and SKU: money refunded for items that never came back, customers owed a refund, refunds paid twice or above the price, full refunds on damaged returns.' },
  explain: { arg: 'order_id', argDescription: 'Order number, or order:SKU from refunds_audit', title: 'Explain one order', description: 'Show the refunds and returns of one order and why it was flagged.', match: (i, w) => i.id.toLowerCase() === w.toLowerCase() || i.order_id === w.replace(/^#/, ''), text: (i) => `${i.id}: ${i.status}, refunded ${i.refunded} for ${i.units_refunded} unit(s), ${i.units_returned} returned. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'refunds-returns', title: 'Refunds against returns received', description: 'Write refunds-returns.csv and .html (every order line not matched, by channel) into out_dir (default fairshop-out/refunds).',
    columns: ['id', 'order_id', 'sku', 'channel', 'refund_date', 'refunded', 'units_refunded', 'units_returned', 'received_date', 'status', 'at_risk', 'findings', 'reasons', 'decision'],
    htmlColumns: ['order_id', 'sku', 'channel', 'refund_date', 'refunded', 'units_returned', 'status', 'at_risk', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'order_id', 'sku', 'channel', 'refund_date', 'refunded', 'units_refunded', 'units_returned', 'received_date'], 'at_risk'),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'refunded', 'at_risk'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Refunds and returns are matched by order and SKU; a return logged without them cannot be matched.', 'Windows are your settings. Customer e-mails are masked in what the model sees; the report file on your disk keeps them.', LIMITS.advice],
  },
  draft: {
    noun: 'return_reminders', verb: 'send', category: 'binding_send',
    description: 'Write drafts/return_reminders-customers.md: one polite reminder text and the list of orders refunded but not returned. Marked DRAFT. Sending goes through refunds_request_send (one click); a person sends the reminders.',
    build: (a, ctx, r) => { const d = remindersText(r.items); if (!d.orders.length) throw new Error('no refund is past its return window'); return { id: 'customers', text: d.text, extra: { orders: d.orders } }; },
  },
  refused: [
    { name: 'issue_refund', category: 'move_money', description: 'Fairshop Refunds and Returns never refunds or reverses a refund.' },
    { name: 'customer_email_send', category: 'binding_send', description: 'Fairshop Refunds and Returns never e-mails a customer; a person sends the reviewed reminders.' },
  ],
  prompt: { name: 'refunds_vs_returns', title: 'Match refunds to returns received', description: 'Walks the host model through refunds and returns.',
    text: 'You are helping a store owner match refunds to returns with fairshop-refunds-returns. Refunds: {{refunds}}. Returns: {{returns}}.\n\nRules: customer e-mails are masked; never ask for them. issue_refund and customer_email_send are blocked.\n\n1. Call refunds_audit (with order lines and settings when available). Lead with money at risk, then customers owed a refund.\n2. refunds_explain for an order.\n3. refunds_write_report.\n4. Offer refunds_draft_return_reminders; refunds_request_send only when asked (one named click).' },
});
