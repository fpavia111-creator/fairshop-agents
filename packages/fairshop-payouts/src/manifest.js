import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS, channelKey, channelLabel } from 'fairshop-core';
import { ORDER_FIELDS, ORDER_PROFILES, PAYOUT_FIELDS, PAYOUT_PROFILES, PAYOUT_SETTINGS_SCHEMA, reconcilePayouts, inquiryText } from './payouts.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  orders: { type: 'string', description: 'Orders export under --root (Shopify, WooCommerce, BigCommerce or any CSV/Excel with order number, channel, date, total, refunded, status, payment method)' },
  payouts: { type: 'string', description: 'Payout or settlement lines under --root (Shopify Payments, Stripe, PayPal, Amazon, eBay, Etsy or Walmart export), one row per order line in a payout' },
  settings: { type: 'string', description: 'Optional settings JSON: payout_days and max_fee_pct per channel, tolerance, skip_statuses, skip_gateways' },
  as_of: AS_OF,
};
const run = (a, ctx) => reconcilePayouts(ctx.records(a.orders, 'orders'), ctx.records(a.payouts, 'payouts'), { settings: a.settings ? ctx.readJson(a.settings, 'payout_settings') : {}, asOf: a.as_of });
const line = (r) => `${r.owed} not paid out or short (${r.chase} order(s) to chase). ${r.orders} order(s) on ${r.channels} channel(s): ${r.waiting} still inside the payout window, ${r.review} to review, ${r.ok} paid in full, ${r.skipped} skipped.`;

export const manifest = shopAgent({
  pkg, prefix: 'payouts', label: 'Fairshop Payouts',
  description: 'Matches every order to the payout lines from Shopify Payments, Stripe, PayPal, Amazon, eBay, Etsy and Walmart exports: orders never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate, and payout lines with no order. Drafts an inquiry per channel; a person sends it.',
  files, required: ['orders', 'payouts'],
  sources: {
    orders: { label: 'Orders', args: ['orders'], fields: ORDER_FIELDS, profiles: ORDER_PROFILES },
    payouts: { label: 'Payout and settlement lines', args: ['payouts'], fields: PAYOUT_FIELDS, profiles: PAYOUT_PROFILES },
  },
  configSchemas: { payout_settings: PAYOUT_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Match orders to payouts', description: 'Match every order to its payout lines by channel. Returns what is missing (to chase), what is still inside the payout window, what to review (paid twice, refunds not yet deducted, fees above your rate, payout lines with no order) and totals by channel.' },
  explain: { arg: 'order_id', argDescription: 'Order number (with or without #) or a payout line id from payouts_audit', title: 'Explain one order', description: 'Show one order: expected, received, fees, the payouts it appears in and why it was flagged.', match: (i, want) => i.id === want.replace(/^#\s*/, '').toUpperCase() || i.id.toUpperCase() === want.toUpperCase(), text: (i) => `${i.order_id || i.id} (${i.channel}): ${i.status}. Expected ${i.expected}, received ${i.received}, fees ${i.fees}${i.owed ? `, missing ${i.owed}` : ''}${i.payouts.length ? `, in payout(s) ${i.payouts.join(', ')}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'payouts', title: 'Payouts against orders', description: 'Write payouts.csv (one row per order or payout line, with a blank decision column) and payouts.html (by channel, by finding, every row) into out_dir (default fairshop-out/payouts).',
    columns: ['id', 'order_id', 'channel', 'order_date', 'expected', 'received', 'fees', 'status', 'owed', 'findings', 'reasons', 'decision'],
    htmlColumns: ['order_id', 'channel', 'order_date', 'expected', 'received', 'fees', 'status', 'owed', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'order_id', 'channel', 'order_date', 'expected', 'received', 'fees'], 'owed'),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'expected', 'received', 'fees', 'owed'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'An order paid by a method that does not go through these payouts (manual, cash, gift card) is skipped; set skip_gateways for your own.', 'Payout timing and fee rates are the ones in your settings file. A marketplace may hold money in a reserve; reserve lines are listed as adjustments.', LIMITS.advice],
  },
  draft: {
    noun: 'payout_inquiry', verb: 'send', category: 'binding_send', actor: 'a person on your team',
    description: 'Write drafts/payout_inquiry-<channel>.md listing every order on one channel that was not paid out or was paid short, with the amount missing. Marked DRAFT with the support contact left to confirm. Sending goes through payouts_request_send (one click); a person sends it.',
    required: ['channel'], args: { channel: { type: 'string', description: 'Channel to ask about, as it appears in the files (Shopify, Amazon, Etsy, ...)' }, from: { type: 'string', description: 'Your name and store, for the From line' }, account: { type: 'string', description: 'Your store or seller id on that channel' } },
    build: (a, ctx, r) => {
      const k = channelKey(a.channel); const items = r.items.filter((i) => i.channel_key === k);
      if (!items.length) throw new Error(`no orders or payout lines for channel "${String(a.channel).slice(0, 40)}"`);
      const d = inquiryText(items, { channel: channelLabel(k), from: a.from, account: a.account });
      if (!d.orders.length) throw new Error(`nothing to chase on ${channelLabel(k)}: every order is paid, waiting or under review`);
      return { id: channelLabel(k), text: d.text, amount: d.total, extra: { orders: d.orders } };
    },
  },
  refused: [
    { name: 'balance_withdraw', category: 'move_money', description: 'Fairshop Payouts never moves money out of a payment or marketplace balance.' },
    { name: 'support_case_submit', category: 'binding_send', description: 'Fairshop Payouts never opens a case or messages a marketplace or processor; a person sends the reviewed inquiry.' },
  ],
  prompt: { name: 'payout_reconciliation', title: 'Find orders that were never paid out', description: 'Walks the host model through matching orders to payouts with Fairshop Payouts.',
    text: 'You are helping an e-commerce owner or bookkeeper check that every order was paid out, with fairshop-payouts. Orders: {{orders}}. Payout lines: {{payouts}}.\n\nRules: the agent never moves money and never contacts a channel. balance_withdraw and support_case_submit are blocked.\n\n1. Call payouts_audit. Lead with the total to chase by channel, then what is still inside the payout window.\n2. Explain any order the person asks about with payouts_explain.\n3. Call payouts_write_report for the worklist.\n4. Offer payouts_draft_payout_inquiry per channel. Only when asked, payouts_request_send with the draft path and sha256; it waits for one named click.' },
});
