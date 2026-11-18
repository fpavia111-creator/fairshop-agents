// Reserves: release matching, overdue, terms, upcoming and dispute holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditReserves, lineKind, inquiryText } from '../src/index.js';

const terms = { processors: { stripe: { percent: 10, days: 30 } } };
const l = (date, type, amount, reference = '', over = {}) => ({ date, processor: 'Stripe', type, amount, reference, ...over });
const run = (rows, tm = terms, asOf = '2026-11-16') => auditReserves(rows, tm, { asOf });

test('line types are read from processor wording', () => {
  assert.equal(lineKind('Reserve hold'), 'hold'); assert.equal(lineKind('reserve_release'), 'release'); assert.equal(lineKind('Reserved funds'), 'hold');
  assert.equal(lineKind('Chargeback'), 'dispute_hold'); assert.equal(lineKind('Dispute won'), 'dispute_release'); assert.equal(lineKind('charge'), 'charge'); assert.equal(lineKind('payout'), 'other');
});

test('a hold is released by its reference, or by a later unreferenced release', () => {
  const byRef = run([l('2026-09-01', 'reserve hold', '-50', 'r1'), l('2026-10-01', 'reserve release', '50', 'r1')]);
  assert.equal(byRef.items[0].status, 'ok');
  const loose = run([l('2026-09-01', 'reserve hold', '-50'), l('2026-10-01', 'reserve release', '30')]);
  assert.equal(loose.items[0].held, 20); assert.equal(loose.items[0].status, 'chase');
});

test('overdue counts from the release date in the file, or from the terms, after the grace days', () => {
  assert.equal(run([l('2026-10-01', 'reserve hold', '-50', 'r1', { release_date: '2026-11-14' })]).items[0].status, 'upcoming');
  assert.equal(run([l('2026-10-01', 'reserve hold', '-50', 'r1', { release_date: '2026-11-10' })]).items[0].status, 'chase');
  assert.equal(run([l('2026-10-01', 'reserve hold', '-50', 'r1')]).items[0].expected_release, '2026-10-31');
});

test('a hold above the terms percent of the same day charges is reviewed', () => {
  const r = run([l('2026-11-10', 'charge', '100', 'c1'), l('2026-11-10', 'reserve hold', '-15', 'r1')]);
  assert.equal(r.items[0].status, 'review'); assert.equal(r.items[0].findings[0].amount, 5);
});

test('a dispute hold open past dispute_days is listed with no amount claimed', () => {
  const r = run([l('2026-06-01', 'Chargeback', '-40', 'd1')]);
  assert.equal(r.items[0].findings[0].code, 'dispute_open_long'); assert.equal(r.items[0].findings[0].amount, null);
  assert.equal(run([l('2026-06-01', 'Chargeback', '-40', 'd1'), l('2026-07-01', 'Dispute won', '40', 'd1')]).items[0].status, 'ok');
});

test('the inquiry lists overdue holds and leaves the account to confirm', () => {
  const r = run([l('2026-09-01', 'reserve hold', '-50', 'r1'), l('2026-11-10', 'reserve hold', '-5', 'r2')]);
  const d = inquiryText(r.items, { processor: 'Stripe' }); assert.deepEqual(d.holds, ['r1']); assert.equal(d.total, 50); assert.match(d.text, /\[TO CONFIRM account id\]/);
});
