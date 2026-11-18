// Gift cards: balances from activity, mismatches, overdrawn, manual issues, early use, dormancy and age.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giftLiability, entryText } from '../src/index.js';

const card = (over = {}) => ({ card_id: 'G1', issued_date: '2026-10-01', issued_amount: '50', source: 'sale', order_id: '1', balance: '', ...over });
const act = (amount, over = {}) => ({ card_id: 'G1', date: '2026-10-05', type: 'redeem', amount, ...over });
const run = (cards, acts, s = {}, asOf = '2026-11-16') => giftLiability(cards, acts, s, { asOf });

test('the balance is rebuilt from issue, loads, adjustments and redemptions', () => {
  const r = run([card()], [act('-10'), act('5', { type: 'adjust' }), act('20', { type: 'issue' })]);
  assert.equal(r.items[0].balance, 65); assert.equal(r.liability, 65); assert.equal(r.items[0].status, 'ok');
});

test('a reported balance that differs, and a card spent past its value, are reviewed', () => {
  assert.equal(run([card({ balance: '45' })], [act('-10')]).items[0].findings[0].amount, 5);
  const o = run([card()], [act('-60')]).items[0]; assert.equal(o.findings[0].code, 'overdrawn'); assert.equal(o.liability, 0);
});

test('a manual issue above the threshold with no order is reviewed; under it is not', () => {
  assert.equal(run([card({ source: 'Manual', order_id: '', issued_amount: '150' })], []).review, 1);
  assert.equal(run([card({ source: 'Manual', order_id: '', issued_amount: '50' })], []).review, 0);
});

test('use before the issue date is reviewed; long-idle cards with a balance are dormant', () => {
  assert.equal(run([card()], [act('-5', { date: '2026-09-01' })]).items[0].findings[0].code, 'redeemed_before_issue');
  assert.equal(run([card({ issued_date: '2025-01-01' })], []).items[0].status, 'dormant');
  assert.equal(run([card({ issued_date: '2025-01-01' })], [act('-50', { date: '2025-02-01' })]).items[0].status, 'ok');
});

test('promotional cards stay out of the liability unless the setting says so', () => {
  assert.equal(run([card({ source: 'promo' })], []).liability, 0);
  assert.equal(run([card({ source: 'promo' })], [], { promo_is_liability: true }).liability, 50);
});

test('the entry books the difference to the ledger in the right direction', () => {
  const r = run([card()], []);
  assert.equal(entryText(r, { gl_balance: '30' }).diff, 20); assert.equal(entryText(r, { gl_balance: '70' }).diff, -20);
  assert.match(entryText(r, {}).text, /\[TO CONFIRM gift card liability balance in your ledger\]/);
});
