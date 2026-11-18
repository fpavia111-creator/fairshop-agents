import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { RETURN_FIELDS, ORDER_FIELDS, REASON_SETTINGS_SCHEMA, analyseReturns, reviewText } from './reasons.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  returns: { type: 'string', description: 'Returns export under --root (store, marketplace or returns app): order, SKU, date, reason, quantity, customer e-mail' },
  orders: { type: 'string', description: 'Order lines under --root for the same period: order, SKU, quantity, date, customer e-mail' },
  settings: { type: 'string', description: 'Optional settings JSON: sku_min_units, sku_rate_pct, returner_min_returns, returner_rate_pct, your own reason groups' },
};
const run = (a, ctx) => analyseReturns(ctx.records(a.returns, 'returns'), ctx.records(a.orders, 'orders'), a.settings ? ctx.readJson(a.settings, 'reason_settings') : {});
const line = (r) => `${r.units_returned} of ${r.units_sold} unit(s) returned (${r.return_rate_pct}%). ${r.flagged_skus} SKU(s) returned well above the rest, ${r.repeat_returners} customer(s) returning most of what they buy. Top reason: ${(r.by_reason[0] || { reason: 'none' }).reason}.`;

export const manifest = shopAgent({
  pkg, prefix: 'returns', label: 'Fairshop Return Reasons',
  description: 'Reads return reasons by SKU and by customer: SKUs returned far more than the rest and why (listing, size, quality, fulfilment), and customers who return most of what they buy, with names and e-mails masked. Drafts a listing review; a person changes any listing and decides about any customer.',
  files, required: ['returns', 'orders'],
  sources: { returns: { label: 'Returns', args: ['returns'], fields: RETURN_FIELDS }, orders: { label: 'Order lines', args: ['orders'], fields: ORDER_FIELDS } },
  configSchemas: { reason_settings: REASON_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'analyse', title: 'Read return reasons by SKU and customer', description: 'Group returns by reason, work out the return rate of every SKU and every customer, and list SKUs and customers well above your thresholds with the likely owner of the fix.' },
  explain: { arg: 'sku', argDescription: 'SKU or customer id (CUST-...) from returns_analyse', title: 'Explain one SKU or customer', description: 'Show the sales, returns, reasons and findings of one SKU or customer.', match: (i, w) => i.id.toUpperCase() === w.toUpperCase() || (i.sku && i.sku === w.toUpperCase()), text: (i) => `${i.id}: ${i.units_returned} of ${i.units_sold} returned (${i.return_rate_pct}%)${i.top_reason ? `, top reason ${i.top_reason}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'return-reasons', title: 'Return reasons and repeat returners', description: 'Write return-reasons.csv and .html (reasons, flagged SKUs and customers) into out_dir (default fairshop-out/returns).',
    columns: ['id', 'kind', 'sku', 'units_sold', 'units_returned', 'return_rate_pct', 'top_reason', 'owner', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'units_sold', 'units_returned', 'return_rate_pct', 'top_reason', 'owner', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'kind', 'sku', 'units_sold', 'units_returned', 'return_rate_pct', 'top_reason', 'owner']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By reason', rows: r.by_reason, columns: ['reason', 'units', 'owner'] }, { title: 'By SKU', rows: r.items.filter((i) => i.kind === 'sku').map((i) => ({ sku: i.sku, units_sold: i.units_sold, units_returned: i.units_returned, return_rate_pct: i.return_rate_pct, top_reason: i.top_reason })), columns: ['sku', 'units_sold', 'units_returned', 'return_rate_pct', 'top_reason'] }, { title: 'Repeat returners', rows: r.items.filter((i) => i.kind === 'customer' && i.status === 'review').map((i) => ({ customer: i.id, orders: i.units_sold, returned: i.units_returned, return_rate_pct: i.return_rate_pct })), columns: ['customer', 'orders', 'returned', 'return_rate_pct'] }],
    limits: [LIMITS.files, 'Reasons are grouped from the words customers pick; a wrong reason code gives a wrong group. Add your own wording under groups.', 'Returning is a customer right. The repeat-returner list is for a person to read, never to block anyone automatically.', LIMITS.advice],
  },
  draft: {
    noun: 'listing_review', verb: 'approve', category: 'go_live',
    description: 'Write drafts/listing_review-skus.md listing every SKU returned well above the rest, its top reason and owner, with a blank change per SKU. Approving goes through returns_request_approve (one click); a person changes the listings.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = reviewText(r.items, a); if (!d.skus.length) throw new Error('no SKU is returned above your threshold'); return { id: 'skus', text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'customer_block', category: 'revoke_access', description: 'Fairshop Return Reasons never blocks, flags or tags a customer in a store.' },
    { name: 'listing_update', category: 'go_live', description: 'Fairshop Return Reasons never changes a product page.' },
  ],
  prompt: { name: 'return_reasons', title: 'Find out why things come back', description: 'Walks the host model through return reasons.',
    text: 'You are helping a store owner understand returns with fairshop-return-reasons. Returns: {{returns}}. Orders: {{orders}}.\n\nRules: customers are masked; never ask who they are. customer_block and listing_update are blocked. Do not suggest blocking a customer.\n\n1. Call returns_analyse. Lead with SKUs returned well above the rest and their owner.\n2. returns_explain for a SKU or customer.\n3. returns_write_report.\n4. Offer returns_draft_listing_review; returns_request_approve only when asked (one named click).' },
});
