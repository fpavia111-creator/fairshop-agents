// Three-way match: billed vs received, duplicates, prices, short, over, late and past due.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchPOs, claimText } from '../src/index.js';

const po = (over = {}) => ({ po: 'P1', vendor: 'V', sku: 'A', qty_ordered: '10', unit_cost: '5', promised_date: '2026-10-01', ...over });
const rec = (qty, date = '2026-10-01', over = {}) => ({ po: 'P1', sku: 'A', qty_received: String(qty), received_date: date, ...over });
const inv = (n, qty, price = '5', date = '2026-10-02') => ({ invoice_number: n, vendor: 'V', po: 'P1', sku: 'A', qty_billed: String(qty), unit_price: price, invoice_date: date });
const run = (p, r, i, s = {}, asOf = '2026-11-16') => matchPOs(p, r, i, s, { asOf });

test('a full match is fine', () => { assert.equal(run([po()], [rec(10)], [inv('I1', 10)]).items[0].status, 'ok'); });

test('units billed above units received are claimed at the invoice price', () => {
  const r = run([po()], [rec(8)], [inv('I1', 10)]); assert.equal(r.items[0].claim, 10); assert.equal(r.items[0].status, 'dispute');
});

test('a later invoice repeating the same quantity is a duplicate', () => {
  const r = run([po()], [rec(10)], [inv('I1', 10), inv('I2', 10, '5', '2026-10-09')]);
  assert.equal(r.items[0].findings.find((f) => f.code === 'duplicate_invoice').amount, 50);
});

test('a price above the PO beyond the tolerance is claimed', () => {
  assert.equal(run([po()], [rec(10)], [inv('I1', 10, '5.04')]).items[0].status, 'ok');
  assert.equal(run([po()], [rec(10)], [inv('I1', 10, '5.50')]).items[0].claim, 5);
});

test('short, over, late and past-due lines', () => {
  assert.deepEqual(run([po()], [rec(8, '2026-10-10')], []).items[0].findings.map((f) => f.code), ['short_shipped', 'late_delivery']);
  assert.equal(run([po()], [rec(12)], []).items[0].findings[0].code, 'over_received');
  assert.equal(run([po()], [], []).items[0].status, 'chase');
  assert.equal(run([po({ promised_date: '2026-12-01' })], [], []).items[0].status, 'ok');
});

test('the claim covers one vendor and its total', () => {
  const r = run([po(), po({ po: 'P2', vendor: 'W' })], [rec(8), rec(5, '2026-10-01', { po: 'P2' })], [inv('I1', 10), { ...inv('J1', 10), po: 'P2', vendor: 'W' }]);
  assert.equal(claimText(r.items, { vendor: 'v' }).total, 10);
});
