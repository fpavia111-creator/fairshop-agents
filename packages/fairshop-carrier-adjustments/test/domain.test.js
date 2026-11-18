// Carrier adjustments: recomputed billable weight, wrong product data, repeats, windows and other reasons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAdjustments, disputeText } from '../src/index.js';

const adj = (over = {}) => ({ tracking: 'T1', date: '2026-11-01', carrier: 'UPS', reason: 'Dimensional weight', amount: '5', billed_weight: '12', ...over });
const lab = (over = {}) => ({ tracking: 'T1', order_id: 'O1', sku: 'A', entered_weight: '5', length: '12', width: '10', height: '8', ...over });
const run = (a, l, s = {}, asOf = '2026-11-16') => checkAdjustments(a, l, s, { asOf });

test('an adjustment above what the label gives is disputed, with a dispute-by date', () => {
  const r = run([adj()], [lab()]); assert.equal(r.items[0].status, 'dispute'); assert.equal(r.items[0].dispute_by, '2026-12-01');
});

test('the divisor follows the carrier setting', () => {
  assert.equal(run([adj({ billed_weight: '7' })], [lab()]).items[0].status, 'fix_data');
  assert.equal(run([adj({ billed_weight: '7' })], [lab()], { dim_divisor: { ups: 166 } }).items[0].status, 'dispute');
});

test('right adjustments point at product data, and repeats make a SKU item', () => {
  const r = run([adj({ billed_weight: '7' }), adj({ tracking: 'T2', billed_weight: '7' })], [lab(), lab({ tracking: 'T2' })]);
  assert.equal(r.items.find((i) => i.kind === 'sku').findings[0].code, 'repeat_sku'); assert.equal(r.fix_data, 3);
});

test('no dimensions, other reasons and address corrections are reviewed', () => {
  assert.equal(run([adj()], [lab({ length: '' })]).items[0].findings[0].code, 'no_declared_dims');
  assert.equal(run([adj({ reason: 'Address Correction' })], [lab()]).items[0].findings[0].code, 'address_correction');
  assert.equal(run([adj({ reason: 'Saturday delivery' })], [lab()]).items[0].findings[0].code, 'other_adjustment');
});

test('past the window a disputable adjustment is lost, and the dispute lists only open ones', () => {
  const r = run([adj({ date: '2026-09-01' }), adj({ tracking: 'T2' })], [lab(), lab({ tracking: 'T2' })]);
  assert.equal(r.window_closed, 1); assert.deepEqual(disputeText(r.items, { carrier: 'UPS' }).trackings, ['T2']);
});
