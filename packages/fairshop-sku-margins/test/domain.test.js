// Margins: contribution, label split, fees, floors and missing costs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { marginBySku, reviewText } from '../src/index.js';

const sale = (order_id, sku, revenue, over = {}) => ({ order_id, channel: 'Shopify', sku, qty: '1', revenue: String(revenue), shipping_charged: '0', fees: '0', ...over });
const costs = [{ sku: 'A', unit_cost: '4' }, { sku: 'B', unit_cost: '1' }];

test('contribution is income less cost, fees and the label', () => {
  const r = marginBySku([sale('1', 'A', 10, { shipping_charged: '2', fees: '1' })], costs, [{ order_id: '1', label_cost: '3' }]);
  assert.equal(r.items[0].contribution, 4); assert.equal(r.items[0].margin_pct, 33.3);
});

test('a label is split across the order lines by revenue', () => {
  const r = marginBySku([sale('1', 'A', 30), sale('1', 'B', 10)], costs, [{ order_id: '1', label_cost: '8' }]);
  assert.equal(r.items.find((i) => i.sku === 'A').shipping_cost, 6); assert.equal(r.items.find((i) => i.sku === 'B').shipping_cost, 2);
});

test('channels are kept apart, a loss is "fix" and under the floor is "review"', () => {
  const r = marginBySku([sale('1', 'A', 10), sale('2', 'A', 5, { channel: 'Amazon', fees: '2' })], costs, [], { margin_floor_pct: 50 });
  assert.equal(r.items.find((i) => i.channel === 'Shopify').status, 'ok'); assert.equal(r.items.find((i) => i.channel === 'Amazon').status, 'fix');
  assert.equal(marginBySku([sale('1', 'A', 6)], costs, [], { margin_floor_pct: 50 }).items[0].status, 'review');
});

test('a SKU with no cost is reviewed and left out of the contribution total', () => {
  const r = marginBySku([sale('1', 'Z', 10), sale('2', 'A', 10)], costs);
  assert.equal(r.items.find((i) => i.sku === 'Z').findings[0].code, 'missing_cost'); assert.equal(r.contribution, 6);
});

test('the pricing review lists every pair that is not fine', () => {
  const r = marginBySku([sale('1', 'Z', 10), sale('2', 'A', 10)], costs);
  assert.deepEqual(reviewText(r.items, {}).skus, ['Shopify|Z']);
});
