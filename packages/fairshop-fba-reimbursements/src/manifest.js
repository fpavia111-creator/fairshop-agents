import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { ADJUSTMENT_FIELDS, ADJUSTMENT_PROFILES, REIMBURSEMENT_FIELDS, REIMBURSEMENT_PROFILES, RETURN_FIELDS, RETURN_PROFILES, REFUND_FIELDS, REIMB_SETTINGS_SCHEMA, findReimbursements, caseText } from './reimbursements.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  adjustments: { type: 'string', description: 'FBA inventory adjustments or Inventory Ledger export under --root: date, FNSKU, SKU, reason code, quantity' },
  reimbursements: { type: 'string', description: 'FBA Reimbursements report under --root (optional): reimbursement id, SKU, reason, quantity, amount, order id' },
  returns: { type: 'string', description: 'FBA customer returns report under --root (optional): order id, SKU, return date, quantity' },
  refunds: { type: 'string', description: 'Refunds export under --root (optional): order id, SKU, refund date, amount, quantity' },
  settings: { type: 'string', description: 'Optional settings JSON: reason codes, wait_days, claim_window_days, return_grace_days, unit_values by SKU, low_pct' },
  as_of: AS_OF,
};
const run = (a, ctx) => findReimbursements({ adjustments: ctx.records(a.adjustments, 'adjustments'), reimbursements: a.reimbursements ? ctx.records(a.reimbursements, 'reimbursements') : [], returns: a.returns ? ctx.records(a.returns, 'returns') : [], refunds: a.refunds ? ctx.records(a.refunds, 'refunds') : [] }, a.settings ? ctx.readJson(a.settings, 'reimbursement_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.items_checked} item(s): ${r.claim} to claim (${r.claimable} estimated)${r.urgent.length ? `, ${r.urgent.length} due within 7 days` : ''}, ${r.waiting} still inside the wait, ${r.window_closed} past the window (${r.lost} lost), ${r.review} low reimbursement(s) to review, ${r.ok} settled.`;

export const manifest = shopAgent({
  pkg, prefix: 'reimburse', label: 'Fairshop FBA Reimbursements',
  description: 'Finds Amazon FBA reimbursements owed: units lost or damaged in the warehouse and not found or reimbursed, refunds whose customer return never arrived, and reimbursements below your unit value, each with a claim-by date. Drafts the case text; a person files it in Seller Central.',
  files, required: ['adjustments'],
  sources: {
    adjustments: { label: 'FBA inventory adjustments', args: ['adjustments'], fields: ADJUSTMENT_FIELDS, profiles: ADJUSTMENT_PROFILES },
    reimbursements: { label: 'FBA reimbursements', args: ['reimbursements'], fields: REIMBURSEMENT_FIELDS, profiles: REIMBURSEMENT_PROFILES },
    returns: { label: 'FBA customer returns', args: ['returns'], fields: RETURN_FIELDS, profiles: RETURN_PROFILES },
    refunds: { label: 'Refunds', args: ['refunds'], fields: REFUND_FIELDS },
  },
  configSchemas: { reimbursement_settings: REIMB_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Find FBA reimbursements owed', description: 'Work out, per SKU and per refunded order, what Amazon still owes: lost or damaged units not found or reimbursed, refunds with no return, low reimbursements. Gives a claim-by date for each and the total claimable.' },
  explain: { arg: 'item', argDescription: 'SKU, order id or item id (SKU:..., ORDER:..., REIMB:...) from reimburse_audit', title: 'Explain one SKU or order', description: 'Show one SKU, refunded order or reimbursement with its units, value, claim-by date and reasons.', match: (i, w) => [i.id, i.sku, i.order_id].some((x) => x && x.toUpperCase() === w.toUpperCase()), text: (i) => `${i.id}: ${i.status}, ${i.units} unit(s) to claim${i.value ? ` (${i.value})` : ''}${i.claim_by ? `, claim by ${i.claim_by}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'fba-reimbursements', title: 'FBA reimbursements owed', description: 'Write fba-reimbursements.csv and .html (every item that is not settled) and claim-deadlines.ics (one event per claim-by date) into out_dir (default fairshop-out/reimburse).',
    columns: ['id', 'sku', 'order_id', 'units', 'units_waiting', 'units_closed', 'claim_by', 'status', 'value', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'sku', 'order_id', 'units', 'claim_by', 'status', 'value', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'sku', 'order_id', 'units', 'units_waiting', 'units_closed', 'claim_by'], 'value'),
    sections: (r) => [{ title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Reason codes, wait and claim windows are settings: confirm them against your own Seller Central reports and the current program rules.', 'Values are estimates from your unit values; Amazon decides what it pays.', LIMITS.advice],
    ics: (r) => { const by = new Map(); for (const i of r.items.filter((x) => x.status === 'claim' && x.claim_by)) by.set(i.claim_by, [...(by.get(i.claim_by) || []), i.id]); return { file: 'claim-deadlines.ics', calName: 'FBA claim deadlines', events: [...by.entries()].sort().map(([date, ids]) => ({ uid: `reimburse-${date}@fairshop`, date, summary: `FBA claims due: ${ids.length} item(s)`, description: `Written by fairshop-fba-reimbursements: ${ids.join(', ')}. File in Seller Central before this date.`, reminders: [3] })) }; },
  },
  draft: {
    noun: 'reimbursement_case', verb: 'file', category: 'binding_send',
    description: 'Write drafts/reimbursement_case-claims.md listing every claimable SKU and order (and low reimbursements) with units, value and claim-by date. Marked DRAFT. Filing goes through reimburse_request_file (one click); a person files it in Seller Central.',
    args: { from: { type: 'string', description: 'Your name and store' }, account: { type: 'string', description: 'Your merchant token' } },
    build: (a, ctx, r) => { const d = caseText(r.items, a); if (!d.claims.length) throw new Error('nothing to claim: no item is inside its claim window'); return { id: 'claims', text: d.text, amount: d.total, extra: { claims: d.claims } }; },
  },
  refused: [
    { name: 'seller_central_case_submit', category: 'binding_send', description: 'Fairshop FBA Reimbursements never logs in to Seller Central or opens a case; a person files the reviewed draft.' },
    { name: 'removal_order_create', category: 'go_live', description: 'Fairshop FBA Reimbursements never creates removal or disposal orders.' },
  ],
  prompt: { name: 'fba_reimbursements', title: 'Find FBA reimbursements before the window closes', description: 'Walks the host model through an FBA reimbursement check.',
    text: 'You are helping an Amazon seller find FBA reimbursements with fairshop-fba-reimbursements. Adjustments: {{adjustments}}.\n\nRules: windows and reason codes are the seller\'s settings; do not state Amazon\'s rules. seller_central_case_submit is blocked.\n\n1. Call reimburse_audit (with reimbursements, returns, refunds and settings files when the person has them). Lead with anything due within 7 days, then the claimable total.\n2. reimburse_explain for any SKU or order.\n3. reimburse_write_report for the worklist and the deadline calendar.\n4. Offer reimburse_draft_reimbursement_case; reimburse_request_file only when asked (one named click).' },
});
