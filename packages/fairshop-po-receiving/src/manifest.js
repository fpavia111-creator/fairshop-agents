import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { PO_FIELDS, RECEIPT_FIELDS, INVOICE_FIELDS, RECEIVING_SETTINGS_SCHEMA, matchPOs, claimText } from './receiving.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  pos: { type: 'string', description: 'Purchase order lines under --root: PO, vendor, SKU, quantity ordered, unit cost, promised date' },
  receipts: { type: 'string', description: 'Receipts under --root: PO, SKU, quantity received, date' },
  invoices: { type: 'string', description: 'Supplier invoice lines under --root: invoice number, vendor, PO, SKU, quantity billed, unit price, date' },
  settings: { type: 'string', description: 'Optional settings JSON: price_tolerance_pct, over_receipt_pct, late_grace_days' },
  as_of: AS_OF,
};
const run = (a, ctx) => matchPOs(ctx.records(a.pos, 'pos'), ctx.records(a.receipts, 'receipts'), ctx.records(a.invoices, 'invoices'), a.settings ? ctx.readJson(a.settings, 'receiving_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.lines} PO line(s): ${r.dispute} to claim from suppliers (${r.to_claim}), ${r.chase} past due with nothing received, ${r.review} to review, ${r.ok} matched.`;

export const manifest = shopAgent({
  pkg, prefix: 'receiving', label: 'Fairshop PO Receiving',
  description: 'Three-way match of purchase orders, receipts and supplier invoices: units billed but not received, invoices billed twice, prices above the PO, short and over shipments, late deliveries and POs past due with nothing received. Drafts a supplier claim; a person sends it and pays.',
  files, required: ['pos', 'receipts', 'invoices'],
  sources: { pos: { label: 'Purchase order lines', args: ['pos'], fields: PO_FIELDS }, receipts: { label: 'Receipts', args: ['receipts'], fields: RECEIPT_FIELDS }, invoices: { label: 'Supplier invoice lines', args: ['invoices'], fields: INVOICE_FIELDS } },
  configSchemas: { receiving_settings: RECEIVING_SETTINGS_SCHEMA },
  run, line,
  check: { verb: 'match', title: 'Match POs, receipts and invoices', description: 'For every PO line: ordered, received and billed, with prices against the PO, dates against the promise, and invoices billed twice.' },
  explain: { arg: 'po', argDescription: 'PO number or PO|SKU id from receiving_match', title: 'Explain one PO', description: 'Show every line of one PO with ordered, received, billed and findings.', match: (i, w) => i.po === w.toUpperCase() || i.id === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}, ordered ${i.ordered}, received ${i.received}, billed ${i.billed}${i.claim ? `, claim ${i.claim}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'po-receiving', title: 'Purchase orders, receipts and supplier invoices', description: 'Write po-receiving.csv and .html (by vendor, every PO line not matched) into out_dir (default fairshop-out/receiving).',
    columns: ['id', 'po', 'sku', 'vendor', 'ordered', 'received', 'billed', 'promised_date', 'first_received', 'status', 'claim', 'findings', 'reasons', 'decision'],
    htmlColumns: ['po', 'sku', 'vendor', 'ordered', 'received', 'billed', 'status', 'claim', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'po', 'sku', 'vendor', 'ordered', 'received', 'billed', 'promised_date', 'first_received'], 'claim'),
    sections: (r) => [{ title: 'By vendor', rows: r.by_vendor, columns: ['vendor', 'count', 'claim'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Lines are matched by PO and SKU; a supplier invoice with another SKU code will not match.', LIMITS.advice],
  },
  draft: {
    noun: 'supplier_claim', verb: 'send', category: 'binding_send',
    description: 'Write drafts/supplier_claim-<vendor>.md: every PO line of one vendor with a credit to ask for. Marked DRAFT. Sending goes through receiving_request_send (one click); a person sends it.',
    args: { vendor: { type: 'string', description: 'Vendor to write to, as named in the files' }, from: { type: 'string', description: 'Your name and company' } },
    build: (a, ctx, r) => { const d = claimText(r.items, a); if (!d.lines.length) throw new Error(`nothing to claim${a.vendor ? ` from ${String(a.vendor).slice(0, 40)}` : ''}`); return { id: a.vendor || 'suppliers', text: d.text, amount: d.total, extra: { lines: d.lines } }; },
  },
  refused: [
    { name: 'invoice_pay', category: 'move_money', description: 'Fairshop PO Receiving never pays a supplier.' },
    { name: 'po_cancel', category: 'binding_send', description: 'Fairshop PO Receiving never cancels or changes a purchase order with a supplier.' },
  ],
  prompt: { name: 'po_receiving', title: 'Match POs, receipts and supplier invoices', description: 'Walks the host model through a three-way match.',
    text: 'You are helping a buyer match purchase orders, receipts and invoices with fairshop-po-receiving. POs: {{pos}}. Receipts: {{receipts}}. Invoices: {{invoices}}.\n\nRules: invoice_pay and po_cancel are blocked.\n\n1. Call receiving_match. Lead with credits to claim by vendor, then POs past due.\n2. receiving_explain for a PO.\n3. receiving_write_report.\n4. Offer receiving_draft_supplier_claim per vendor; receiving_request_send only when asked (one named click).' },
});
