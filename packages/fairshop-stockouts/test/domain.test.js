// Stockouts: out-of-stock days, oversold orders, the in-stock sales rate and the reorder point.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStockouts, poText } from '../src/index.js';

const snap = (d, n, sku = 'A') => ({ date: `2026-11-0${d}`, sku, on_hand: String(n) });
const ord = (id, d, qty = 1, over = {}) => ({ order_id: id, order_date: `2026-11-0${d}`, sku: 'A', qty: String(qty), price: '10', status: 'paid', ...over });

test('the daily rate counts only in-stock days, and lost sales are rate × out-of-stock days', () => {
  const r = checkStockouts([snap(1, 5), snap(2, 0), snap(3, 4)], [ord('1', 1, 2), ord('2', 3, 2)]);
  const s = r.items.find((i) => i.kind === 'sku'); assert.equal(s.daily, 2); assert.equal(s.out_days, 1); assert.equal(r.lost_sales_estimate, 20);
});

test('an order on an empty day, or cancelled for stock, is oversold; other cancellations are not', () => {
  const r = checkStockouts([snap(1, 0)], [ord('1', 1), ord('2', 1, 1, { status: 'cancelled', cancel_reason: 'Sold out' }), ord('3', 1, 1, { status: 'cancelled', cancel_reason: 'Customer changed mind' })]);
  assert.deepEqual(r.items.filter((i) => i.kind === 'order').map((i) => i.order_id), ['1', '2']); assert.equal(r.oversold_value, 20);
});

test('a reorder is suggested when days of cover fall under lead time plus safety', () => {
  const r = checkStockouts([snap(1, 20), snap(2, 18)], [ord('1', 1, 2), ord('2', 2, 2)], { lead_time_days: { A: 10 }, safety_days: 0, order_days: 10 });
  const s = r.items[0]; assert.equal(s.status, 'reorder'); assert.equal(s.days_of_cover, 9); assert.equal(s.suggested, 22);
  assert.equal(checkStockouts([snap(1, 20), snap(2, 18)], [ord('1', 1, 2)], { lead_time_days: { A: 5 }, safety_days: 0 }).items[0].status, 'ok');
});

test('a SKU with no sales is never reordered', () => {
  assert.equal(checkStockouts([snap(1, 1)], []).items[0].status, 'ok');
});

test('the purchase order lists reorder SKUs and leaves PO number and cost to confirm', () => {
  const r = checkStockouts([snap(1, 2), snap(2, 1)], [ord('1', 1), ord('2', 2)]);
  const d = poText(r.items, { supplier: 'S' }); assert.deepEqual(d.skus, ['A']); assert.match(d.text, /\[TO CONFIRM PO number\]/); assert.match(d.text, /\[TO CONFIRM cost\]/);
});
