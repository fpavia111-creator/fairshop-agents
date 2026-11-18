import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { SALES_FIELDS, COST_FIELDS, LABEL_FIELDS, MARGIN_SETTINGS_SCHEMA, marginBySku, reviewText } from './margins.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  sales: { type: 'string', description: 'Sales lines under --root: order, date, channel, SKU, quantity, revenue (after discounts, before tax), shipping charged, fees' },
  costs: { type: 'string', description: 'Unit costs under --root: SKU, unit cost (landed, if you have it)' },
  labels: { type: 'string', description: 'Shipping label costs under --root (optional): order, label cost; split across the order lines by revenue' },
  settings: { type: 'string', description: 'Optional settings JSON: margin_floor_pct' },
};
const run = (a, ctx) => marginBySku(ctx.records(a.sales, 'sales'), ctx.records(a.costs, 'costs'), a.labels ? ctx.records(a.labels, 'labels') : [], a.settings ? ctx.readJson(a.settings, 'margin_settings') : {});
const line = (r) => `${r.combos} SKU and channel pair(s), revenue ${r.revenue}, contribution ${r.contribution}: ${r.fix} losing money, ${r.review} under your floor or with no cost, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'margins', label: 'Fairshop SKU Margins',
  description: 'Works out contribution margin per SKU and channel from sales, fees, shipping labels and unit costs: SKUs that lose money on a channel, SKUs under your margin floor, and SKUs with no cost on file. Drafts a pricing review; a person changes any price.',
  files, required: ['sales', 'costs'],
  sources: { sales: { label: 'Sales lines', args: ['sales'], fields: SALES_FIELDS }, costs: { label: 'Unit costs', args: ['costs'], fields: COST_FIELDS }, labels: { label: 'Shipping labels', args: ['labels'], fields: LABEL_FIELDS } },
  configSchemas: { margin_settings: MARGIN_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'margins', title: 'Work out margin per SKU and channel', description: 'Income (revenue plus shipping charged) less unit cost, fees and shipping labels for every SKU on every channel, with the margin percent.' },
  explain: { arg: 'sku', argDescription: 'SKU or channel|SKU id from margins_margins', title: 'Explain one SKU', description: 'Show the income, costs and margin of one SKU on every channel.', match: (i, w) => i.sku === w.toUpperCase() || i.id.toUpperCase() === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}, income ${i.income}, cost ${i.cogs}, fees ${i.fees}, shipping ${i.shipping_cost}, contribution ${i.contribution ?? 'n/a'} (${i.margin_pct ?? 'n/a'}%). ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'sku-margins', title: 'Margin by SKU and channel', description: 'Write sku-margins.csv (every SKU and channel) and .html (by channel, every pair) into out_dir (default fairshop-out/margins).',
    columns: ['id', 'channel', 'sku', 'units', 'income', 'cogs', 'fees', 'shipping_cost', 'margin_pct', 'status', 'contribution', 'findings', 'reasons', 'decision'],
    htmlColumns: ['channel', 'sku', 'units', 'income', 'cogs', 'fees', 'shipping_cost', 'contribution', 'margin_pct', 'status'],
    rows: (r) => worklistRows(r.items, ['id', 'channel', 'sku', 'units', 'income', 'cogs', 'fees', 'shipping_cost', 'margin_pct'], 'contribution'),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'income', 'contribution', 'margin_pct'] }],
    limits: [LIMITS.files, 'Contribution here is income less unit cost, the fees in your file and shipping labels; it leaves out ads, storage, returns and overheads.', 'Label costs are split across an order\'s lines by revenue.', LIMITS.advice],
  },
  draft: {
    noun: 'pricing_review', verb: 'approve', category: 'go_live',
    description: 'Write drafts/pricing_review-skus.md: every SKU and channel losing money, under the floor or without a cost, with a blank option. Marked DRAFT. Approving goes through margins_request_approve (one click); a person changes prices.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = reviewText(r.items, a); if (!d.skus.length) throw new Error('every SKU and channel is above your floor'); return { id: 'skus', text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'price_update', category: 'go_live', description: 'Fairshop SKU Margins never changes a price.' },
    { name: 'promotion_create', category: 'go_live', description: 'Fairshop SKU Margins never creates or ends a promotion.' },
  ],
  prompt: { name: 'sku_margins', title: 'Find SKUs that lose money on a channel', description: 'Walks the host model through SKU margins.',
    text: 'You are helping a seller understand SKU margins with fairshop-sku-margins. Sales: {{sales}}. Costs: {{costs}}.\n\nRules: say what the contribution leaves out. price_update and promotion_create are blocked.\n\n1. Call margins_margins (with labels when available). Lead with SKUs losing money.\n2. margins_explain for a SKU.\n3. margins_write_report.\n4. Offer margins_draft_pricing_review; margins_request_approve only when asked (one named click).' },
});
