// Settlement journals: one summarized journal entry per settlement from the seller's own account map.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const SETTLEMENT_PROFILES = Object.freeze([
  exportProfile('amazon_settlement_v2', { settlement_id: 'settlement-id', posted_date: 'posted-date', type: 'transaction-type', description: { from: ['amount-type', 'amount-description'], compute: (_r, get) => String(get('amount-description') || get('amount-type') || '') }, amount: 'amount', order_id: 'order-id' }, { skipRow: (_r, get) => !String(get('amount') ?? '').trim(), note: 'Amazon settlement V2: the summary row (no amount) is skipped; each amount line keeps its description.' }),
  exportProfile('walmart_recon', { settlement_id: 'Period Start Date', posted_date: ['Transaction Posted Timestamp', 'Period End Date'], type: 'Transaction Type', description: 'Amount Type', amount: 'Amount', order_id: 'Customer Order #' }),
]);
export const SETTLEMENT_FIELDS = Object.freeze({
  settlement_id: t(['Settlement ID', 'settlement-id', 'Payout ID', 'Statement ID'], { required: true }),
  posted_date: t(['Posted Date', 'posted-date', 'Date', 'Transaction Date'], { type: 'date' }),
  type: t(['Transaction Type', 'transaction-type', 'Type']),
  description: t(['Description', 'Amount Description', 'amount-description', 'Amount Type'], { required: true }),
  amount: t(['Amount', 'amount', 'Total'], { type: 'money', required: true }),
  order_id: t(['Order ID', 'order-id', 'Order']),
});
export const DEPOSIT_FIELDS = Object.freeze({ date: t(['Date', 'Deposit Date', 'Posted Date'], { type: 'date', required: true }), amount: t(['Amount', 'Deposit', 'Credit'], { type: 'money', required: true }), reference: t(['Reference', 'Memo', 'Description']) });
export const ACCOUNT_MAP_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['accounts', 'clearing_account'],
  properties: {
    note: { type: 'string' },
    accounts: { type: 'object', additionalProperties: { type: 'string' }, description: 'Settlement description (or "Type/Description") → account in your chart of accounts' },
    clearing_account: { type: 'string', description: 'Account the settlement deposit is posted to (a clearing or bank account)' },
    suspense_account: { type: 'string', description: 'Account for descriptions with no mapping (default "Suspense")' },
    deposit_days: { type: 'integer', minimum: 0, maximum: 60, description: 'Days after the last posted line to look for the deposit by amount (default 10)' },
  },
});

/** Statuses: ready, review, chase. Findings: unmapped_description, deposit_not_found, deposit_differs. */
export function buildJournals(lines, map, deposits = [], { asOf } = {}) {
  const day = today(asOf); const acct = new Map(Object.entries(map.accounts || {}).map(([k, v]) => [k.toLowerCase(), v])); const suspense = map.suspense_account || 'Suspense'; const win = map.deposit_days ?? 10;
  const depList = sortBy(deposits.map((d, i) => ({ date: isoDate(d.date), amount: round2(num(d.amount) || 0), ref: str(d.reference), used: false, id: `${isoDate(d.date)}|${num(d.amount)}|${str(d.reference)}|${i}` })));
  const groups = new Map(); for (const l of lines) { const k = str(l.settlement_id); if (!k) continue; (groups.get(k) || groups.set(k, []).get(k)).push(l); }
  const items = []; const all = [];
  for (const [sid, ls] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const sums = new Map(); const unmapped = new Map(); let last = null; let net = 0;
    for (const l of ls) {
      const d = str(l.description); const ty = str(l.type); const amt = round2(num(l.amount) || 0); net = round2(net + amt); const pd = isoDate(l.posted_date); if (pd && (!last || pd > last)) last = pd;
      const a = acct.get(`${ty}/${d}`.toLowerCase()) || acct.get(d.toLowerCase());
      if (!a) unmapped.set(d, round2((unmapped.get(d) || 0) + amt));
      const key = a || suspense; sums.set(key, round2((sums.get(key) || 0) + amt));
    }
    const jl = [...sums.entries()].filter(([, v]) => Math.abs(v) >= 0.005).sort(([a], [b]) => (a < b ? -1 : 1)).map(([account, v]) => ({ settlement_id: sid, account, debit: v < 0 ? round2(-v) : 0, credit: v > 0 ? round2(v) : 0 }));
    jl.push({ settlement_id: sid, account: map.clearing_account, debit: net > 0 ? net : 0, credit: net < 0 ? round2(-net) : 0 });
    const f = []; let status = 'ready';
    for (const [d, v] of [...unmapped.entries()].sort()) { f.push(finding('unmapped_description', null, `"${d}" (${v}) has no account in your map; it was put in ${suspense}.`)); status = 'review'; }
    let dep = null;
    if (depList.length) {
      dep = depList.find((x) => !x.used && x.ref && x.ref.toLowerCase().includes(sid.toLowerCase())) || depList.find((x) => !x.used && Math.abs(x.amount - net) <= 0.01 && last && x.date >= last && daysBetween(last, x.date) <= win);
      if (dep) { dep.used = true; if (Math.abs(dep.amount - net) > 0.01) { f.push(finding('deposit_differs', net - dep.amount, `Settlement ${sid} nets ${net}; the deposit of ${dep.date} is ${dep.amount}.`)); status = 'chase'; } }
      else if (last && addDays(last, win) < day) { f.push(finding('deposit_not_found', net, `No deposit of ${net} for settlement ${sid} within ${win} days of ${last}.`)); status = 'chase'; }
    }
    const debit = round2(jl.reduce((s, x) => s + x.debit, 0)); const credit = round2(jl.reduce((s, x) => s + x.credit, 0));
    items.push({ id: sid, settlement_id: sid, last_posted: last, lines: ls.length, net, debit, credit, balanced: Math.abs(debit - credit) < 0.01, deposit_date: dep ? dep.date : null, journal: jl, status, findings: f });
    all.push(...jl.map((x) => ({ ...x, status })));
  }
  return { as_of: day, settlements: items.length, net: round2(items.reduce((s, i) => s + i.net, 0)), ...byStatus(items, ['ready', 'review', 'chase']), unbalanced: items.filter((i) => !i.balanced).length, by_finding: byFinding(items), journal_lines: all, items };
}

export function entryText(item, { memo }) {
  return [
    `# Journal entry: settlement ${item.settlement_id}`, '', `**Date:** ${item.last_posted || '[TO CONFIRM entry date]'}`, `**Memo:** ${memo || `Marketplace settlement ${item.settlement_id}`}`, '',
    '| Account | Debit | Credit |', '| --- | --- | --- |', ...item.journal.map((l) => `| ${l.account} | ${l.debit || ''} | ${l.credit || ''} |`),
    `| **Total** | **${item.debit}** | **${item.credit}** |`, '',
    ...(item.findings.length ? ['Notes:', ...item.findings.map((f) => `- ${f.detail}`), ''] : []),
    '[CHECK account numbers against your chart of accounts before posting]',
  ].join('\n');
}
