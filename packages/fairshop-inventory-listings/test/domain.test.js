// Inventory against listings: feeding locations, committed units, buffers, zero listings and stranded stock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareListings, updatesText } from '../src/index.js';

const st = (sku, location, on_hand, committed = '0') => ({ sku, location, on_hand: String(on_hand), committed });
const li = (channel, sku, qty, over = {}) => ({ channel, sku, listing_id: `${channel}-${sku}`, listed_qty: String(qty), status: 'active', fulfillment: 'merchant', ...over });

test('merchant listings ship from non-FBA locations, FBA listings from FBA', () => {
  const r = compareListings([st('A', 'WH', 5), st('A', 'FBA', 9)], [li('Shopify', 'A', 5), li('Amazon', 'A', 9, { fulfillment: 'FBA' })]);
  assert.deepEqual(r.items.map((i) => i.status), ['ok', 'ok']);
});

test('committed units and the channel buffer reduce what can ship', () => {
  const r = compareListings([st('A', 'WH', 10, '3')], [li('eBay', 'A', 7)], { buffer: { ebay: 2 } });
  assert.equal(r.items[0].status, 'fix'); assert.equal(r.items[0].oversell_units, 2); assert.equal(r.items[0].can_ship, 5);
});

test('a listing at zero with stock, and an inactive listing with stock, are flagged', () => {
  const r = compareListings([st('A', 'WH', 4)], [li('Etsy', 'A', 0), li('Walmart', 'A', 0, { status: 'Inactive' })]);
  assert.deepEqual(r.items.map((i) => i.findings[0].code), ['listed_zero_with_stock', 'inactive_with_stock']);
});

test('unknown SKUs are reviewed and stock with no active listing is stranded', () => {
  const r = compareListings([st('A', 'WH', 4), st('B', 'WH', 6)], [li('Shopify', 'Z', 1), li('Shopify', 'A', 4)]);
  assert.equal(r.items.find((i) => i.sku === 'Z').findings[0].code, 'unknown_sku'); assert.equal(r.stranded_units, 6);
});

test('feeding locations can be set by name', () => {
  const r = compareListings([st('A', 'East', 5), st('A', 'West', 5)], [li('Shopify', 'A', 10)], { feeds: { merchant: ['east'] } });
  assert.equal(r.items[0].can_ship, 5); assert.deepEqual(updatesText(r.items).listings, ['Shopify:Shopify-A']);
});

test('a stock row or a listing with no SKU is reported once by name, not as a SKU called "" (final pass, Shopify inventory template)', () => {
  const r = compareListings([{ sku: '', location: 'Main', on_hand: '8', Title: 'Example buns' }, { sku: 'A', location: 'Main', on_hand: '5' }], [{ channel: 'Shopify', sku: 'A', listing_id: 'L1', listed_qty: '5' }, { channel: 'eBay', sku: '', listing_id: 'L2', listed_qty: '1' }]);
  const none = r.items.find((i) => i.id === 'NO-SKU');
  assert.deepEqual(none.findings.map((f) => f.code), ['stock_no_sku']); assert.match(none.findings[0].detail, /Example buns/);
  assert.deepEqual(r.items.find((i) => i.id === 'eBay:L2').findings.map((f) => f.code), ['listing_no_sku']);
  assert.ok(!r.items.some((i) => i.id === 'SKU:'));
});
