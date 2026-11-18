import { readFileSync } from 'node:fs';
import { shopAgent, AS_OF, LIMITS } from 'fairshop-core';
import { SETTLEMENT_FIELDS, SETTLEMENT_PROFILES, DEPOSIT_FIELDS, ACCOUNT_MAP_SCHEMA, buildJournals, entryText } from './journals.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  settlement: { type: 'string', description: 'Settlement lines under --root (Amazon settlement V2, Walmart reconciliation or your own CSV): settlement id, posted date, type, description, amount, order' },
  map: { type: 'string', description: 'Account map JSON you confirm: description (or "Type/Description") to account, clearing account, suspense account' },
  deposits: { type: 'string', description: 'Bank deposits under --root (optional): date, amount, reference' },
  as_of: AS_OF,
};
const run = (a, ctx) => buildJournals(ctx.records(a.settlement, 'settlement'), ctx.readJson(a.map, 'account_map'), a.deposits ? ctx.records(a.deposits, 'deposits') : [], { asOf: a.as_of });
const line = (r) => `${r.settlements} settlement(s), ${r.net} net: ${r.ready} ready to post, ${r.review} with descriptions to map, ${r.chase} with a deposit to chase${r.unbalanced ? `, ${r.unbalanced} NOT balanced` : ''}.`;

export const manifest = shopAgent({
  pkg, prefix: 'journals', label: 'Fairshop Settlement Journals',
  description: 'Turns marketplace settlement reports into one summarized journal entry per settlement from the account map you confirm, matches each settlement to its bank deposit and lists descriptions with no account. Drafts the entry; posting is one human click and is done by a person.',
  files, required: ['settlement', 'map'],
  sources: { settlement: { label: 'Settlement lines', args: ['settlement'], fields: SETTLEMENT_FIELDS, profiles: SETTLEMENT_PROFILES }, deposits: { label: 'Bank deposits', args: ['deposits'], fields: DEPOSIT_FIELDS } },
  configSchemas: { account_map: ACCOUNT_MAP_SCHEMA },
  run, line,
  check: { title: 'Build settlement journal entries', description: 'Sum every settlement by account from your map into one balanced entry, match it to its bank deposit and list descriptions with no account.' },
  explain: { arg: 'settlement_id', argDescription: 'Settlement id from journals_audit', title: 'Show one entry', description: 'Show the journal lines, deposit and notes of one settlement.', text: (i) => `${i.id}: ${i.status}, net ${i.net}, ${i.journal.map((l) => `${l.account} ${l.debit ? `Dr ${l.debit}` : `Cr ${l.credit}`}`).join('; ')}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'settlement-journals', title: 'Settlement journal entries', description: 'Write settlement-journals.csv (every journal line, ready to import after review) and .html (by settlement, every line) into out_dir (default fairshop-out/journals).',
    columns: ['settlement_id', 'account', 'debit', 'credit', 'status'],
    rows: (r) => r.journal_lines,
    sections: (r) => [{ title: 'By settlement', rows: r.items.map((i) => ({ settlement_id: i.id, net: i.net, debit: i.debit, credit: i.credit, deposit_date: i.deposit_date, status: i.status, reasons: i.findings.map((f) => f.detail).join(' ') })), columns: ['settlement_id', 'net', 'debit', 'credit', 'deposit_date', 'status', 'reasons'] }],
    limits: [LIMITS.files, 'Accounts come from your map; check them against your chart of accounts. Unmapped descriptions go to suspense.', LIMITS.advice],
  },
  draft: {
    noun: 'journal_entry', verb: 'post', category: 'go_live',
    description: 'Write drafts/journal_entry-<settlement>.md: the entry for one settlement with debits, credits and notes. Marked DRAFT. Posting goes through journals_request_post (one click); a person posts it in the ledger.',
    required: ['settlement_id'], args: { settlement_id: { type: 'string', description: 'Settlement to write the entry for' }, memo: { type: 'string', description: 'Memo for the entry' } },
    build: (a, ctx, r) => { const i = r.items.find((x) => x.id === String(a.settlement_id).trim()); if (!i) throw new Error(`settlement "${String(a.settlement_id).slice(0, 40)}" not found`); if (!i.balanced) throw new Error(`settlement ${i.id} does not balance`); return { id: i.id, text: entryText(i, a), amount: i.net, extra: { status: i.status } }; },
  },
  refused: [
    { name: 'accounting_api_post', category: 'go_live', description: 'Fairshop Settlement Journals never posts to QuickBooks, Xero or any ledger itself.' },
    { name: 'settlement_dispute_submit', category: 'binding_send', description: 'Fairshop Settlement Journals never contacts a marketplace.' },
  ],
  prompt: { name: 'settlement_journals', title: 'Book marketplace settlements', description: 'Walks the host model through settlement journal entries.',
    text: 'You are helping a bookkeeper book marketplace settlements with fairshop-settlement-journals. Settlement: {{settlement}}. Map: {{map}}.\n\nRules: accounts come from the map; never invent one. accounting_api_post is blocked.\n\n1. Call journals_audit (with deposits when available). Lead with descriptions to map and deposits to chase.\n2. journals_explain for a settlement.\n3. journals_write_report.\n4. Offer journals_draft_journal_entry per settlement; journals_request_post only when asked (one named click).' },
});
