// Landed cost: weight and value bases, weighted averages, fallbacks, missing costs and recorded costs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landedCost, updatesText } from '../src/index.js';

const ln = (sku, qty, cost, w, sid = 'S1') => ({ shipment_id: sid, sku, qty: String(qty), unit_cost: String(cost), unit_weight: w === null ? '' : String(w) });
const c = (type, amount, sid = 'S1') => ({ shipment_id: sid, cost_type: type, amount: String(amount) });
const sku = (r, k) => r.items.find((i) => i.id === `SKU:${k}`);

test('freight goes by weight and duty by value by default', () => {
  const r = landedCost([ln('A', 10, 10, 1), ln('B', 10, 30, 3)], [c('Freight', 40), c('Duty', 40)]);
  assert.equal(sku(r, 'A').landed_unit, 12); assert.equal(sku(r, 'B').landed_unit, 36);
});

test('the basis can be set per cost type, and units are an option', () => {
  const r = landedCost([ln('A', 10, 10, 1), ln('B', 30, 10, 1)], [c('Freight', 40)], [], { basis: { freight: 'units' } });
  assert.equal(sku(r, 'A').extra, 10); assert.equal(sku(r, 'B').extra, 30);
});

test('a SKU in two shipments gets a weighted landed cost', () => {
  const r = landedCost([ln('A', 10, 10, 1, 'S1'), ln('A', 30, 10, 1, 'S2')], [c('Freight', 20, 'S1'), c('Freight', 20, 'S2')]);
  assert.equal(sku(r, 'A').landed_unit, 11);
});

test('no weights fall back to value; no costs and orphan costs are listed', () => {
  const r = landedCost([ln('A', 10, 10, null)], [c('Freight', 10), c('Freight', 5, 'S9')]);
  assert.deepEqual(r.items.filter((i) => i.kind === 'shipment').map((i) => i.findings[0].code).sort(), ['basis_fallback', 'costs_no_shipment']);
  assert.equal(landedCost([ln('A', 10, 10, 1)], []).items.find((i) => i.kind === 'shipment').findings[0].code, 'costs_missing');
});

test('a recorded cost beyond the variance is listed with the value at stake', () => {
  const r = landedCost([ln('A', 10, 10, 1)], [c('Duty', 20)], [{ sku: 'A', recorded_cost: '10' }]);
  assert.equal(sku(r, 'A').findings[0].code, 'recorded_cost_low'); assert.equal(sku(r, 'A').findings[0].amount, 20);
  assert.deepEqual(updatesText(r.items).skus, ['A']);
});
