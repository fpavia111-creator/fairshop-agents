// Subscriptions and failed payments: pure functions over subscription and payment exports.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, monthOf, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const SUB_PROFILES = Object.freeze([
  exportProfile('recharge_subscriptions', { subscription_id: 'subscription_id', customer_email: 'customer_email', status: 'status', plan: 'product_title', price: 'price', started: 'created_at', cancelled_at: 'cancelled_at', cancel_reason: 'cancellation_reason', next_billing: 'next_charge_scheduled_at' }),
  exportProfile('stripe_subscriptions', { subscription_id: 'id', customer_email: 'Customer Email', status: 'Status', plan: ['Plan', 'Product'], price: ['Plan Amount', 'Amount'], started: ['Created (UTC)', 'Start (UTC)'], cancelled_at: ['Canceled At (UTC)', 'Ended At (UTC)'], cancel_reason: ['Cancellation Reason', 'Cancellation Feedback'], next_billing: ['Current Period End (UTC)', 'Current Period End'] }),
]);
export const SUB_FIELDS = Object.freeze({
  subscription_id: t(['Subscription ID', 'Subscription', 'ID'], { required: true }),
  customer_email: t(['Customer Email', 'Email'], { pii: 'email' }),
  status: t(['Status', 'Subscription Status'], { required: true }),
  plan: t(['Plan', 'Product', 'Product Title']),
  price: t(['Price', 'Amount', 'Plan Amount', 'Recurring Price'], { type: 'money' }),
  started: t(['Started', 'Created', 'Start Date'], { type: 'date' }),
  cancelled_at: t(['Cancelled At', 'Canceled At', 'Ended At'], { type: 'date' }),
  cancel_reason: t(['Cancel Reason', 'Cancellation Reason']),
  next_billing: t(['Next Billing', 'Next Charge', 'Next Payment Date', 'Renews'], { type: 'date' }),
  card_expiry: t(['Card Expiry', 'Card Expiration', 'Exp'], {}),
});
export const PAYMENT_FIELDS = Object.freeze({
  subscription_id: t(['Subscription ID', 'Subscription'], { required: true }),
  date: t(['Date', 'Created', 'Attempted At', 'Charge Date'], { type: 'date', required: true }),
  amount: t(['Amount', 'Total'], { type: 'money' }),
  status: t(['Status', 'Result', 'Outcome'], { required: true }),
  failure_reason: t(['Failure Reason', 'Decline Code', 'Error']),
});
export const SUB_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    retry_gap_days: { type: 'integer', minimum: 1, maximum: 60, description: 'A failed payment with no later attempt after this many days is "not retried" (default 3)' },
    max_retries: { type: 'integer', minimum: 1, maximum: 20, description: 'Failures since the last success after which retries count as used up (default 3)' },
    grace_days: { type: 'integer', minimum: 1, maximum: 400, description: 'An active subscription with no successful payment for longer than this is a billing gap (default 35)' },
  },
});

const ok = (s) => /succe|paid|captur|complete/i.test(str(s));
const failed = (s) => /fail|declin|error|insufficient/i.test(str(s));
/** "2027-01", "01/27", "1/2027" → "2027-01". */
export function expiryMonth(v) { const s = str(v); let m; if ((m = /^(\d{4})-(\d{1,2})/.exec(s))) return `${m[1]}-${m[2].padStart(2, '0')}`; if ((m = /^(\d{1,2})\s*\/\s*(\d{2,4})$/.exec(s))) return `${m[2].length === 2 ? `20${m[2]}` : m[2]}-${m[1].padStart(2, '0')}`; return ''; }

