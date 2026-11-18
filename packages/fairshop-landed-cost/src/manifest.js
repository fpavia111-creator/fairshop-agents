import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { LINE_FIELDS, COST_FIELDS, RECORDED_FIELDS, LANDED_SETTINGS_SCHEMA, landedCost, updatesText } from './landed.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  lines: { type: 'string', description: 'Shipment lines under --root: shipment (container or entry), PO, SKU, quantity, unit cost, unit weight' },
  costs: { type: 'string', description: 'Import costs under --root: shipment, cost type (freight, duty, broker, insurance, drayage), amount' },
  recorded: { type: 'string', description: 'Costs recorded in your store or books under --root (optional): SKU, recorded unit cost' },
  settings: { type: 'string', description: 'Optional settings JSON: basis per cost type (weight, value or units), variance_pct' },
};
const run = (a, ctx) => landedCost(ctx.records(a.lines, 'lines'), ctx.records(a.costs, 'costs'), a.recorded ? ctx.records(a.recorded, 'recorded') : [], a.settings ? ctx.readJson(a.settings, 'landed_settings') : {});
const line = (r) => `${r.shipments} shipment(s), ${r.skus} SKU(s): ${r.allocated} in import costs spread, ${r.unallocated} with no shipment; ${r.review} to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'landed', label: 'Fairshop Landed Cost',
  description: 'Spreads freight, duty, broker and other import costs over the SKUs of each shipment (by weight, value or units, as you set) to get a landed unit cost, compares it with the cost recorded in your store, and lists shipments with no costs and costs with no shipment. Drafts cost updates; a person changes any cost.',
  files, required: ['lines', 'costs'],
  sources: { lines: { label: 'Shipment lines', args: ['lines'], fields: LINE_FIELDS }, costs: { label: 'Import costs', args: ['costs'], fields: COST_FIELDS }, recorded: { label: 'Recorded costs', args: ['recorded'], fields: RECORDED_FIELDS } },
  configSchemas: { landed_settings: LANDED_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'calculate', title: 'Work out landed unit costs', description: 'Spread each shipment\'s import costs over its lines and work out a landed unit cost per SKU, weighted across shipments.' },
  explain: { arg: 'sku', argDescription: 'SKU or shipment id from landed_calculate', title: 'Explain one SKU', description: 'Show the purchase cost, the import costs spread onto one SKU and its landed unit cost.', match: (i, w) => i.sku === w.toUpperCase() || i.id.toUpperCase() === w.toUpperCase() || i.id === `SHIP:${w}`, text: (i) => `${i.id}: ${i.status}${i.landed_unit !== null ? `, unit cost ${i.unit_cost}, landed ${i.landed_unit}${i.recorded !== null ? `, recorded ${i.recorded}` : ''}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'landed-cost', title: 'Landed cost by SKU', description: 'Write landed-cost.csv (every SKU with its landed unit cost) and .html (by shipment, every SKU) into out_dir (default fairshop-out/landed).',
    columns: ['id', 'sku', 'units', 'unit_cost', 'landed_unit', 'recorded', 'variance_pct', 'status', 'extra', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'units', 'unit_cost', 'landed_unit', 'recorded', 'variance_pct', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items, ['id', 'sku', 'units', 'unit_cost', 'landed_unit', 'recorded', 'variance_pct'], 'extra'),
    sections: (r) => [{ title: 'By shipment', rows: r.by_shipment, columns: ['shipment', 'lines', 'costs'] }, { title: 'Costs allocated', rows: r.items.filter((i) => i.kind === 'sku').map((i) => ({ sku: i.sku, extra: i.extra, landed_unit: i.landed_unit })), columns: ['sku', 'extra', 'landed_unit'] }],
    limits: [LIMITS.files, 'How each cost is spread is your setting; duty is spread by value here, not computed from tariff rates.', 'Not accounting or customs advice.'],
  },
  draft: {
    noun: 'cost_updates', verb: 'approve', category: 'go_live',
    description: 'Write drafts/cost_updates-skus.md: every SKU whose recorded cost is off the landed cost, with the landed figure. Marked DRAFT. Approving goes through landed_request_approve (one click); a person changes costs.',
    build: (a, ctx, r) => { const d = updatesText(r.items); if (!d.skus.length) throw new Error('every recorded cost is within your variance'); return { id: 'skus', text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'store_cost_update', category: 'go_live', description: 'Fairshop Landed Cost never changes a cost in a store or ledger.' },
    { name: 'inventory_revalue_post', category: 'go_live', description: 'Fairshop Landed Cost never posts an inventory revaluation.' },
  ],
  prompt: { name: 'landed_cost', title: 'Work out landed costs for imported stock', description: 'Walks the host model through landed costs.',
    text: 'You are helping an importer work out landed costs with fairshop-landed-cost. Lines: {{lines}}. Costs: {{costs}}.\n\nRules: duty is spread from the costs file, not computed. store_cost_update is blocked.\n\n1. Call landed_calculate (with recorded costs when available). Lead with SKUs whose recorded cost is far off.\n2. landed_explain for a SKU.\n3. landed_write_report.\n4. Offer landed_draft_cost_updates; landed_request_approve only when asked (one named click).' },
});
