// Return reasons: grouping, SKU rates, minimum volume, repeat returners and masking-friendly ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseReturns, reasonGroup, reviewText } from '../src/index.js';

const o = (order_id, sku, qty, customer_email = 'a@example.test') => ({ order_id, sku, qty: String(qty), customer_email });
const r = (order_id, sku, reason, qty = 1, customer_email = 'a@example.test') => ({ order_id, sku, reason, qty: String(qty), customer_email });

test('reasons fold into groups, and your own wording wins', () => {
  assert.equal(reasonGroup('Not as pictured'), 'listing'); assert.equal(reasonGroup('Runs too tight'), 'size'); assert.equal(reasonGroup('Stopped working'), 'quality');
  assert.equal(reasonGroup('Wrong item sent'), 'fulfillment'); assert.equal(reasonGroup('Changed my mind'), 'customer'); assert.equal(reasonGroup('??'), 'other');
  assert.equal(reasonGroup('Code 7', { 'code 7': 'size' }), 'size');
});

test('a SKU is judged only after enough units, and listed at or above the rate', () => {
  const orders = [o('1', 'A', 10), o('2', 'B', 5)]; const returns = [r('1', 'A', 'too small', 2), r('2', 'B', 'damaged', 3)];
  const res = analyseReturns(returns, orders);
  assert.equal(res.items.find((i) => i.id === 'SKU:A').status, 'review'); assert.equal(res.items.find((i) => i.id === 'SKU:B').status, 'ok');
});

test('two not-as-described returns raise a listing finding even under the rate', () => {
  const res = analyseReturns([r('1', 'A', 'not as described'), r('2', 'A', 'Not as described')], [o('1', 'A', 50), o('2', 'A', 50)]);
  assert.deepEqual(res.items.find((i) => i.id === 'SKU:A').findings.map((f) => f.code), ['listing_mismatch']);
});

test('a repeat returner is found across e-mail spellings, and the id hides the address', () => {
  const orders = [o('1', 'A', 1, 'Jo.Doe@gmail.com'), o('2', 'A', 1, 'jodoe+x@gmail.com'), o('3', 'A', 1, 'jodoe@gmail.com'), o('4', 'A', 1, 'jodoe@gmail.com')];
  const returns = [r('1', 'A', 'x', 1, 'jodoe@gmail.com'), r('2', 'A', 'x', 1, 'jo.doe@gmail.com'), r('3', 'A', 'x', 1, 'JODOE@gmail.com')];
  const c = analyseReturns(returns, orders).items.find((i) => i.kind === 'customer');
  assert.equal(c.status, 'review'); assert.match(c.id, /^CUST-[0-9a-f]{10}$/); assert.equal(c.units_returned, 3); assert.equal(c.units_sold, 4);
});

test('the listing review lists flagged SKUs with a change marker', () => {
  const res = analyseReturns([r('1', 'A', 'too small', 3)], [o('1', 'A', 10)]);
  const d = reviewText(res.items, {}); assert.deepEqual(d.skus, ['A']); assert.match(d.text, /\[CHECK proposed change\]/);
});
