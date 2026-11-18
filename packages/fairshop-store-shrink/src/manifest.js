import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { ADJ_FIELDS, ADJ_PROFILES, SALES_FIELDS, SHRINK_SETTINGS_SCHEMA, shrinkByStore, reviewText } from './shrink.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  adjustments: { type: 'string', description: 'Inventory adjustments under --root (Square inventory history or your own CSV): date, store, SKU, category, quantity change, unit cost, reason, counted by' },
  sales: { type: 'string', description: 'Net sales for the same period under --root: store, category, net sales' },
  settings: { type: 'string', description: 'Optional settings JSON: target_pct, unexplained_reasons, unexplained_pct, repeat_min' },
};
const run = (a, ctx) => shrinkByStore(ctx.records(a.adjustments, 'adjustments'), ctx.records(a.sales, 'sales'), a.settings ? ctx.readJson(a.settings, 'shrink_settings') : {});
const line = (r) => `${r.stores} store(s): shrink ${r.shrink} on ${r.sales} in sales (${r.shrink_pct}%); ${r.review} store(s) or SKU(s) to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'shrink', label: 'Fairshop Store Shrink',
  description: 'Works out shrink by store and category from inventory adjustments and sales: stores above your target, stores where most loss has no explained reason, and SKUs written off again and again. Drafts a loss-prevention review; never posts an adjustment or touches staff records.',
  files, required: ['adjustments', 'sales'],
  sources: { adjustments: { label: 'Inventory adjustments', args: ['adjustments'], fields: ADJ_FIELDS, profiles: ADJ_PROFILES }, sales: { label: 'Net sales', args: ['sales'], fields: SALES_FIELDS } },
  configSchemas: { shrink_settings: SHRINK_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'measure', title: 'Measure shrink by store', description: 'Value every adjustment at cost, put each store\'s shrink against its sales, and split it by category and reason.' },
  explain: { arg: 'store', argDescription: 'Store name or item id from shrink_measure', title: 'Explain one store', description: 'Show one store (or SKU) with shrink, percent of sales and findings.', match: (i, w) => i.store.toLowerCase() === w.toLowerCase() || i.id.toLowerCase() === w.toLowerCase(), text: (i) => `${i.id}: ${i.status}, shrink ${i.shrink}${i.shrink_pct !== null ? ` (${i.shrink_pct}% of sales)` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'store-shrink', title: 'Shrink by store', description: 'Write store-shrink.csv and .html (by store, by category, by reason, every store or SKU to review) into out_dir (default fairshop-out/shrink).',
    columns: ['id', 'store', 'sku', 'sales', 'shrink', 'shrink_pct', 'unexplained_pct', 'writeoffs', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['store', 'sku', 'sales', 'shrink', 'shrink_pct', 'unexplained_pct', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items, ['id', 'store', 'sku', 'sales', 'shrink', 'shrink_pct', 'unexplained_pct', 'writeoffs']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By store', rows: r.items.filter((i) => i.kind === 'store').map((i) => ({ store: i.store, sales: i.sales, shrink: i.shrink, shrink_pct: i.shrink_pct })), columns: ['store', 'sales', 'shrink', 'shrink_pct'] }, { title: 'By category', rows: r.by_category, columns: ['store', 'category', 'shrink', 'sales', 'shrink_pct'] }, { title: 'By reason', rows: r.by_reason, columns: ['reason', 'shrink'] }],
    limits: [LIMITS.files, 'Shrink is valued at the unit cost in your adjustments file. Who counted is masked in what the model sees; nothing here is a finding about a person.', LIMITS.advice],
  },
  draft: {
    noun: 'shrink_review', verb: 'send', category: 'binding_send',
    description: 'Write drafts/shrink_review-stores.md: every store and SKU to review, with a blank next step. Marked DRAFT. Sending goes through shrink_request_send (one click); a person sends it.',
    build: (a, ctx, r) => { const d = reviewText(r); if (!d.items.length) throw new Error('every store is within your target'); return { id: 'stores', text: d.text, amount: r.shrink, extra: { items: d.items } }; },
  },
  refused: [
    { name: 'inventory_adjust_post', category: 'go_live', description: 'Fairshop Store Shrink never posts or reverses an inventory adjustment.' },
    { name: 'employee_record_update', category: 'revoke_access', description: 'Fairshop Store Shrink never writes to a staff record or changes access.' },
  ],
  prompt: { name: 'store_shrink', title: 'Measure shrink by store', description: 'Walks the host model through shrink by store.',
    text: 'You are helping a retailer measure shrink with fairshop-store-shrink. Adjustments: {{adjustments}}. Sales: {{sales}}.\n\nRules: staff are masked; never speculate about people. inventory_adjust_post and employee_record_update are blocked.\n\n1. Call shrink_measure. Lead with stores above target and unexplained losses.\n2. shrink_explain for a store.\n3. shrink_write_report.\n4. Offer shrink_draft_shrink_review; shrink_request_send only when asked (one named click).' },
});
