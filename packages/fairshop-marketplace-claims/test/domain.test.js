// Claims: deadlines, delivery evidence, signatures, reasons and the response text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewClaims, reasonClass, responseText } from '../src/index.js';

const c = (over = {}) => ({ claim_id: 'C1', channel: 'Amazon', order_id: 'O1', opened_at: '2026-11-10', reason: 'Item not received', amount: '50', status: 'open', ...over });
const s = (over = {}) => ({ order_id: 'O1', carrier: 'UPS', tracking: '1Z1', ship_date: '2026-11-01', delivered_date: '2026-11-05', signature: 'no', ...over });
const run = (claims, ships, settings = {}, asOf = '2026-11-11') => reviewClaims(claims, ships, settings, { asOf });

test('reasons are classed from marketplace wording', () => {
  assert.equal(reasonClass('INR - Item not received'), 'not_received'); assert.equal(reasonClass('Never arrived'), 'not_received');
  assert.equal(reasonClass('Item damaged'), 'not_as_described'); assert.equal(reasonClass('Changed mind'), 'other');
});

test('respond-by comes from the export, else from respond_days; past it the claim is overdue', () => {
  assert.equal(run([c({ respond_by: '2026-11-20' })], [s()]).items[0].respond_by, '2026-11-20');
  assert.equal(run([c()], [s()], { respond_days: { amazon: 2 } }).items[0].respond_by, '2026-11-12');
  const late = run([c()], [s()], {}, '2026-11-20').items[0]; assert.equal(late.status, 'overdue'); assert.ok(late.findings.some((f) => f.code === 'late_response'));
});

test('delivery before the claim defends it; delivery after it, or none, does not', () => {
  assert.equal(run([c()], [s()]).items[0].advice, 'defend');
  assert.equal(run([c()], [s({ delivered_date: '2026-11-12' })]).items[0].advice, 'refund_likely');
  assert.equal(run([c()], [s({ tracking: '' })]).items[0].findings[0].code, 'no_tracking');
  assert.equal(run([c()], []).items[0].advice, 'refund_likely');
});

test('the signature rule applies only from its amount', () => {
  assert.equal(run([c({ amount: '900' })], [s()], { signature_over: 750 }).items[0].advice, 'weak');
  assert.equal(run([c({ amount: '900' })], [s({ signature: 'yes' })], { signature_over: 750 }).items[0].advice, 'defend');
  assert.equal(run([c({ amount: '100' })], [s()], { signature_over: 750 }).items[0].advice, 'defend');
});

test('not-as-described claims ask for photos and messages; closed claims carry no findings', () => {
  const r = run([c({ reason: 'Not as described' }), c({ claim_id: 'C2', status: 'Closed - won' })], [s()]);
  const a = r.items.find((i) => i.id === 'C1'); assert.equal(a.advice, 'gather_evidence'); assert.deepEqual(a.still_needed, ['listing photos', 'messages', 'photos of the item sent']);
  assert.equal(r.items.find((i) => i.id === 'C2').findings.length, 0); assert.equal(r.at_stake, 50);
});

test('the response states the delivery facts or asks for attachments', () => {
  const r = run([c(), c({ claim_id: 'C2', reason: 'Item damaged' })], [s()]);
  assert.match(responseText(r.items.find((i) => i.id === 'C1'), {}), /delivered on 2026-11-05 before the claim/);
  assert.match(responseText(r.items.find((i) => i.id === 'C2'), {}), /\[ATTACH photos of the item sent\]/);
});
