// Storage fees: rates by tier and season, aged brackets, warnings and margins.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditStorage, planText } from '../src/index.js';

const settings = { rates: { standard: { 'jan-sep': 1, 'oct-dec': 2 }, oversize: { 'jan-sep': 0.5, 'oct-dec': 0.6 } }, aged_brackets: [{ from_days: 181, per_cuft: 0.5 }, { from_days: 271, per_cuft: 1.5 }] };
const fee = (over = {}) => ({ month: '2026-10', sku: 'A', size_tier: 'Standard', avg_qty: '10', unit_volume: '1', fee: '20', ...over });
const run = (fees, lots = [], s = settings, asOf = '2026-11-16') => auditStorage(fees, lots, s, { asOf });

test('the rate follows the size tier and the season', () => {
  assert.equal(run([fee()]).items[0].status, 'ok');
  assert.equal(run([fee({ month: '2026-09', fee: '10' })]).items[0].status, 'ok');
  assert.equal(run([fee({ size_tier: 'Large bulky', fee: '6' })]).items[0].status, 'ok');
  const over = run([fee({ fee: '25' })]); assert.equal(over.dispute, 1); assert.equal(over.over, 5);
});

test('a lot inside warn_days of the next bracket is flagged with its act-by date and the extra cost', () => {
  const r = run([fee()], [{ sku: 'A', received_date: '2026-05-25', qty: '4' }]);
  const lot = r.items.find((i) => i.kind === 'lot'); assert.equal(lot.status, 'act'); assert.equal(lot.act_by, '2026-11-22'); assert.equal(lot.findings[0].amount, 2);
});

test('a lot already in a bracket pays its rate; past the last bracket nothing more is coming', () => {
  const r = run([fee()], [{ sku: 'A', received_date: '2025-01-01', qty: '2' }]);
  const lot = r.items.find((i) => i.kind === 'lot'); assert.equal(lot.status, 'review'); assert.equal(lot.monthly, 3); assert.deepEqual(lot.findings.map((f) => f.code), ['aged_in_bracket']);
});

test('a lot with no known volume is still dated, without an amount', () => {
  const r = run([], [{ sku: 'Z', received_date: '2026-05-25', qty: '4' }]);
  assert.equal(r.items[0].status, 'act'); assert.equal(r.items[0].findings[0].amount, null);
});

test('storage plus surcharge per unit above the margin is listed per SKU', () => {
  const r = run([fee()], [{ sku: 'A', received_date: '2025-01-01', qty: '10' }], { ...settings, unit_margin: { A: 3 } });
  const s = r.items.find((i) => i.kind === 'sku'); assert.equal(s.findings[0].code, 'storage_exceeds_margin'); assert.equal(s.findings[0].amount, 5);
  assert.equal(run([fee()], [], { ...settings, unit_margin: { A: 3 } }).items.some((i) => i.kind === 'sku'), false);
});

test('the plan lists lots with a decision marker per lot', () => {
  const r = run([fee()], [{ sku: 'A', received_date: '2026-05-25', qty: '4' }, { sku: 'A', received_date: '2026-11-01', qty: '4' }]);
  const d = planText(r.items, {}); assert.equal(d.lots.length, 1); assert.match(d.text, /\[CHECK sell \/ move \/ remove\]/);
});
