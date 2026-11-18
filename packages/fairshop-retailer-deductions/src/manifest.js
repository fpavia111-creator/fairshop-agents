import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { DEDUCTION_FIELDS, INVOICE_FIELDS, POD_FIELDS, DEDUCTION_SETTINGS_SCHEMA, checkDeductions, disputeText } from './deductions.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  deductions: { type: 'string', description: 'Deductions from retailer remittances under --root: retailer, remittance, invoice, PO, deduction type and code, amount, date' },
  invoices: { type: 'string', description: 'Your wholesale invoices under --root: invoice, PO, retailer, amount, units shipped, ship date' },
  pods: { type: 'string', description: 'Proof of delivery under --root (optional): invoice, units delivered, signed (yes/no)' },
  settings: { type: 'string', description: 'Optional settings JSON: dispute_window_days per retailer, write_off_under, agreed allowance percents per retailer' },
  as_of: AS_OF,
};
const run = (a, ctx) => checkDeductions(ctx.records(a.deductions, 'deductions'), ctx.records(a.invoices, 'invoices'), a.pods ? ctx.records(a.pods, 'pods') : [], a.settings ? ctx.readJson(a.settings, 'deduction_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.deductions} deduction(s), ${r.deducted} taken: ${r.dispute} to dispute (${r.to_dispute}), ${r.review} to review, ${r.write_off} to write off, ${r.window_closed} past the window, ${r.ok} as agreed.`;

export const manifest = shopAgent({
  pkg, prefix: 'deductions', label: 'Fairshop Retailer Deductions',
  description: 'Checks deductions retailers take from wholesale remittances against your invoices and proof of delivery: shortages your signed POD disproves, allowances above what you agreed, deductions taken twice, compliance fines needing evidence, small ones to write off and ones past the window. Drafts a dispute per retailer; a person submits it.',
  files, required: ['deductions', 'invoices'],
  sources: { deductions: { label: 'Retailer deductions', args: ['deductions'], fields: DEDUCTION_FIELDS }, invoices: { label: 'Wholesale invoices', args: ['invoices'], fields: INVOICE_FIELDS }, pods: { label: 'Proof of delivery', args: ['pods'], fields: POD_FIELDS } },
  configSchemas: { deduction_settings: DEDUCTION_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check retailer deductions', description: 'Classify every deduction, check it against the invoice, proof of delivery and your agreed allowances, and give a dispute-by date.' },
  explain: { arg: 'invoice_number', argDescription: 'Invoice number or deduction id from deductions_audit', title: 'Explain the deductions on one invoice', description: 'Show every deduction taken on one invoice and why it was flagged.', match: (i, w) => i.invoice_number.toLowerCase() === w.toLowerCase() || i.id.toLowerCase() === w.toLowerCase(), text: (i) => `${i.id}: ${i.status}, ${i.type} ${i.amount}${i.recover ? `, dispute ${i.recover}` : ''}${i.dispute_by ? `, by ${i.dispute_by}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'retailer-deductions', title: (r) => `Retailer deductions as of ${r.as_of}`, description: 'Write retailer-deductions.csv and .html (by retailer, by type, every deduction not agreed) into out_dir (default fairshop-out/deductions).',
    columns: ['id', 'retailer', 'remit_id', 'invoice_number', 'type', 'code', 'amount', 'date', 'dispute_by', 'status', 'recover', 'findings', 'reasons', 'decision'],
    htmlColumns: ['retailer', 'invoice_number', 'type', 'amount', 'dispute_by', 'status', 'recover', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'retailer', 'remit_id', 'invoice_number', 'type', 'code', 'amount', 'date', 'dispute_by'], 'recover'),
    sections: (r) => [{ title: 'By retailer', rows: r.by_retailer, columns: ['retailer', 'count', 'amount', 'recover'] }, { title: 'By type', rows: r.by_type, columns: ['type', 'count', 'amount', 'recover'] }],
    limits: [LIMITS.files, 'Windows and agreed allowances are your settings from your vendor agreements.', LIMITS.advice],
  },
  draft: {
    noun: 'deduction_dispute', verb: 'send', category: 'binding_send',
    description: 'Write drafts/deduction_dispute-<retailer>.md listing every deduction of one retailer to dispute, with reasons and dates. Marked DRAFT. Sending goes through deductions_request_send (one click); a person submits it.',
    required: ['retailer'], args: { retailer: { type: 'string', description: 'Retailer to dispute with, as named in the files' }, from: { type: 'string', description: 'Your name and company' } },
    build: (a, ctx, r) => { const d = disputeText(r.items, a); if (!d.deductions.length) throw new Error(`nothing to dispute with ${String(a.retailer).slice(0, 40)}`); return { id: a.retailer, text: d.text, amount: d.total, extra: { deductions: d.deductions } }; },
  },
  refused: [
    { name: 'retailer_portal_submit', category: 'binding_send', description: 'Fairshop Retailer Deductions never submits a dispute in a retailer portal.' },
    { name: 'credit_memo_issue', category: 'move_money', description: 'Fairshop Retailer Deductions never issues a credit memo or refund.' },
  ],
  prompt: { name: 'retailer_deductions', title: 'Win back retailer deductions', description: 'Walks the host model through retailer deductions.',
    text: 'You are helping a brand with retailer deductions, using fairshop-retailer-deductions. Deductions: {{deductions}}. Invoices: {{invoices}}.\n\nRules: retailer_portal_submit and credit_memo_issue are blocked.\n\n1. Call deductions_audit (with proof of delivery and settings when available). Lead with disputes and their dates.\n2. deductions_explain for an invoice.\n3. deductions_write_report.\n4. Offer deductions_draft_deduction_dispute per retailer; deductions_request_send only when asked (one named click).' },
});
