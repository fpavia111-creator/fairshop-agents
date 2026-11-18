// Settlement journals: mapping, balance, refunds, suspense and deposits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJournals, entryText } from '../src/index.js';

const map = { clearing_account: 'Clearing', suspense_account: 'Suspense', accounts: { Principal: 'Sales', 'Refund/Principal': 'Returns', Commission: 'Fees' } };
const l = (description, amount, over = {}) => ({ settlement_id: 'S1', posted_date: '2026-11-01', type: 'Order', description, amount, ...over });
const acc = (i, a) => i.journal.find((x) => x.account === a);

test('every settlement balances: income credited, costs debited, the net to the clearing account', () => {
  const r = buildJournals([l('Principal', '100'), l('Commission', '-15')], map);
  const i = r.items[0]; assert.equal(i.balanced, true); assert.equal(acc(i, 'Sales').credit, 100); assert.equal(acc(i, 'Fees').debit, 15); assert.equal(acc(i, 'Clearing').debit, 85);
});

test('a "Type/Description" mapping wins over the description alone', () => {
  const i = buildJournals([l('Principal', '100'), l('Principal', '-20', { type: 'Refund' })], map).items[0];
  assert.equal(acc(i, 'Returns').debit, 20); assert.equal(acc(i, 'Sales').credit, 100);
});

test('an unmapped description goes to suspense and is listed; lines that net to zero are left out', () => {
  const i = buildJournals([l('Principal', '10'), l('Mystery', '-2'), l('Commission', '1'), l('Commission', '-1')], map).items[0];
  assert.equal(i.status, 'review'); assert.equal(acc(i, 'Suspense').debit, 2); assert.equal(acc(i, 'Fees'), undefined);
});

test('a deposit is found by reference or by amount after the last line; otherwise it is chased after deposit_days', () => {
  const rows = [l('Principal', '50')];
  assert.equal(buildJournals(rows, map, [{ date: '2026-11-03', amount: '50', reference: 'S1 payout' }]).items[0].deposit_date, '2026-11-03');
  assert.equal(buildJournals(rows, map, [{ date: '2026-11-04', amount: '50' }]).items[0].status, 'ready');
  const late = buildJournals(rows, map, [{ date: '2026-12-30', amount: '50' }], { asOf: '2026-11-30' }).items[0];
  assert.equal(late.status, 'chase'); assert.equal(late.findings[0].code, 'deposit_not_found');
  assert.equal(buildJournals(rows, map, [{ date: '2026-11-03', amount: '49', reference: 'S1' }]).items[0].findings[0].amount, 1);
});

test('the entry text shows totals and a check marker', () => {
  const i = buildJournals([l('Principal', '100'), l('Commission', '-15')], map).items[0];
  const t = entryText(i, {}); assert.match(t, /\| \*\*Total\*\* \| \*\*100\*\* \| \*\*100\*\* \|/); assert.match(t, /\[CHECK account numbers/);
});
