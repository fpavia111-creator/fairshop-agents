// Cash over/short: tolerance, deposits by amount and window, differences and repeated shortages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCash, noteText } from '../src/index.js';

const co = (date, expected, counted, over = {}) => ({ date, store: 'S', register: 'R1', cashier: 'Pat Example', expected_cash: String(expected), counted_cash: String(counted), float: '100', ...over });
const dep = (date, amount, over = {}) => ({ date, store: 'S', amount: String(amount), ...over });

test('a drawer within tolerance with its deposit is fine', () => {
  assert.equal(checkCash([co('2026-11-01', 300, 301)], [dep('2026-11-02', 201)]).items[0].status, 'ok');
});

test('a short drawer beyond tolerance is reviewed', () => {
  const r = checkCash([co('2026-11-01', 300, 290)], [dep('2026-11-01', 190)]);
  assert.equal(r.items[0].findings[0].code, 'drawer_short'); assert.equal(r.short, 10);
});

test('a deposit is found by amount inside deposit_days; otherwise it is missing', () => {
  assert.equal(checkCash([co('2026-11-01', 300, 300)], [dep('2026-11-05', 200)]).items[0].findings[0].code, 'deposit_missing');
  assert.equal(checkCash([co('2026-11-01', 300, 300)], [dep('2026-11-05', 200)], { deposit_days: 4 }).items[0].status, 'ok');
});

test('exact deposits are matched first; a near one is a difference', () => {
  const r = checkCash([co('2026-11-01', 300, 300), co('2026-11-02', 400, 400)], [dep('2026-11-03', 290), dep('2026-11-02', 200)]);
  assert.equal(r.items.find((i) => i.date === '2026-11-01').status, 'ok'); assert.equal(r.items.find((i) => i.date === '2026-11-02').findings[0].amount, 10);
});

test('repeat_min shortages by one cashier make a cashier item; the note leaves room for the manager', () => {
  const r = checkCash([co('2026-11-01', 300, 290), co('2026-11-02', 300, 290), co('2026-11-03', 300, 290)], [dep('2026-11-01', 190), dep('2026-11-02', 190), dep('2026-11-03', 190)]);
  assert.equal(r.items.find((i) => i.kind === 'cashier').findings[0].code, 'repeat_shortages');
  assert.match(noteText(r.items, {}).text, /\[CHECK manager note\]/);
});
