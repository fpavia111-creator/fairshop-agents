import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { ADJ_FIELDS, ADJ_PROFILES, LABEL_FIELDS, ADJ_SETTINGS_SCHEMA, checkAdjustments, disputeText } from './adjustments.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  adjustments: { type: 'string', description: 'Carrier adjustment lines under --root (UPS billing adjustments, USPS APV, FedEx or your own CSV): tracking, date, carrier, reason, amount, billed weight' },
  labels: { type: 'string', description: 'Labels as bought under --root: tracking, order, SKU, entered weight, length, width, height' },
  settings: { type: 'string', description: 'Optional settings JSON: dim_divisor per carrier, dispute_window_days, repeat_min' },
  as_of: AS_OF,
};
const run = (a, ctx) => checkAdjustments(ctx.records(a.adjustments, 'adjustments'), ctx.records(a.labels, 'labels'), a.settings ? ctx.readJson(a.settings, 'adjustment_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.adjustments} adjustment(s), ${r.total} in total: ${r.dispute} your label data disproves (${r.disputable} to dispute), ${r.fix_data} where your product data is wrong, ${r.review} to review, ${r.window_closed} past the window (${r.lost}).`;

export const manifest = shopAgent({
  pkg, prefix: 'adjustments', label: 'Fairshop Carrier Adjustments',
  description: 'Checks carrier adjustments (UPS, FedEx, USPS) against the weight and dimensions entered on each label: adjustments your own data disproves, with a dispute-by date; adjustments that are right because product data is wrong, and the SKUs that keep causing them; address corrections; adjustments past the window. Drafts the dispute; a person files it.',
  files, required: ['adjustments', 'labels'],
  sources: { adjustments: { label: 'Carrier adjustments', args: ['adjustments'], fields: ADJ_FIELDS, profiles: ADJ_PROFILES }, labels: { label: 'Labels as bought', args: ['labels'], fields: LABEL_FIELDS } },
  configSchemas: { adjustment_settings: ADJ_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check carrier adjustments against your labels', description: 'Recompute the billable weight from the weight and dimensions on each label and compare it with the adjusted weight; group repeat SKUs.' },
  explain: { arg: 'tracking', argDescription: 'Tracking number or SKU from adjustments_audit', title: 'Explain one adjustment', description: 'Show one adjustment (or SKU) and what your label data says.', match: (i, w) => i.tracking.toUpperCase() === w.toUpperCase() || i.id === `SKU:${w.toUpperCase()}`, text: (i) => `${i.id}: ${i.status}, ${i.amount}${i.dispute_by ? `, dispute by ${i.dispute_by}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'carrier-adjustments', title: 'Carrier adjustments', description: 'Write carrier-adjustments.csv and .html (by SKU, every adjustment) and dispute-deadlines.ics into out_dir (default fairshop-out/adjustments).',
    columns: ['id', 'tracking', 'carrier', 'sku', 'order_id', 'date', 'reason', 'dispute_by', 'status', 'amount', 'findings', 'reasons', 'decision'],
    htmlColumns: ['tracking', 'carrier', 'sku', 'date', 'reason', 'dispute_by', 'status', 'amount'],
    rows: (r) => worklistRows(r.items, ['id', 'tracking', 'carrier', 'sku', 'order_id', 'date', 'reason', 'dispute_by']),
    sections: (r) => [{ title: 'By SKU', rows: r.items.filter((i) => i.kind === 'sku').map((i) => ({ sku: i.sku, amount: i.amount, detail: i.findings[0].detail })), columns: ['sku', 'amount', 'detail'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Dimensional divisors and dispute windows are your settings from your carrier agreement.', 'A dispute is stronger with photos of the packed box; the agent cannot see the box.', LIMITS.advice],
    ics: (r) => ({ file: 'dispute-deadlines.ics', calName: 'Carrier dispute deadlines', events: r.items.filter((i) => i.status === 'dispute').map((i) => ({ uid: `adj-${i.tracking}@fairshop`, date: i.dispute_by, summary: `Dispute ${i.carrier} adjustment ${i.tracking}: ${i.amount}`, description: 'Written by fairshop-carrier-adjustments.', reminders: [2] })) }),
  },
  draft: {
    noun: 'adjustment_dispute', verb: 'file', category: 'binding_send',
    description: 'Write drafts/adjustment_dispute-<carrier>.md listing every adjustment your label data disproves, inside its window. Marked DRAFT. Filing goes through adjustments_request_file (one click); a person files it.',
    args: { carrier: { type: 'string', description: 'Carrier to dispute with (UPS, FedEx, USPS)' }, account: { type: 'string', description: 'Your shipper account' }, from: { type: 'string', description: 'Your name and company' } },
    build: (a, ctx, r) => { const d = disputeText(r.items, a); if (!d.trackings.length) throw new Error('no adjustment to dispute inside its window'); return { id: a.carrier || 'carrier', text: d.text, amount: d.total, extra: { trackings: d.trackings } }; },
  },
  refused: [
    { name: 'carrier_dispute_submit', category: 'binding_send', description: 'Fairshop Carrier Adjustments never files a dispute in a carrier portal.' },
    { name: 'invoice_pay', category: 'move_money', description: 'Fairshop Carrier Adjustments never pays a carrier invoice.' },
  ],
  prompt: { name: 'carrier_adjustments', title: 'Dispute carrier adjustments your data disproves', description: 'Walks the host model through carrier adjustments.',
    text: 'You are helping a shipper with carrier adjustments, using fairshop-carrier-adjustments. Adjustments: {{adjustments}}. Labels: {{labels}}.\n\nRules: carrier_dispute_submit and invoice_pay are blocked.\n\n1. Call adjustments_audit. Lead with disputes and their dates, then SKUs whose data is wrong.\n2. adjustments_explain for a tracking number.\n3. adjustments_write_report.\n4. Offer adjustments_draft_adjustment_dispute; adjustments_request_file only when asked (one named click).' },
});
