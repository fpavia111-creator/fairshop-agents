// FBA reimbursements: reason codes, found units, reimbursed units, windows, returns and low values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findReimbursements, reasonClass, caseText } from '../src/index.js';

const adj = (over = {}) => ({ date: '2026-10-01', sku: 'A', reason: 'M', quantity: '-2', ...over });
const run = (files, settings = {}, asOf = '2026-11-16') => findReimbursements(files, { unit_values: { A: 10 }, ...settings }, { asOf });

test('reason codes and words are classed, and settings codes win', () => {
  assert.equal(reasonClass('M'), 'lost'); assert.equal(reasonClass('f'), 'found'); assert.equal(reasonClass('E'), 'damaged');
  assert.equal(reasonClass('Misplaced'), 'lost'); assert.equal(reasonClass('Damaged_Warehouse'), 'damaged'); assert.equal(reasonClass('O'), 'other');
  assert.equal(reasonClass('Z', { lost_codes: ['Z'] }), 'lost');
});

test('found units offset the earliest lost units first, then warehouse reimbursements', () => {
  const r = run({ adjustments: [adj(), adj({ date: '2026-10-05', reason: 'F', quantity: '1' }), adj({ date: '2026-10-08', quantity: '-1' })], reimbursements: [{ reimbursement_id: 'R', sku: 'A', reason: 'Lost_Warehouse', quantity: '1', amount: '10' }] });
  const i = r.items.find((x) => x.id === 'SKU:A'); assert.equal(i.units, 1); assert.equal(i.value, 10); assert.equal(i.claim_by, '2026-12-07');
});

test('a unit is not claimed inside the wait, and not after the window', () => {
  assert.equal(run({ adjustments: [adj({ date: '2026-11-01' })] }).items[0].status, 'waiting');
  const closed = run({ adjustments: [adj({ date: '2026-08-01' })] }).items[0];
  assert.equal(closed.status, 'window_closed'); assert.equal(closed.lost_value, 20);
});

test('a refund with no return is claimed after the grace days, unless a reimbursement names the order', () => {
  const refunds = [{ order_id: 'O1', sku: 'A', refund_date: '2026-09-01', amount: '20', quantity: '2' }];
  const r = run({ refunds, returns: [{ order_id: 'O1', sku: 'A', quantity: '1' }] });
  assert.equal(r.items[0].status, 'claim'); assert.equal(r.items[0].value, 10);
  assert.equal(run({ refunds, reimbursements: [{ reimbursement_id: 'R', sku: 'A', order_id: 'O1', quantity: '2', amount: '20' }] }).items.find((i) => i.kind === 'refund').status, 'ok');
});

test('a reimbursement under the unit value by more than low_pct is listed for review', () => {
  const r = run({ adjustments: [], reimbursements: [{ reimbursement_id: 'R9', sku: 'A', reason: 'Lost', quantity: '2', amount: '12' }] });
  assert.equal(r.review, 1); assert.equal(r.items[0].findings[0].amount, 8);
  assert.equal(run({ adjustments: [], reimbursements: [{ reimbursement_id: 'R9', sku: 'A', reason: 'Lost', quantity: '2', amount: '17' }] }).review, 0);
});

test('the case lists claims and low reimbursements with an attach marker', () => {
  const r = run({ adjustments: [adj()] });
  const d = caseText(r.items, {}); assert.equal(d.total, 20); assert.deepEqual(d.claims, ['SKU:A']);
  assert.match(d.text, /\[TO CONFIRM merchant token\]/); assert.match(d.text, /\[ATTACH proof of cost/);
});
