// Coupon checks: dates, minimums, limits, new-customer codes, staff codes and unknown codes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCoupons, reviewText } from '../src/index.js';

const code = (over = {}) => ({ discount_code: 'C', type: 'public', max_uses: '', starts: '2026-01-01', ends: '2026-12-31', min_order: '', ...over });
const o = (id, over = {}) => ({ order_id: id, order_date: '2026-10-01', customer_email: `${id}@example.test`, ship_address: `${id} Main St`, ship_zip: '78701', discount_code: 'C', discount_amount: '5', subtotal: '50', ...over });
const codes = (r) => r.items.flatMap((i) => i.findings.map((f) => f.code));

test('a code used outside its dates or under the minimum is outside the rules', () => {
  assert.deepEqual(codes(checkCoupons([o('1', { order_date: '2027-01-02' })], [code()])), ['expired']);
  assert.deepEqual(codes(checkCoupons([o('1', { subtotal: '20' })], [code({ min_order: '30' })])), ['below_minimum']);
});

test('uses are counted in date order inside the dates; single-use means one', () => {
  const r = checkCoupons([o('2', { order_date: '2026-10-02' }), o('1')], [code({ type: 'single_use' })]);
  assert.equal(r.items.find((i) => i.id === '2').findings[0].code, 'over_limit'); assert.equal(r.items.find((i) => i.id === '1').status, 'ok');
  assert.equal(checkCoupons([o('1'), o('2'), o('3')], [code({ type: 'limited', max_uses: '3' })]).abuse, 0);
});

test('a new-customer code is outside the rules for a known e-mail spelling or a known address', () => {
  const nc = [code({ type: 'new_customer' })];
  assert.equal(checkCoupons([o('1', { discount_code: '', order_date: '2026-09-01', customer_email: 'jo.doe@gmail.com' }), o('2', { customer_email: 'jodoe+x@gmail.com' })], nc).abuse, 1);
  const addr = checkCoupons([o('1', { order_date: '2026-09-01', ship_address: '5 Oak Street' }), o('2', { ship_address: '5 oak st' })], nc);
  assert.deepEqual(addr.items.find((i) => i.id === '2').findings.map((f) => f.code), ['new_customer_repeat', 'same_address_many_accounts']);
});

test('only the first finding of an order carries the discount, so nothing is counted twice', () => {
  const r = checkCoupons([o('1', { order_date: '2027-01-02', subtotal: '10' })], [code({ min_order: '30' })]);
  assert.deepEqual(r.items[0].findings.map((f) => f.amount), [5, null]); assert.equal(r.at_stake, 5);
});

test('staff codes need a staff domain; codes not in the list are reviewed', () => {
  const r = checkCoupons([o('1', { discount_code: 'S' }), o('2', { discount_code: 'S', customer_email: 'x@shop.test' }), o('3', { discount_code: 'ZZ' })], [code({ discount_code: 'S', type: 'employee' })], { employee_domains: ['shop.test'] });
  assert.deepEqual(r.items.map((i) => i.status), ['abuse', 'ok', 'review']);
});

test('the review lists codes with orders outside their rules', () => {
  const r = checkCoupons([o('1', { order_date: '2027-01-02' }), o('2', { discount_code: 'D' })], [code(), code({ discount_code: 'D' })]);
  const d = reviewText(r, {}); assert.deepEqual(d.codes, ['C']); assert.match(d.text, /\[CHECK keep \/ limit \/ end\]/);
});
