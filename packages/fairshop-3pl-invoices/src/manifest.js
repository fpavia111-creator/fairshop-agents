import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { INVOICE_FIELDS, INVOICE_PROFILES, SHIPPED_FIELDS, RECEIPT_FIELDS, PALLET_FIELDS, RATECARD_SCHEMA, auditInvoice, disputeText } from './fulfillment.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  invoice: { type: 'string', description: '3PL invoice detail under --root: invoice number, date, charge type, reference (order, ASN or period), quantity, rate, amount' },
  ratecard: { type: 'string', description: 'Rate card JSON from your 3PL agreement: rates per charge, wording aliases, tolerance' },
  shipped: { type: 'string', description: 'Orders the 3PL shipped for you under --root (optional): order, units' },
  receipts: { type: 'string', description: 'Receipts under --root (optional): ASN or PO, units received' },
  pallets: { type: 'string', description: 'Your own pallet counts under --root (optional): period, pallets' },
};
const run = (a, ctx) => auditInvoice(ctx.records(a.invoice, 'invoice'), ctx.readJson(a.ratecard, 'ratecard'), { shipped: a.shipped ? ctx.records(a.shipped, 'shipped') : [], receipts: a.receipts ? ctx.records(a.receipts, 'receipts') : [], pallets: a.pallets ? ctx.records(a.pallets, 'pallets') : [] });
const line = (r) => `${r.lines} invoice line(s), ${r.billed} billed: ${r.dispute} to dispute (${r.to_dispute}), ${r.review} to ask about, ${r.ok} as your card gives.`;

export const manifest = shopAgent({
  pkg, prefix: 'fulfillment', label: 'Fairshop 3PL Invoices',
  description: 'Audits a 3PL invoice line by line against your rate card, shipped orders, receipts and pallet counts: rates above the card, orders billed twice, picks for orders that never shipped, more units received or pallets stored than counted, and charges not on the card. Drafts the invoice dispute; a person sends it and pays.',
  files, required: ['invoice', 'ratecard'],
  sources: { invoice: { label: '3PL invoice lines', args: ['invoice'], fields: INVOICE_FIELDS, profiles: INVOICE_PROFILES }, shipped: { label: 'Shipped orders', args: ['shipped'], fields: SHIPPED_FIELDS }, receipts: { label: 'Receipts', args: ['receipts'], fields: RECEIPT_FIELDS }, pallets: { label: 'Pallet counts', args: ['pallets'], fields: PALLET_FIELDS } },
  configSchemas: { ratecard: RATECARD_SCHEMA },
  run, line,
  check: { title: 'Audit the 3PL invoice', description: 'Check every invoice line against your rate card and your own counts; returns what to dispute and what to ask about, by fee type.' },
  explain: { arg: 'reference', argDescription: 'Order, ASN or period on the invoice, or a line id from fulfillment_audit', title: 'Explain one charge', description: 'Show every invoice line for one reference and why it was flagged.', match: (i, w) => i.reference.toLowerCase() === w.replace(/^#/, '').toLowerCase() || i.id.toLowerCase() === w.toLowerCase(), text: (i) => `${i.charge_type} ${i.reference} (${i.amount}): ${i.status}${i.expected !== null ? `, card gives ${i.expected}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: '3pl-invoice', title: 'Fulfillment invoice audit', description: 'Write 3pl-invoice.csv and .html (by fee type, every line to dispute or ask about) into out_dir (default fairshop-out/fulfillment).',
    columns: ['id', 'invoice_number', 'charge_type', 'reference', 'qty', 'amount', 'expected', 'status', 'over', 'findings', 'reasons', 'decision'],
    htmlColumns: ['charge_type', 'reference', 'qty', 'amount', 'expected', 'status', 'over', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'invoice_number', 'charge_type', 'reference', 'qty', 'amount', 'expected'], 'over'),
    sections: (r) => [{ title: 'By fee type', rows: r.by_fee_type, columns: ['fee_type', 'count', 'amount', 'over'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, LIMITS.contract, 'Minimums, surcharges and special projects in your agreement are not modelled unless they are in the rate card.', LIMITS.advice],
  },
  draft: {
    noun: 'invoice_dispute', verb: 'send', category: 'binding_send',
    description: 'Write drafts/invoice_dispute-<provider>.md listing every line to credit or explain. Marked DRAFT. Sending goes through fulfillment_request_send (one click); a person sends it.',
    args: { provider: { type: 'string', description: '3PL name' }, from: { type: 'string', description: 'Your name and company' } },
    build: (a, ctx, r) => { const d = disputeText(r, a); if (!d.lines.length) throw new Error('every invoice line matches your rate card'); return { id: a.provider || '3pl', text: d.text, amount: d.total, extra: { lines: d.lines.length } }; },
  },
  refused: [
    { name: 'invoice_pay', category: 'move_money', description: 'Fairshop 3PL Invoices never pays an invoice.' },
    { name: 'portal_dispute_submit', category: 'binding_send', description: 'Fairshop 3PL Invoices never files a dispute in a 3PL portal.' },
  ],
  prompt: { name: 'three_pl_invoice', title: 'Audit a 3PL invoice before paying it', description: 'Walks the host model through a 3PL invoice audit.',
    text: 'You are helping a brand check a 3PL invoice with fairshop-3pl-invoices. Invoice: {{invoice}}. Rate card: {{ratecard}}.\n\nRules: invoice_pay and portal_dispute_submit are blocked.\n\n1. Call fulfillment_audit (with shipped orders, receipts and pallet counts when available). Lead with the credit to ask for.\n2. fulfillment_explain for a reference.\n3. fulfillment_write_report.\n4. Offer fulfillment_draft_invoice_dispute; fulfillment_request_send only when asked (one named click).' },
});
