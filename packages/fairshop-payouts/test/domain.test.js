// Payout matching: missing, short, twice, refunds, fees, orphans, and the inquiry text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePayouts, inquiryText, orderKey } from '../src/index.js';

const o = (over = {}) => ({ order_id: '#1', channel: 'Shopify', order_date: '2026-11-01', total: '100', refunded: '0', status: 'paid', gateway: 'Shopify Payments', ...over });
const l = (over = {}) => ({ payout_id: 'P1', payout_date: '2026-11-03', order_id: '#1', type: 'charge', gross: '100', fee: '3', net: '97', channel: 'Shopify', ...over });
const run = (orders, lines, settings = {}, asOf = '2026-11-20') => reconcilePayouts(orders, lines, { settings, asOf });
const codes = (r, id) => r.items.find((i) => i.id === id).findings.map((f) => f.code);

test('an order with no payout line is chased only after its channel\'s payout days', () => {
  const r = run([o()], [], { payout_days: { shopify: 3 } }, '2026-11-03');
  assert.equal(r.items[0].status, 'waiting');
  const late = run([o()], [], { payout_days: { shopify: 3 } }, '2026-11-05');
  assert.equal(late.items[0].status, 'chase'); assert.deepEqual(codes(late, '1'), ['not_paid_out']); assert.equal(late.owed, 100);
});

test('order numbers match with or without #, and a short payment is the missing difference', () => {
  assert.equal(orderKey(' # 1001 '), '1001');
  const r = run([o({ order_id: '1' })], [l({ gross: '97.50' })]);
  assert.deepEqual(codes(r, '1'), ['paid_short']); assert.equal(r.items[0].owed, 2.5);
  assert.equal(run([o()], [l({ gross: '99.97' })]).items[0].status, 'ok', 'within the 0.05 tolerance');
});

test('two payouts for one order are flagged as paid twice, not as a refund problem', () => {
  const r = run([o()], [l(), l({ payout_id: 'P2' })]);
  assert.deepEqual(codes(r, '1'), ['paid_twice']); assert.equal(r.items[0].findings[0].amount, 100); assert.equal(r.items[0].status, 'review');
});

test('a refund on the order that is not in any payout yet is a heads-up, with no amount claimed', () => {
  const r = run([o({ refunded: '100', status: 'refunded' })], [l()]);
  assert.deepEqual(codes(r, '1'), ['refund_not_deducted']); assert.equal(r.items[0].findings[0].amount, null);
  assert.equal(run([o({ refunded: '40' })], [l(), l({ type: 'refund', gross: '-40', fee: '0' })]).items[0].status, 'ok');
});

test('fees are checked against the cap in settings only; voided and manual orders are skipped', () => {
  const r = run([o()], [l({ fee: '5' })], { max_fee_pct: { shopify: 3.5 } });
  assert.deepEqual(codes(r, '1'), ['fee_above_rate']); assert.equal(r.items[0].findings[0].amount, 1.5);
  assert.equal(run([o()], [l({ fee: '5' })]).items[0].status, 'ok');
  const s = run([o({ status: 'voided' }), o({ order_id: '#2', gateway: 'Cash' })], []);
  assert.deepEqual(s.items.map((i) => i.status), ['skipped', 'skipped']); assert.equal(s.chase, 0);
});

test('payout lines for unknown orders and lines with no order are listed for review', () => {
  const r = run([], [l({ order_id: '#77' }), l({ order_id: '', type: 'reserve', gross: '-50' })]);
  assert.deepEqual(r.items.map((i) => i.findings[0].code).sort(), ['no_matching_order', 'payout_adjustment']);
  assert.equal(r.orders, 0); assert.equal(r.review, 2);
});

test('the inquiry lists only orders to chase, totals them and leaves the contact to confirm', () => {
  const r = run([o(), o({ order_id: '#2', total: '50' }), o({ order_id: '#3' })], [l({ order_id: '#3' })], { payout_days: { default: 1 } });
  const d = inquiryText(r.items, { channel: 'Shopify' });
  assert.equal(d.total, 150); assert.deepEqual(d.orders.sort(), ['#1', '#2']);
  assert.match(d.text, /\[TO CONFIRM Shopify seller support or payments contact\]/); assert.match(d.text, /\[TO CONFIRM store or seller id\]/); assert.doesNotMatch(d.text, /\| #3 \|/);
});
