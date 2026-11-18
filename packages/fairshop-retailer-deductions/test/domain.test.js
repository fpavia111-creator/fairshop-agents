// Retailer deductions: classes, POD shortages, allowances, duplicates, write-offs and windows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDeductions, deductionClass, disputeText } from '../src/index.js';

const d = (over = {}) => ({ retailer: 'R', remit_id: 'M1', invoice_number: 'I1', deduction_type: 'Shortage', amount: '100', deduction_date: '2026-10-01', ...over });
const inv = [{ invoice_number: 'I1', amount: '1000', units_shipped: '10' }];
const run = (ds, pods = [], s = {}, asOf = '2026-11-16') => checkDeductions(ds, inv, pods, s, { asOf });

test('deduction wording is classed', () => {
  assert.equal(deductionClass('MDF co-op'), 'promo'); assert.equal(deductionClass('Late ASN fine'), 'compliance'); assert.equal(deductionClass('Concealed shortage'), 'shortage');
  assert.equal(deductionClass('Defective allowance'), 'promo'); assert.equal(deductionClass('Price difference'), 'pricing');
});

test('a shortage is disputed only with a signed full POD', () => {
  assert.equal(run([d()], [{ invoice_number: 'I1', units_delivered: '10', signed: 'yes' }]).items[0].status, 'dispute');
  assert.equal(run([d()], [{ invoice_number: 'I1', units_delivered: '10', signed: 'no' }]).items[0].status, 'ok');
  assert.equal(run([d()]).items[0].findings[0].code, 'shortage_no_pod');
});

test('an allowance above the agreed percent is disputed for the excess', () => {
  const r = run([d({ deduction_type: 'Promo allowance', amount: '80' })], [], { allowances: { r: { promo: 5 } } });
  assert.equal(r.items[0].recover, 30);
  assert.equal(run([d({ deduction_type: 'Promo allowance', amount: '40' })], [], { allowances: { R: { promo: 5 } } }).items[0].status, 'ok');
});

test('the same deduction taken twice is disputed in full, the first stays as it is', () => {
  const r = run([d({ deduction_type: 'Pricing' }), d({ deduction_type: 'Pricing', remit_id: 'M2', deduction_date: '2026-10-08' })]);
  assert.deepEqual(r.items.map((i) => i.status).sort(), ['dispute', 'review']);
});

test('small deductions are written off; past the window they are closed', () => {
  assert.equal(run([d({ deduction_type: 'Pricing', amount: '10' })]).items[0].status, 'write_off');
  assert.equal(run([d({ deduction_type: 'Pricing', deduction_date: '2026-06-01' })]).items[0].status, 'window_closed');
  assert.match(disputeText(run([d()], [{ invoice_number: 'I1', units_delivered: '10', signed: 'yes' }]).items, { retailer: 'r' }).text, /\[ATTACH signed proof of delivery/);
});
