// Shrink: valuation, found units, target, unexplained share and repeat SKUs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shrinkByStore, reviewText } from '../src/index.js';

const a = (qty, cost, reason, over = {}) => ({ date: '2026-10-01', store: 'S', sku: 'A', category: 'C', qty: String(qty), unit_cost: String(cost), reason, ...over });
const sales = [{ store: 'S', category: 'C', net_sales: '1000' }];

test('shrink is valued at cost, and found units count back', () => {
  const r = shrinkByStore([a(-4, 5, 'Damaged'), a(2, 5, 'Found')], sales);
  assert.equal(r.shrink, 10); assert.equal(r.items[0].shrink_pct, 1);
});

test('a store above the target is listed with the amount above it', () => {
  const r = shrinkByStore([a(-4, 5, 'Damaged')], sales, { target_pct: 1 });
  assert.equal(r.items[0].findings[0].code, 'shrink_above_target'); assert.equal(r.items[0].findings[0].amount, 10);
});

test('a store where most losses have no reason is listed', () => {
  const r = shrinkByStore([a(-4, 5, 'Unknown'), a(-1, 5, 'Damaged')], sales);
  assert.equal(r.items[0].findings.at(-1).code, 'unexplained_high'); assert.equal(r.items[0].unexplained_pct, 80);
});

test('a SKU written off repeat_min times in one store is listed; a store with no sales figure says so', () => {
  const r = shrinkByStore([a(-1, 1, 'Damaged'), a(-1, 1, 'Damaged'), a(-1, 1, 'Damaged')], []);
  assert.equal(r.items.find((i) => i.kind === 'sku').writeoffs, 3); assert.equal(r.items.find((i) => i.kind === 'store').findings[0].code, 'no_sales_figure');
});

test('the review lists stores and SKUs with a next-step marker', () => {
  assert.match(reviewText(shrinkByStore([a(-40, 5, 'Unknown')], sales)).text, /\[CHECK recount \/ move \/ process\]/);
});
