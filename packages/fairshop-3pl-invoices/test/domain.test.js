// 3PL invoices: pick pricing, duplicates, unshipped orders, receiving, storage and unknown charges.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditInvoice, chargeKey } from '../src/index.js';

const card = { rates: { pick_first: 2, pick_additional: 0.5, receiving_per_unit: 0.2, storage_per_pallet: 10 } };
const l = (charge_type, reference, amount, qty = '1', rate = '') => ({ invoice_number: 'I', charge_type, reference, qty, rate, amount: String(amount) });

test('charge wording maps to rate keys, and aliases win', () => {
  assert.equal(chargeKey('Pick & Pack'), 'pick'); assert.equal(chargeKey('Inbound receiving'), 'receiving'); assert.equal(chargeKey('Pallet storage'), 'storage');
  assert.equal(chargeKey('Fee X', { 'fee x': 'kitting' }), 'kitting');
});

test('a pick is priced from the shipped units; above that is disputed', () => {
  assert.equal(auditInvoice([l('Pick', '1', 3)], card, { shipped: [{ order_id: '1', units: '3' }] }).items[0].status, 'ok');
  assert.equal(auditInvoice([l('Pick', '1', 4)], card, { shipped: [{ order_id: '1', units: '3' }] }).items[0].over, 1);
});

test('the second pick of one order and a pick for an unshipped order are disputed in full', () => {
  const r = auditInvoice([l('Pick', '1', 2), l('Pick', '1', 2), l('Pick', '9', 2)], card, { shipped: [{ order_id: '1', units: '1' }] });
  assert.deepEqual(r.items.map((i) => i.findings.map((f) => f.code)[0] || 'ok').sort(), ['duplicate_order_charge', 'ok', 'order_not_shipped']); assert.equal(r.to_dispute, 4);
});

test('receiving and storage are checked against your own counts', () => {
  const r = auditInvoice([l('Receiving', 'A1', 22, '110', '0.2'), l('Storage', '2026-10', 50, '5', '10')], card, { receipts: [{ reference: 'A1', units_received: '100' }], pallets: [{ period: '2026-10', pallets: '4' }] });
  assert.deepEqual(r.items.map((i) => i.over).sort((a, b) => a - b), [2, 10]);
});

test('a charge not on the card is a question, not a dispute', () => {
  const r = auditInvoice([l('Special project', '', 75)], card); assert.equal(r.items[0].status, 'review'); assert.equal(r.to_dispute, 0);
});
