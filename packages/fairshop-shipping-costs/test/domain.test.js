// Shipping costs: losses, free-shipping threshold, duplicate labels, voids and orphan labels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkShipping, refundText } from '../src/index.js';

const o = (id, charged, subtotal = '40') => ({ order_id: id, channel: 'Shopify', shipping_charged: String(charged), subtotal });
const l = (id, cost, tracking, over = {}) => ({ order_id: id, label_date: '2026-10-01', label_cost: String(cost), tracking, voided: 'no', refund_status: '', ...over });
const run = (orders, labels, s = {}, asOf = '2026-11-16') => checkShipping(orders, labels, s, { asOf });

test('a label within the tolerance of what was charged is fine; above it is reviewed', () => {
  assert.equal(run([o('1', 5)], [l('1', 5.9, 'T1')]).items[0].status, 'ok');
  assert.equal(run([o('1', 5)], [l('1', 7, 'T1')]).items[0].findings[0].amount, 2);
});

test('free shipping is expected above the threshold and flagged under it', () => {
  assert.equal(run([o('1', 0, '80')], [l('1', 9, 'T1')], { free_shipping_threshold: 50 }).items[0].status, 'ok');
  assert.equal(run([o('1', 0, '30')], [l('1', 9, 'T1')], { free_shipping_threshold: 50 }).items[0].findings[0].code, 'free_below_threshold');
});

test('two live labels on one order: the extra one is claimed', () => {
  const r = run([o('1', 10)], [l('1', 6, 'T1'), l('1', 6, 'T2')]);
  assert.equal(r.items[0].status, 'claim'); assert.equal(r.to_claim, 6);
});

test('a voided label is claimed only after the wait and only if not refunded', () => {
  assert.equal(run([o('1', 5)], [l('1', 5, 'T1', { voided: 'yes', refund_status: 'pending' })]).items.find((i) => i.kind === 'label').status, 'claim');
  assert.equal(run([o('1', 5)], [l('1', 5, 'T1', { voided: 'yes', refund_status: 'Refunded' })]).items.some((i) => i.kind === 'label'), false);
  assert.equal(run([o('1', 5)], [l('1', 5, 'T1', { voided: 'yes', refund_status: 'pending' })], {}, '2026-10-15').items.some((i) => i.kind === 'label'), false);
});

test('a label with no order is reviewed, and the refund request totals only claims', () => {
  const r = run([o('1', 10)], [l('1', 6, 'T1'), l('1', 6, 'T2'), l('X', 4, 'T3')]);
  assert.equal(r.items.find((i) => i.id === 'LABEL:T3').findings[0].code, 'label_no_order');
  assert.equal(refundText(r.items, {}).total, 6);
});