/** Statuses: chase, at_risk, review, heads_up, ok, churned. */
export function checkSubscriptions(subs, payments, s = {}, { asOf } = {}) {
  const day = today(asOf); const gap = s.retry_gap_days ?? 3; const maxR = s.max_retries ?? 3; const grace = s.grace_days ?? 35;
  const pay = new Map(); for (const p of payments) { const k = str(p.subscription_id); (pay.get(k) || pay.set(k, []).get(k)).push({ date: isoDate(p.date), ok: ok(p.status), failed: failed(p.status), reason: str(p.failure_reason) }); }
  const items = []; const churn = new Map();
  for (const sub of sortBy(subs.map((x) => ({ ...x, id: str(x.subscription_id) })))) {
    const ps = (pay.get(sub.id) || []).filter((p) => p.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : Number(a.ok) - Number(b.ok)));
    const lastOk = [...ps].reverse().find((p) => p.ok); const since = ps.filter((p) => p.failed && (!lastOk || p.date > lastOk.date)); const last = ps.at(-1);
    const st = str(sub.status).toLowerCase(); const price = round2(num(sub.price) || 0); const f = []; let status = 'ok';
    if (/cancel|ended|expired/.test(st)) {
      const end = isoDate(sub.cancelled_at); const invol = /payment|card|declin|fail|dunning/i.test(str(sub.cancel_reason)) || ps.some((p) => p.failed && end && daysBetween(p.date, end) <= 30 && p.date <= end);
      const m = monthOf(end) || 'unknown'; const c = churn.get(m) || { month: m, voluntary: 0, payment_failure: 0, mrr_lost: 0 }; c[invol ? 'payment_failure' : 'voluntary']++; c.mrr_lost = round2(c.mrr_lost + price); churn.set(m, c);
      items.push({ id: sub.id, customer_email: str(sub.customer_email), plan: str(sub.plan), status: 'churned', sub_status: st, price, last_success: lastOk ? lastOk.date : null, failures: since.length, next_billing: isoDate(sub.next_billing), churn: invol ? 'payment_failure' : 'voluntary', findings: [] });
      continue;
    }
    if (since.length >= maxR || /unpaid/.test(st)) { f.push(finding('retries_exhausted', price, `${since.length} failed payment(s) since ${lastOk ? lastOk.date : 'the start'} (last: ${since.at(-1) ? since.at(-1).reason || 'declined' : 'n/a'}); retries are used up.`)); status = 'at_risk'; }
    else if (last && last.failed && daysBetween(last.date, day) > gap) { f.push(finding('failed_not_retried', price, `Payment failed on ${last.date} (${last.reason || 'declined'}) and was not tried again in ${daysBetween(last.date, day)} days.`)); status = 'chase'; }
    else if (/active|past.?due|trial/.test(st) && (!lastOk || daysBetween(lastOk.date, day) > grace) && isoDate(sub.started) && daysBetween(isoDate(sub.started), day) > grace) { f.push(finding('billing_gap', price, `Active, but the last successful payment was ${lastOk ? lastOk.date : 'never'}. Check whether billing is paused or broken.`)); status = 'review'; }
    const exp = expiryMonth(sub.card_expiry); const nb = isoDate(sub.next_billing);
    if (exp && nb && exp <= monthOf(nb)) { f.push(finding('card_expiring', null, `The card on file expires ${exp}, by the next billing date ${nb}. Ask for a new card before then.`)); if (status === 'ok') status = 'heads_up'; }
    items.push({ id: sub.id, customer_email: str(sub.customer_email), plan: str(sub.plan), status, sub_status: st, price, last_success: lastOk ? lastOk.date : null, failures: since.length, next_billing: nb, churn: null, findings: f });
  }
  const sorted = sortBy(items); const live = sorted.filter((i) => i.status !== 'churned');
  return { as_of: day, subscriptions: sorted.length, mrr: round2(live.reduce((s, i) => s + i.price, 0)), mrr_at_risk: round2(live.filter((i) => ['chase', 'at_risk'].includes(i.status)).reduce((s, i) => s + i.price, 0)), ...byStatus(sorted, ['chase', 'at_risk', 'review', 'heads_up', 'ok', 'churned']), churn_by_month: [...churn.values()].sort((a, b) => (a.month < b.month ? -1 : 1)), by_finding: byFinding(sorted), items: sorted };
}

export function dunningText(items) {
  const rows = items.filter((i) => ['chase', 'at_risk'].includes(i.status) || i.findings.some((f) => f.code === 'card_expiring'));
  return { subscriptions: rows.map((i) => i.id), text: [
    '# Payment update requests', '', '**To:** [TO CONFIRM each subscriber below, from your subscription app]', '**From:** [TO CONFIRM your customer service address]', '',
    'Hello, we could not take the payment for your subscription, or the card on file is about to expire. Please update your card from your account page so your next order ships on time.', '',
    '| Subscription | Plan | Customer | Price | Why |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.id} | ${i.plan} | ${i.customer_email || '[CHECK customer]'} | ${i.price} | ${i.findings.map((f) => f.code).join(', ')} |`),
  ].join('\n') };
}
