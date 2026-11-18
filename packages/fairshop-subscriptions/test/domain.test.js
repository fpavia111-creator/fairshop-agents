// Subscriptions: retries, exhaustion, billing gaps, card expiry and churn.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubscriptions, expiryMonth, dunningText } from '../src/index.js';

const sub = (over = {}) => ({ subscription_id: 'S1', status: 'active', plan: 'P', price: '20', started: '2026-01-01', next_billing: '2026-12-01', card_expiry: '2029-01', ...over });
const p = (date, status, over = {}) => ({ subscription_id: 'S1', date, amount: '20', status, ...over });
const run = (subs, pays, s = {}, asOf = '2026-11-16') => checkSubscriptions(subs, pays, s, { asOf });

test('card expiry is read in the usual spellings', () => {
  assert.equal(expiryMonth('2027-1'), '2027-01'); assert.equal(expiryMonth('01/27'), '2027-01'); assert.equal(expiryMonth('1/2027'), '2027-01'); assert.equal(expiryMonth('soon'), '');
});

test('a failure is chased after retry_gap_days; a later success clears it', () => {
  assert.equal(run([sub()], [p('2026-11-01', 'succeeded'), p('2026-11-10', 'failed')]).items[0].status, 'chase');
  assert.equal(run([sub()], [p('2026-11-01', 'succeeded'), p('2026-11-14', 'failed')]).items[0].status, 'ok');
  assert.equal(run([sub()], [p('2026-11-10', 'failed'), p('2026-11-12', 'succeeded')]).items[0].status, 'ok');
});

test('max_retries failures since the last success, or an unpaid status, mean retries are used up', () => {
  const r = run([sub()], [p('2026-11-01', 'failed'), p('2026-11-03', 'declined'), p('2026-11-05', 'failed')]);
  assert.equal(r.items[0].status, 'at_risk'); assert.equal(r.mrr_at_risk, 20);
  assert.equal(run([sub({ status: 'unpaid' })], [p('2026-11-14', 'failed')]).items[0].status, 'at_risk');
});

test('an active plan with no success inside grace_days is a billing gap', () => {
  assert.equal(run([sub()], [p('2026-09-01', 'succeeded')]).items[0].findings[0].code, 'billing_gap');
  assert.equal(run([sub({ started: '2026-11-01' })], []).items[0].status, 'ok');
});

test('a card expiring by the next billing month is a heads-up', () => {
  assert.equal(run([sub({ card_expiry: '11/26', next_billing: '2026-11-25' })], [p('2026-11-01', 'succeeded')]).items[0].status, 'heads_up');
});

test('cancellations split into payment failure and voluntary by reason or a recent failure', () => {
  const r = run([sub({ status: 'cancelled', cancelled_at: '2026-10-20', cancel_reason: 'Too expensive' }), sub({ subscription_id: 'S2', status: 'canceled', cancelled_at: '2026-10-21', cancel_reason: '' })], [p('2026-10-10', 'failed', { subscription_id: 'S2' })]);
  assert.deepEqual(r.churn_by_month, [{ month: '2026-10', voluntary: 1, payment_failure: 1, mrr_lost: 40 }]); assert.equal(r.mrr, 0);
});

test('payment update requests go to chase, at-risk and expiring-card subscriptions only', () => {
  const r = run([sub(), sub({ subscription_id: 'S2' })], [p('2026-11-01', 'failed')]);
  assert.deepEqual(dunningText(r.items).subscriptions, ['S1']);
});
