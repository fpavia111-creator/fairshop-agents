import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { STORAGE_FIELDS, STORAGE_PROFILES, LOT_FIELDS, STORAGE_SETTINGS_SCHEMA, auditStorage, planText } from './storage.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  storage: { type: 'string', description: 'Monthly storage fee report under --root: month, SKU, size tier, average quantity on hand, volume per unit, fee' },
  lots: { type: 'string', description: 'Inventory lots under --root (optional): SKU, received date, quantity still on hand' },
  settings: { type: 'string', description: 'Settings JSON you confirm: storage rates per cubic foot by size tier and season, aged-inventory brackets, unit margins, warn_days' },
  as_of: AS_OF,
};
const run = (a, ctx) => auditStorage(ctx.records(a.storage, 'storage'), a.lots ? ctx.records(a.lots, 'lots') : [], ctx.readJson(a.settings, 'storage_settings'), { asOf: a.as_of });
const line = (r) => `${r.items_checked} item(s): ${r.dispute} storage fee(s) above your rates (${r.over} over), ${r.act} lot(s) to act on before the next aged bracket, ${r.review} to review (about ${r.aged_monthly} a month in aged surcharges), ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'storage', label: 'Fairshop FBA Storage Fees',
  description: 'Checks FBA monthly storage fees against the rates you confirm, warns before lots cross into the next aged-inventory bracket, lists lots already paying a surcharge and SKUs whose storage costs more than their margin. Drafts an aged-inventory plan; a person decides removals.',
  files, required: ['storage', 'settings'],
  sources: { storage: { label: 'Monthly storage fees', args: ['storage'], fields: STORAGE_FIELDS, profiles: STORAGE_PROFILES }, lots: { label: 'Inventory lots', args: ['lots'], fields: LOT_FIELDS } },
  configSchemas: { storage_settings: STORAGE_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check storage and aged-inventory fees', description: 'Check every monthly storage fee against your rates, age every inventory lot against your aged-inventory brackets, and compare storage per unit with each SKU margin.' },
  explain: { arg: 'sku', argDescription: 'SKU or item id (FEE:..., LOT:..., SKU:...) from storage_audit', title: 'Explain one SKU', description: 'Show the storage fees, lots and margin check of one SKU.', match: (i, w) => i.id.toUpperCase() === w.toUpperCase() || i.sku === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}${i.expected !== null ? `, charged ${i.fee}, expected ${i.expected}` : ''}${i.act_by ? `, act by ${i.act_by}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'fba-storage', title: 'FBA storage and aged-inventory fees', description: 'Write fba-storage.csv and .html (every fee line above your rates, every lot to act on or review, every SKU over its margin) into out_dir (default fairshop-out/storage).',
    columns: ['id', 'sku', 'month', 'qty', 'fee', 'expected', 'act_by', 'status', 'monthly', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'qty', 'fee', 'expected', 'act_by', 'status', 'monthly', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'sku', 'month', 'qty', 'fee', 'expected', 'act_by'], 'monthly'),
    sections: (r) => [{ title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, LIMITS.settings, 'Surcharge amounts are estimates from your brackets and the volume in the storage report.', LIMITS.advice],
  },
  draft: {
    noun: 'aged_inventory_plan', verb: 'approve', category: 'go_live',
    description: 'Write drafts/aged_inventory_plan-lots.md listing every lot to act on or review, with units, act-by date and monthly surcharge, and a blank decision per lot. Approving goes through storage_request_approve (one click); a person creates any removal or promotion.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = planText(r.items, a); if (!d.lots.length) throw new Error('no lot is near or in an aged-inventory bracket'); return { id: 'lots', text: d.text, extra: { lots: d.lots } }; },
  },
  refused: [
    { name: 'removal_order_create', category: 'go_live', description: 'Fairshop FBA Storage Fees never creates removal, disposal or liquidation orders.' },
    { name: 'storage_fee_case_submit', category: 'binding_send', description: 'Fairshop FBA Storage Fees never opens a case about fees; a person does.' },
  ],
  prompt: { name: 'fba_storage_review', title: 'Check FBA storage fees and aged inventory', description: 'Walks the host model through a storage and aged-inventory check.',
    text: 'You are helping an Amazon seller with storage costs, using fairshop-fba-storage-fees. Storage report: {{storage}}. Settings: {{settings}}.\n\nRules: rates and brackets are the seller\'s confirmed settings. removal_order_create is blocked.\n\n1. Call storage_audit (with lots when available). Lead with lots to act on and their dates.\n2. storage_explain for a SKU.\n3. storage_write_report.\n4. Offer storage_draft_aged_inventory_plan; storage_request_approve only when asked (one named click).' },
});
