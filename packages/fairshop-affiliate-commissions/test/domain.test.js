// Affiliate commissions: missing orders, refunds, rates, duplicates, self-referrals and paid status.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCommissions, reversalText } from '../src/index.js';

const c = (over = {}) => ({ action_id: 'A1', affiliate: 'Blog', order_id: '1', order_date: '2026-10-01', sale_amount: '100', commission: '10', status: 'pending', ...over });
const o = (over = {}) => ({ order_id: '1', total: '100', status: 'paid', refunded: '0', customer_email: 'x@example.test', ...over });
const terms = { default_rate_pct: 10, rates: { vip: 15 } };

test('a commission that matches the terms is fine; a missing order is reversed', () => {
  assert.equal(checkCommissions([c()], [o()], terms).items[0].status, 'ok');
  assert.equal(checkCommissions([c({ order_id: '9' })], [o()], terms).items[0].findings[0].code, 'order_not_found');
});

test('refunds remove or reduce the commission due', () => {
  assert.equal(checkCommissions([c()], [o({ status: 'refunded', refunded: '100' })], terms).items[0].recover, 10);
  const part = checkCommissions([c()], [o({ status: 'partially_refunded', refunded: '40' })], terms).items[0]; assert.equal(part.recover, 4); assert.equal(part.findings[0].code, 'commission_on_refunded');
});

test('rates follow the affiliate, then the default', () => {
  assert.equal(checkCommissions([c({ affiliate: 'VIP', commission: '15' })], [o()], terms).items[0].status, 'ok');
  assert.equal(checkCommissions([c({ commission: '15' })], [o()], terms).items[0].recover, 5);
});

test('the later of two commissions on one order is the duplicate, whatever the row order', () => {
  const r = checkCommissions([c({ action_id: 'A2', order_date: '2026-10-05' }), c()], [o()], terms);
  assert.equal(r.items.find((i) => i.id === 'A2').findings[0].code, 'duplicate_commission'); assert.equal(r.items.find((i) => i.id === 'A1').status, 'ok');
});

test('an already paid commission is a clawback; an own-link purchase is reviewed', () => {
  assert.equal(checkCommissions([c({ status: 'Paid', commission: '15' })], [o()], terms).items[0].status, 'clawback');
  const s = checkCommissions([c({ affiliate_email: 'X@example.test' })], [o()], terms).items[0]; assert.equal(s.status, 'review'); assert.equal(s.findings[0].code, 'self_referral');
});

test('the reversal request totals only what to recover', () => {
  const r = checkCommissions([c(), c({ action_id: 'A2', order_id: '9' })], [o()], terms);
  const d = reversalText(r.items, {}); assert.equal(d.total, 10); assert.deepEqual(d.actions, ['A2']); assert.match(d.text, /\[TO CONFIRM affiliate network program support\]/);
});
