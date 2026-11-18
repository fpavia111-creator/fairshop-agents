// Duplicate listings: same SKU twice, look-alike titles, shared GTINs, orphans and inactive listings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates, cleanupText } from '../src/index.js';

const l = (id, sku, over = {}) => ({ channel: 'Amazon', listing_id: id, sku, title: `Title ${sku}`, gtin: '', price: '10', status: 'active', ...over });

test('the same SKU twice on one channel is a duplicate; on two channels it is not', () => {
  const r = findDuplicates([l('1', 'A'), l('2', 'A', { price: '9' })]);
  assert.equal(r.items.find((i) => i.listing_id === '2').findings[0].code, 'duplicate_sku_listing'); assert.match(r.items[1].findings[0].detail, /different prices/);
  assert.equal(findDuplicates([l('1', 'A'), l('2', 'A', { channel: 'eBay' })]).fix, 0);
});

test('an inactive second listing is not a duplicate', () => {
  assert.equal(findDuplicates([l('1', 'A'), l('2', 'A', { status: 'Inactive' })]).fix, 0);
});

test('look-alike titles under different SKUs are reviewed; the threshold is a setting', () => {
  const rows = [l('1', 'A', { title: 'Blue ceramic mug 12 oz' }), l('2', 'B', { title: 'Ceramic mug blue 12 oz' })];
  assert.equal(findDuplicates(rows).review, 1); assert.equal(findDuplicates([l('1', 'A', { title: 'Blue mug' }), l('2', 'B', { title: 'Red bowl' })]).review, 0);
});

test('one GTIN on two SKUs is one review item; orphans need a catalog', () => {
  const r = findDuplicates([l('1', 'A', { gtin: '036000291452' }), l('2', 'B', { gtin: '036000291452', channel: 'eBay' })], [{ sku: 'A' }]);
  assert.equal(r.items.find((i) => i.kind === 'gtin').sku, 'A B'); assert.equal(r.items.find((i) => i.listing_id === '2').findings[0].code, 'orphan_listing');
});

test('the clean-up list carries every flagged listing with an action marker', () => {
  const r = findDuplicates([l('1', 'A'), l('2', 'A')]);
  assert.match(cleanupText(r.items).text, /\[CHECK keep \/ end \/ merge \/ relink\]/);
});
