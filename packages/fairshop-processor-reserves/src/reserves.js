// Processor reserves and holds: pure functions over balance lines, against reserve terms the seller confirms.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const BALANCE_PROFILES = Object.freeze([
  exportProfile('stripe_balance_transactions', { date: 'Created (UTC)', processor: { value: 'Stripe' }, type: ['Reporting Category', 'Type'], amount: 'Amount', reference: ['Source', 'id'], release_date: ['Available On (UTC)', 'Available On'] }),
  exportProfile('paypal_activity', { date: 'Date', processor: { value: 'PayPal' }, type: 'Type', amount: 'Gross', reference: ['Reference Txn ID', 'Transaction ID'] }),
]);
export const BALANCE_FIELDS = Object.freeze({
  date: t(['Date', 'Created', 'Created (UTC)', 'Transaction Date'], { type: 'date', required: true }),
  processor: t(['Processor', 'Provider', 'Gateway', 'Channel']),
  type: t(['Type', 'Transaction Type', 'Reporting Category', 'Description'], { required: true }),
  amount: t(['Amount', 'Gross', 'Net'], { type: 'money', required: true }),
  reference: t(['Reference', 'Reference ID', 'Source', 'Transaction ID', 'Hold ID']),
  release_date: t(['Release Date', 'Available On', 'Expected Release'], { type: 'date' }),
});
export const RESERVE_TERMS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    processors: { type: 'object', additionalProperties: { type: 'object', additionalProperties: false, properties: { percent: { type: 'number', minimum: 0, maximum: 100 }, days: { type: 'integer', minimum: 0, maximum: 730 } } }, description: 'Reserve terms per processor from your own notice or agreement: percent held and days held' },
    grace_days: { type: 'integer', minimum: 0, maximum: 60, description: 'Days after the expected release before it counts as overdue (default 3)' },
    upcoming_days: { type: 'integer', minimum: 1, maximum: 90, description: 'Releases due within this many days are listed as upcoming (default 14)' },
    dispute_days: { type: 'integer', minimum: 1, maximum: 365, description: 'A dispute hold open longer than this is listed (default 75)' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.05)' },
  },
});

export function lineKind(type) {
  const s = str(type).toLowerCase();
  if (/dispute|chargeback/.test(s)) return /won|revers|release|return/.test(s) ? 'dispute_release' : 'dispute_hold';
  if (/reserve|hold/.test(s)) return /release|releas/.test(s) ? 'release' : 'hold';
  if (/charge|payment|sale|order/.test(s)) return 'charge';
  return 'other';
}

