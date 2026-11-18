// MAP: own listings first, resellers, repeats, exemptions, pauses and unknown SKUs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMap, noticeText } from '../src/index.js';

const p = (seller, sku, price, over = {}) => ({ date: '2026-11-01', seller, channel: 'Amazon', sku, advertised_price: String(price), is_own: 'no', ...over });
const policy = { map: { A: 50 } };

test('your own listing below MAP comes first as "own"', () => {
  assert.equal(checkMap([p('Us', 'A', 45, { is_own: 'yes' })], policy).items[0].status, 'own');
});

test('a reseller below MAP gets a notice; at MAP or within the tolerance it is fine', () => {
  assert.equal(checkMap([p('R', 'A', 45)], policy).items[0].status, 'notice');
  assert.equal(checkMap([p('R', 'A', 49.995)], policy).items[0].status, 'ok');
});

test('two different days below MAP make a repeat', () => {
  const r = checkMap([p('R', 'A', 45), p('R', 'A', 44, { date: '2026-11-05' })], policy);
  assert.deepEqual(r.items[0].findings.map((f) => f.code), ['below_map', 'repeat_below_map']); assert.equal(r.items[0].findings[0].amount, 6);
});

test('exempt sellers and paused dates are left alone; unknown SKUs are reviewed', () => {
  assert.equal(checkMap([p('Clear', 'A', 40)], { ...policy, exempt_sellers: ['clear'] }).items[0].status, 'ok');
  assert.equal(checkMap([p('R', 'A', 40)], { ...policy, pause: [{ from: '2026-11-01', to: '2026-11-01' }] }).items[0].status, 'ok');
  assert.equal(checkMap([p('R', 'Z', 1)], policy).items[0].status, 'review');
});

test('the notice lists one seller\'s SKUs and keeps a wording check', () => {
  const r = checkMap([p('R', 'A', 45), p('S', 'A', 45)], policy);
  const d = noticeText(r.items, { seller: 'r' }); assert.deepEqual(d.skus, ['A']); assert.match(d.text, /\[CHECK the wording/);
});
