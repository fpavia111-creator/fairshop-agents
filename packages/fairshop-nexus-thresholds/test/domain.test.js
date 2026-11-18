// Nexus: periods, either/both tests, marketplace sales, registration and the date met.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNexus, memoText } from '../src/index.js';

const o = (id, d, st, amt, over = {}) => ({ order_id: id, order_date: d, ship_state: st, channel: 'Shopify', amount: String(amt), status: 'paid', ...over });
const run = (orders, thresholds, extra = {}, asOf = '2026-11-16') => checkNexus(orders, { thresholds, ...extra }, { asOf });

test('the date met is the order that crossed the threshold', () => {
  const r = run([o('1', '2026-02-01', 'WA', 60), o('2', '2026-05-01', 'WA', 50)], { WA: { sales: 100 } });
  assert.equal(r.items[0].status, 'over_not_registered'); assert.equal(r.items[0].crossed_on, '2026-05-01');
});

test('previous or current year takes either calendar year; rolling 12 uses the last 365 days', () => {
  assert.equal(run([o('1', '2025-03-01', 'WA', 120)], { WA: { sales: 100 } }).items[0].status, 'over_not_registered');
  assert.equal(run([o('1', '2025-03-01', 'WA', 120)], { WA: { sales: 100, period: 'rolling_12' } }).items[0].status, 'under');
  assert.equal(run([o('1', '2025-03-01', 'WA', 120)], { WA: { sales: 100, period: 'current_year' } }).items[0].status, 'under');
});

test('"both" needs sales and orders; "either" needs one', () => {
  const os = [o('1', '2026-01-01', 'NY', 10), o('2', '2026-02-01', 'NY', 10), o('3', '2026-03-01', 'NY', 10)];
  assert.equal(run(os, { NY: { sales: 1000, transactions: 3 } }).items[0].status, 'over_not_registered');
  assert.equal(run(os, { NY: { sales: 1000, transactions: 3, test: 'both' } }).items[0].status, 'under');
});

test('marketplace sales count only when the settings say so; cancelled orders never count', () => {
  const os = [o('1', '2026-01-01', 'CO', 90, { channel: 'Amazon' }), o('2', '2026-02-01', 'CO', 20), o('3', '2026-03-01', 'CO', 500, { status: 'cancelled' })];
  assert.equal(run(os, { CO: { sales: 100 } }).items[0].status, 'over_not_registered');
  assert.equal(run(os, { CO: { sales: 100, include_marketplace: false } }).items[0].status, 'under');
});

test('registered states, states approaching and states without a threshold', () => {
  const r = run([o('1', '2026-01-01', 'TX', 200), o('2', '2026-01-01', 'CA', 85), o('3', '2026-01-01', 'FL', 5)], { TX: { sales: 100 }, CA: { sales: 100 } }, { registered: ['Texas'] });
  assert.deepEqual(r.items.map((i) => [i.state, i.status]), [['CA', 'approaching'], ['FL', 'no_threshold'], ['TX', 'registered']]);
  assert.match(memoText(r, {}).text, /not tax advice/);
});
