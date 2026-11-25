// Gift card and store credit liability: pure functions over card and activity exports.
import { round2, str, num, isoDate, daysBetween, ageBucket, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CARD_FIELDS = Object.freeze({
  card_id: t(['Card', 'Card ID', 'Gift Card', 'Last Characters', 'Code Ending'], { required: true }),
  issued_date: t(['Issued', 'Issued Date', 'Created at', 'Date'], { type: 'date' }),
  issued_amount: t(['Initial Value', 'Issued Amount', 'Amount', 'Value'], { type: 'money' }),
  source: t(['Source', 'Issued By', 'Reason', 'Type']),
  order_id: t(['Order', 'Order ID', 'Order Name']),
  customer_email: t(['Customer Email', 'Email', 'Recipient Email'], { pii: 'email' }),
  balance: t(['Balance', 'Current Balance', 'Remaining'], { type: 'money' }),
});
export const ACTIVITY_FIELDS = Object.freeze({
  card_id: t(['Card', 'Card ID', 'Gift Card'], { required: true }),
  date: t(['Date', 'Created at', 'Used At'], { type: 'date' }),
  type: t(['Type', 'Kind', 'Transaction Type']),
  amount: t(['Amount', 'Value'], { type: 'money', required: true }),
  order_id: t(['Order', 'Order ID']),
});
export const GIFT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    manual_review_over: { type: 'number', minimum: 0, description: 'Cards issued by hand with no order above this value are listed (default 100)' },
    dormancy_days: { type: 'integer', minimum: 1, description: 'Days without activity after which a card with a balance is listed as dormant (default 365). What applies to dormant cards is for your adviser.' },
    promo_is_liability: { type: 'boolean', description: 'Count promotional cards in the liability (default false)' },
    age_edges: { type: 'array', items: { type: 'integer', minimum: 1 }, description: 'Age buckets in days from issue (default 90, 180, 365)' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.01)' },
  },
});

/** Statuses: review, dormant, ok. Findings: balance_mismatch, overdrawn, manual_issue_no_order, redeemed_before_issue, dormant. */
export function giftLiability(cards, activity, s = {}, { asOf } = {}) {
  const day = today(asOf); const over = s.manual_review_over ?? 100; const dorm = s.dormancy_days ?? 365; const tol = s.tolerance ?? 0.01; const edges = s.age_edges || [90, 180, 365];
  const acts = new Map(); for (const a of activity) { const k = str(a.card_id).toUpperCase(); (acts.get(k) || acts.set(k, []).get(k)).push(a); }
  const items = [];
  for (const c of sortBy(cards.map((c) => ({ ...c, id: str(c.card_id).toUpperCase() })))) {
    const issued = round2(num(c.issued_amount) || 0); const idate = isoDate(c.issued_date); const src = str(c.source).toLowerCase();
    let redeemed = 0, adjusted = 0, extraIssue = 0; let last = idate; let early = null;
    for (const a of acts.get(c.id) || []) {
      const amt = num(a.amount) || 0; const ty = str(a.type).toLowerCase(); const d = isoDate(a.date);
      if (d && (!last || d > last)) last = d;
      if (/redeem|use|spend|purchase/.test(ty)) { redeemed = round2(redeemed + Math.abs(amt)); if (d && idate && d < idate) early = d; }
      else if (/issue|load|top/.test(ty)) extraIssue = round2(extraIssue + Math.abs(amt));
      else adjusted = round2(adjusted + amt);
    }
    const computed = round2(issued + extraIssue + adjusted - redeemed); const reported = num(c.balance); const promo = /promo|marketing|giveaway/.test(src);
    const f = []; let status = 'ok';
    if (reported !== null && Math.abs(reported - computed) > tol) { f.push(finding('balance_mismatch', reported - computed, `Card ${c.id} shows ${reported}; issue and activity give ${computed}.`)); status = 'review'; }
    if (computed < -tol) { f.push(finding('overdrawn', -computed, `Card ${c.id} was spent ${-computed} past its value.`)); status = 'review'; }
    if (/manual|admin|staff/.test(src) && !str(c.order_id) && issued > over) { f.push(finding('manual_issue_no_order', issued, `Card ${c.id} for ${issued} was issued by hand on ${idate} with no order. Check who issued it and why.`)); status = 'review'; }
    if (early) { f.push(finding('redeemed_before_issue', null, `Card ${c.id} was used on ${early}, before its issue date ${idate}.`)); status = 'review'; }
    const idle = last ? daysBetween(last, day) : null;
    if (status === 'ok' && computed > tol && idle !== null && idle > dorm) { f.push(finding('dormant', null, `Card ${c.id} has ${computed} left and no activity for ${idle} days. What applies to dormant balances is a question for your adviser.`)); status = 'dormant'; }
    const age = idate ? daysBetween(idate, day) : null;
    items.push({ id: c.id, source: src || 'sale', promo, order_id: str(c.order_id), customer_email: str(c.customer_email), issued_date: idate, issued: round2(issued + extraIssue), redeemed, adjusted, balance: computed, reported, last_activity: last, age_bucket: ageBucket(age, edges), liability: !promo || s.promo_is_liability ? Math.max(0, computed) : 0, status, findings: f });
  }
  const sorted = sortBy(items);
  const buckets = new Map(); for (const i of sorted) { if (!i.liability) continue; const b = buckets.get(i.age_bucket) || { age: i.age_bucket, cards: 0, liability: 0 }; b.cards++; b.liability = round2(b.liability + i.liability); buckets.set(i.age_bucket, b); }
  const order = (x) => (x === 'unknown' ? 1e9 : parseInt(x, 10));
  return { as_of: day, cards: sorted.length, liability: round2(sorted.reduce((s, i) => s + i.liability, 0)), promo_balance: round2(sorted.filter((i) => i.promo && !s.promo_is_liability).reduce((s, i) => s + Math.max(0, i.balance), 0)), ...byStatus(sorted, ['review', 'dormant', 'ok']), by_age: [...buckets.values()].sort((a, b) => order(a.age) - order(b.age)), by_finding: byFinding(sorted), items: sorted };
}

export function entryText(r, { gl_balance, liability_account, offset_account }) {
  const book = num(gl_balance); const diff = book === null ? null : round2(r.liability - book);
  return { diff, text: [
    `# Gift card liability entry, ${r.as_of}`, '', `**Liability from card files:** ${r.liability} (${r.cards} card(s); promotional balances of ${r.promo_balance} left out)`, `**Ledger balance:** ${book === null ? '[TO CONFIRM gift card liability balance in your ledger]' : book}`, '',
    '| Account | Debit | Credit |', '| --- | --- | --- |',
    diff === null ? '| [TO CONFIRM accounts] | | |' : diff >= 0 ? `| ${offset_account || '[TO CONFIRM offset account]'} | ${diff} | |\n| ${liability_account || '[TO CONFIRM gift card liability account]'} | | ${diff} |` : `| ${liability_account || '[TO CONFIRM gift card liability account]'} | ${-diff} | |\n| ${offset_account || '[TO CONFIRM offset account]'} | | ${-diff} |`,
    '', ...r.by_age.map((b) => `- ${b.age} days: ${b.cards} card(s), ${b.liability}`), '', '[CHECK the cards under review before booking]',
  ].join('\n') };
}
