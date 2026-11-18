// Refunds vs returns: windows, owed refunds, twice, over price, damaged and returnless SKUs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchRefunds, remindersText } from '../src/index.js';

const rf = (over = {}) => ({ order_id: '1', sku: 'A', refund_date: '2026-10-01', amount: '20', qty: '1', channel: 'Shopify', ...over });
const rt = (over = {}) => ({ order_id: '1', sku: 'A', received_date: '2026-10-05', qty: '1', condition: 'good', ...over });
const ord = (over = {}) => ({ order_id: '1', sku: 'A', qty: '1', price: '20', ...over });
const run = (refunds, returns, orders = [], s = {}, asOf = '2026-11-16') => matchRefunds(refunds, returns, orders, s, { asOf });

test('a refund with its return is matched, with or without # on the order', () => {
  assert.equal(run([rf({ order_id: '#1' })], [rt()]).items[0].status, 'ok');
});

test('a refund with no return is chased after grace_days, and returnless SKUs are left alone', () => {
  assert.equal(run([rf()], []).items[0].status, 'chase'); assert.equal(run([rf()], []).at_risk, 20);
  assert.equal(run([rf({ refund_date: '2026-11-10' })], []).items[0].status, 'waiting');
  assert.equal(run([rf()], [], [], { returnless_skus: ['a'] }).items[0].status, 'ok');
});

test('a return received and not refunded is owed to the customer after refund_due_days', () => {
  const r = run([], [rt({ order_id: '2', received_date: '2026-11-01' })], [ord({ order_id: '2', price: '30' })]);
  assert.equal(r.items[0].status, 'owed'); assert.equal(r.owed_to_customers, 30);
  assert.equal(run([], [rt({ order_id: '2', received_date: '2026-11-14' })]).items[0].status, 'waiting');
});

test('two refunds for one unit, and a refund above the line price, are reviewed', () => {
  assert.equal(run([rf(), rf({ refund_date: '2026-10-02' })], [rt()], [ord()]).items[0].findings[0].code, 'refunded_twice');
  const over = run([rf({ amount: '35' })], [rt()], [ord()]).items[0]; assert.equal(over.findings[0].code, 'refund_over_price'); assert.equal(over.findings[0].amount, 15);
});

test('a full refund on a damaged return is flagged; a partial one is not', () => {
  assert.equal(run([rf()], [rt({ condition: 'Damaged box' })], [ord()]).items[0].findings[0].code, 'full_refund_damaged');
  assert.equal(run([rf({ amount: '15' })], [rt({ condition: 'damaged' })], [ord()]).items[0].status, 'ok');
});

test('reminders list only refunds past their window', () => {
  const r = run([rf(), rf({ order_id: '2', refund_date: '2026-11-10' })], []);
  const d = remindersText(r.items); assert.deepEqual(d.orders, ['1:A']); assert.match(d.text, /\[TO CONFIRM your customer service address\]/);
});
