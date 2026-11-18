// Fee checks: schedule rules, minimums, categories, unknown fees, missing sales and rate moves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditFees, feeKey, expectedFee, disputeText } from '../src/index.js';

const sched = { channels: { amazon: { referral: { percent: 15, min: 0.3, by_category: { jewelry: 20 } } }, etsy: { listing: { fixed: 0.2 } } } };
const l = (over = {}) => ({ order_id: 'A1', channel: 'Amazon', date: '2026-10-01', fee_type: 'Commission', fee: '-1.50', sale_amount: '10', category: 'home', ...over });

test('fee wording from exports maps onto schedule keys, and settings aliases win', () => {
  assert.equal(feeKey('Commission'), 'referral'); assert.equal(feeKey('ReferralFee'), 'referral');
  assert.equal(feeKey('FBAPerUnitFulfillmentFee'), 'fba fulfillment'); assert.equal(feeKey('Final Value Fee'), 'final value');
  assert.equal(feeKey('Commission', { Commission: 'special' }), 'special'); assert.equal(feeKey('Mystery Charge'), 'mystery charge');
});

test('expected fee uses the category percent, the minimum and the fixed part', () => {
  const r = sched.channels.amazon.referral;
  assert.equal(expectedFee(r, 10, 'home'), 1.5); assert.equal(expectedFee(r, 10, 'Jewelry'), 2); assert.equal(expectedFee(r, 1, 'home'), 0.3);
  assert.equal(expectedFee(r, null, 'home'), null); assert.equal(expectedFee({ fixed: 0.2 }, null), 0.2);
});

test('a fee above the schedule is disputed for the difference only; signs do not matter', () => {
  const r = auditFees([l({ fee: '-2.10' }), l({ order_id: 'A2', fee: '1.50' })], sched);
  assert.deepEqual(r.items.map((i) => i.status).sort(), ['dispute', 'ok']); assert.equal(r.over, 0.6);
});

test('a fee type not in the schedule and a percent fee without a sale are reviewed, not disputed', () => {
  const r = auditFees([l({ fee_type: 'Inbound placement fee' }), l({ order_id: 'A2', sale_amount: '' })], sched);
  assert.deepEqual(r.items.map((i) => i.findings[0].code).sort(), ['fee_not_in_schedule', 'fee_without_sale']); assert.equal(r.dispute, 0);
});

test('a monthly effective-rate move above the threshold is listed once per move', () => {
  const r = auditFees([l({ date: '2026-09-01' }), l({ order_id: 'A2', date: '2026-10-01', fee: '-2.00' }), l({ order_id: 'A3', date: '2026-11-01', fee: '-2.05' })], { ...sched, rate_change_points: 1 });
  assert.equal(r.rate_changes.length, 1); assert.deepEqual([r.rate_changes[0].from_pct, r.rate_changes[0].to_pct], [15, 20]);
});

test('the review request lists only disputed lines and keeps a check marker', () => {
  const r = auditFees([l({ fee: '-2.10' }), l({ order_id: 'A2' })], sched);
  const d = disputeText(r.items, { channel: 'Amazon' });
  assert.equal(d.total, 0.6); assert.equal(d.lines.length, 1); assert.match(d.text, /\[TO CONFIRM Amazon seller support\]/); assert.match(d.text, /\[CHECK the fee schedule/);
});