/** Statuses: chase, review, upcoming, held, ok. Findings: release_overdue, hold_above_terms, dispute_open_long. */
export function auditReserves(rows, terms = {}, { asOf } = {}) {
  const day = today(asOf); const grace = terms.grace_days ?? 3; const soon = terms.upcoming_days ?? 14; const dDays = terms.dispute_days ?? 75; const tol = terms.tolerance ?? 0.05;
  const procTerms = Object.fromEntries(Object.entries(terms.processors || {}).map(([k, v]) => [channelKey(k), v]));
  const lines = sortBy(rows.map((r) => ({ p: channelKey(r.processor) || 'unknown', kind: lineKind(r.type), date: isoDate(r.date), amount: round2(Math.abs(num(r.amount) || 0)), ref: str(r.reference), release: isoDate(r.release_date) })).map((l) => ({ ...l, id: `${l.p}|${l.date}|${l.kind}|${l.ref}|${l.amount}` })));
  const charges = new Map(); for (const l of lines.filter((x) => x.kind === 'charge')) { const k = `${l.p}|${l.date}`; charges.set(k, round2((charges.get(k) || 0) + l.amount)); }
  const releases = lines.filter((l) => l.kind === 'release' || l.kind === 'dispute_release').map((l) => ({ ...l, left: l.amount }));
  const items = [];
  for (const h of lines.filter((l) => l.kind === 'hold' || l.kind === 'dispute_hold')) {
    const rk = h.kind === 'hold' ? 'release' : 'dispute_release';
    let paid = 0;
    for (const r of releases.filter((x) => x.kind === rk && x.p === h.p && x.left > 0 && h.ref && x.ref === h.ref)) { const u = Math.min(r.left, h.amount - paid); r.left = round2(r.left - u); paid = round2(paid + u); }
    for (const r of releases.filter((x) => x.kind === rk && x.p === h.p && x.left > 0 && (!x.ref || !h.ref) && x.date >= h.date)) { if (paid >= h.amount) break; const u = Math.min(r.left, h.amount - paid); r.left = round2(r.left - u); paid = round2(paid + u); }
    const held = round2(h.amount - paid); const pt = procTerms[h.p] || {};
    const expected = h.release || (pt.days !== undefined && h.date ? addDays(h.date, pt.days) : null);
    const f = []; let status = held <= tol ? 'ok' : 'held';
    if (h.kind === 'hold') {
      const base = charges.get(`${h.p}|${h.date}`);
      if (pt.percent !== undefined && base) { const cap = round2(base * pt.percent / 100); if (h.amount > cap + tol) { f.push(finding('hold_above_terms', h.amount - cap, `${channelLabel(h.p)} held ${h.amount} on ${h.date} against ${base} of charges; your terms say ${pt.percent}% (${cap}).`)); if (status === 'ok' || status === 'held') status = 'review'; } }
      if (held > tol && expected) {
        const late = daysBetween(expected, day);
        if (late > grace) { f.push(finding('release_overdue', held, `${held} held by ${channelLabel(h.p)} on ${h.date}${h.ref ? ` (${h.ref})` : ''} was due back on ${expected}, ${late} day(s) ago.`)); status = 'chase'; }
        else if (status === 'held' && daysBetween(day, expected) <= soon) status = 'upcoming';
      }
    } else if (held > tol && h.date && daysBetween(h.date, day) > dDays) { f.push(finding('dispute_open_long', null, `Dispute hold of ${held} from ${h.date}${h.ref ? ` (${h.ref})` : ''} is still open after ${daysBetween(h.date, day)} days. Ask ${channelLabel(h.p)} where the dispute stands.`)); status = 'review'; }
    items.push({ id: h.ref || h.id, processor: channelLabel(h.p), processor_key: h.p, kind: h.kind, date: h.date, amount: h.amount, released: paid, held, expected_release: expected, status, findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.processor_key}|${i.date}|${i.id}`);
  const byProc = rollup(sorted, (i) => i.processor, ['amount', 'released', 'held']).map(({ key, ...v }) => ({ processor: key, ...v }));
  const overdue = round2(sorted.filter((i) => i.status === 'chase').reduce((s, i) => s + i.held, 0));
  return { as_of: day, holds: sorted.length, held_now: round2(sorted.reduce((s, i) => s + i.held, 0)), overdue, ...byStatus(sorted, ['chase', 'review', 'upcoming', 'held', 'ok']), by_processor: byProc, by_finding: byFinding(sorted), items: sorted };
}

export function inquiryText(items, { processor, from, account }) {
  const rows = items.filter((i) => i.status === 'chase' || (i.status === 'review' && i.kind === 'dispute_hold'));
  const total = round2(rows.reduce((s, i) => s + i.held, 0));
  return { total, holds: rows.map((i) => i.id), text: [
    `# Reserve release inquiry: ${processor}`, '', `**To:** [TO CONFIRM ${processor} support or account manager]`, `**From:** ${from || '[TO CONFIRM your name and business]'}`, `**Account:** ${account || '[TO CONFIRM account id]'}`, '',
    `Please tell us when the ${rows.length} hold(s) below, ${total} in total, will be released, or why they are still held.`, '',
    '| Hold | Date | Amount | Still held | Expected release | Detail |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.id} | ${i.date} | ${i.amount} | ${i.held} | ${i.expected_release || ''} | ${i.findings.map((x) => x.detail).join(' ')} |`),
  ].join('\n') };
}
