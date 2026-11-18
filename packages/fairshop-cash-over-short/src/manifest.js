import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { CLOSEOUT_FIELDS, CLOSEOUT_PROFILES, DEPOSIT_FIELDS, CASH_SETTINGS_SCHEMA, checkCash, noteText } from './cash.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  closeouts: { type: 'string', description: 'Register closeouts under --root (Square cash drawers, Shopify POS cash sessions or your own CSV): date, store, register, cashier, expected cash, counted cash, float' },
  deposits: { type: 'string', description: 'Bank deposits under --root: date, store or account, amount, reference' },
  settings: { type: 'string', description: 'Optional settings JSON: tolerance, repeat_min, deposit_days' },
};
const run = (a, ctx) => checkCash(ctx.records(a.closeouts, 'closeouts'), ctx.records(a.deposits, 'deposits'), a.settings ? ctx.readJson(a.settings, 'cash_settings') : {});
const line = (r) => `${r.closeouts} closeout(s): ${r.short} short and ${r.over} over beyond tolerance, ${r.deposit_gap} missing from deposits; ${r.chase} deposit(s) to chase, ${r.review} to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'cash', label: 'Fairshop Cash Over Short',
  description: 'Reads register closeouts and bank deposits for physical stores: drawers over or short beyond your tolerance, deposits missing or different from the counted cash less float, and cashiers with repeated shortages (names masked). Drafts a review note for the store manager; never touches pay or moves money.',
  files, required: ['closeouts', 'deposits'],
  sources: { closeouts: { label: 'Register closeouts', args: ['closeouts'], fields: CLOSEOUT_FIELDS, profiles: CLOSEOUT_PROFILES }, deposits: { label: 'Bank deposits', args: ['deposits'], fields: DEPOSIT_FIELDS } },
  configSchemas: { cash_settings: CASH_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check drawers and deposits', description: 'For every closeout: counted against expected cash, and the deposit (counted less float) against the bank; cashiers with repeated shortages.' },
  explain: { arg: 'store', argDescription: 'Store name or closeout id from cash_audit', title: 'Explain one store', description: 'Show the closeouts of one store with over/short and deposits.', match: (i, w) => i.store.toLowerCase() === w.toLowerCase() || i.id.toLowerCase() === w.toLowerCase(), text: (i) => `${i.id}: ${i.status}, over/short ${i.over_short}, deposit due ${i.deposit_due}, deposited ${i.deposited ?? 'none'}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'cash-over-short', title: 'Register cash over and short', description: 'Write cash-over-short.csv and .html (by store, by register, every drawer or deposit to look at) into out_dir (default fairshop-out/cash).',
    columns: ['id', 'date', 'store', 'register', 'expected', 'counted', 'over_short', 'deposit_due', 'deposited', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['date', 'store', 'register', 'over_short', 'deposit_due', 'deposited', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'date', 'store', 'register', 'expected', 'counted', 'over_short', 'deposit_due', 'deposited']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By store', rows: r.by_store, columns: ['store', 'count', 'over_short', 'deposit_due'] }, { title: 'By register', rows: r.by_register, columns: ['register', 'count', 'over_short'] }],
    limits: [LIMITS.files, 'Cashier names are masked in what the model sees; the report file on your disk keeps them for the manager.', 'A shortage is a fact about a drawer, not about a person. Nothing here is a finding about anyone\'s conduct.', LIMITS.advice],
  },
  draft: {
    noun: 'cash_review', verb: 'send', category: 'binding_send',
    description: 'Write drafts/cash_review-<store>.md: every drawer and deposit to look at, with a blank note for the manager. Marked DRAFT. Sending goes through cash_request_send (one click); a person sends it.',
    args: { store: { type: 'string', description: 'Store to write about (default every store)' } },
    build: (a, ctx, r) => { const d = noteText(r.items, a); if (!d.lines.length) throw new Error('every drawer and deposit is fine'); return { id: a.store || 'stores', text: d.text, amount: r.deposit_gap, extra: { lines: d.lines } }; },
  },
  refused: [
    { name: 'payroll_deduction', category: 'move_money', description: 'Fairshop Cash Over Short never deducts anything from anyone\'s pay.' },
    { name: 'employee_access_revoke', category: 'revoke_access', description: 'Fairshop Cash Over Short never changes a staff member\'s access or records.' },
  ],
  prompt: { name: 'cash_over_short', title: 'Check drawers and deposits', description: 'Walks the host model through cash over and short.',
    text: 'You are helping a retailer check register cash with fairshop-cash-over-short. Closeouts: {{closeouts}}. Deposits: {{deposits}}.\n\nRules: staff names are masked; never speculate about anyone. payroll_deduction and employee_access_revoke are blocked.\n\n1. Call cash_audit. Lead with missing deposits, then drawers short.\n2. cash_explain for a store.\n3. cash_write_report.\n4. Offer cash_draft_cash_review; cash_request_send only when asked (one named click).' },
});
