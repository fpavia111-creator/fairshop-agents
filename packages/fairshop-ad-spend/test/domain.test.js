// Ad spend: return against target, no sales, budgets, out-of-stock SKUs and over-attribution.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAds, reviewText } from '../src/index.js';

const ad = (over = {}) => ({ date: '2026-10-01', platform: 'Google Ads', campaign: 'C', sku: 'A', spend: '100', attributed_sales: '400', ...over });

test('a campaign under the target return is reviewed; the target follows the platform', () => {
  assert.equal(checkAds([ad({ attributed_sales: '200' })]).items[0].status, 'review');
  assert.equal(checkAds([ad({ attributed_sales: '200' })], [], null, { target_roas: { 'Google Ads': 1.5 } }).items[0].status, 'ok');
});

test('spend with no sales is fixed from the minimum spend', () => {
  assert.equal(checkAds([ad({ attributed_sales: '0' })]).items[0].findings[0].code, 'spend_no_sales');
  assert.equal(checkAds([ad({ attributed_sales: '0', spend: '20' })]).items[0].status, 'ok');
});

test('monthly spend over the budget is reviewed per month', () => {
  const r = checkAds([ad({ spend: '80' }), ad({ date: '2026-10-20', spend: '80' }), ad({ date: '2026-11-02', spend: '50' })], [], null, { budgets: { C: 100 } });
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['over_budget', 60]]);
});

test('ads for an out-of-stock SKU are fixed when stock is given', () => {
  assert.equal(checkAds([ad()], [], [{ sku: 'a', available: '0' }]).items[0].findings[0].code, 'spend_on_out_of_stock');
});

test('attribution above actual sales is a SKU item only when sales are given', () => {
  const ads = [ad(), ad({ platform: 'Meta Ads', attributed_sales: '300' })];
  assert.equal(checkAds(ads, [{ order_id: '1', sku: 'A', revenue: '500' }]).items.find((i) => i.kind === 'sku').findings[0].amount, 200);
  assert.equal(checkAds(ads).items.some((i) => i.kind === 'sku'), false);
  assert.match(reviewText(checkAds([ad({ attributed_sales: '0' })]).items, {}).text, /\[CHECK keep \/ cut \/ pause\]/);
});
