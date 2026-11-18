// Sales tax: rates, shipping, facilitators, registrations and exemptions, all from settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSalesTax, worksheetText } from '../src/index.js';

const s = { registered: { TX: { rate: 10, tax_shipping: false } }, marketplace_facilitator: { amazon: ['TX'] }, exemption_certificates: ['C1'] };
const o = (over = {}) => ({ order_id: '1', channel: 'Shopify', ship_state: 'TX', subtotal: '100', shipping: '10', tax_collected: '10', ...over });

test('tax follows the rate and the shipping rule in settings', () => {
  assert.equal(checkSalesTax([o()], s).items[0].status, 'ok');
  assert.equal(checkSalesTax([o()], { registered: { TX: { rate: 10, tax_shipping: true } } }).items[0].findings[0].amount, 1);
});

test('under-collection is short; over-collection is reviewed', () => {
  assert.equal(checkSalesTax([o({ tax_collected: '8' })], s).items[0].status, 'short');
  assert.equal(checkSalesTax([o({ tax_collected: '12' })], s).items[0].findings[0].code, 'over_collected');
});

test('marketplace orders follow the facilitator settings by channel and state', () => {
  assert.equal(checkSalesTax([o({ channel: 'Amazon.com' })], s).items[0].status, 'marketplace');
  assert.equal(checkSalesTax([o({ channel: 'Amazon', ship_state: 'NY', tax_collected: '0' })], s).items[0].status, 'outside');
});

test('tax collected where you are not registered is reviewed', () => {
  const r = checkSalesTax([o({ ship_state: 'New York', tax_collected: '7' })], s);
  assert.equal(r.items[0].state, 'NY'); assert.equal(r.items[0].findings[0].code, 'collected_not_registered');
});

test('an exempt order needs a certificate on file', () => {
  assert.equal(checkSalesTax([o({ tax_collected: '0', exempt: 'yes', exemption_id: 'c1' })], s).items[0].status, 'ok');
  assert.equal(checkSalesTax([o({ tax_collected: '0', exempt: 'yes', exemption_id: 'X9' })], s).items[0].findings[0].code, 'exempt_no_certificate');
});

test('the worksheet separates marketplace and direct sales and says it is not a return', () => {
  const r = checkSalesTax([o(), o({ order_id: '2', channel: 'Amazon' })], s);
  const w = worksheetText(r, 'TX', {}); assert.match(w, /Marketplace sales .* \| 100 \|/); assert.match(w, /not a return and not tax advice/);
});
