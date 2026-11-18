// Product data: GTIN check digits, required fields, channel limits, shared GTINs and zero values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCatalog, gtinValid } from '../src/index.js';

const p = (over = {}) => ({ sku: 'A', channel: 'Shopify', title: 'Mug', description: 'x'.repeat(120), gtin: '036000291452', brand: 'B', weight: '1', image_count: '2', price: '10', ...over });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('GTIN check digits for 8, 12, 13 and 14 digits', () => {
  assert.ok(gtinValid('036000291452')); assert.ok(gtinValid('4006381333931')); assert.ok(gtinValid('96385074')); assert.ok(gtinValid('00036000291452'));
  assert.ok(!gtinValid('036000291453')); assert.ok(!gtinValid('12345')); assert.ok(!gtinValid('ABC'));
});

test('a complete product is fine; missing required fields are listed together', () => {
  assert.equal(checkCatalog([p()]).items[0].status, 'ok');
  const r = checkCatalog([p({ gtin: '', brand: '' })]); assert.deepEqual(codes(r), ['missing_fields']); assert.equal(r.items[0].completeness_pct, 60);
});

test('title limits follow the channel, then the default', () => {
  assert.deepEqual(codes(checkCatalog([p({ channel: 'Etsy', title: 'x'.repeat(70) })], { channels: { etsy: { title_max: 60 } } })), ['title_too_long']);
  assert.equal(checkCatalog([p({ title: 'x'.repeat(70) })], { channels: { etsy: { title_max: 60 } } }).items[0].status, 'ok');
});

test('a GTIN shared by two SKUs is flagged on all but the first SKU', () => {
  const r = checkCatalog([p(), p({ sku: 'B' })]);
  assert.equal(r.items.find((i) => i.sku === 'A').status, 'ok'); assert.deepEqual(r.items.find((i) => i.sku === 'B').findings.map((f) => f.code), ['gtin_shared']);
});

test('zero weight, zero price, too few images and short descriptions are flagged', () => {
  assert.deepEqual(codes(checkCatalog([p({ weight: '0', price: '0', image_count: '0', description: 'Short.' })])), ['weight_zero', 'price_zero', 'images_below_min', 'description_short']);
});
