import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carrierKey, sameCarrier, findCarrier, carrierGrouper, canonicalCarrier, zoneOf, placeMatches, chargeCode, dimWeight, densityPcf, classForDensity, contractFor, laneFor, laneLinehaul, contractFuel, dieselFor, accessorialAllowed, daysBetween, hoursBetween, validate, FREIGHT_CONTRACT_SCHEMA } from '../src/index.js';

test('carrier keys drop the legal form and keep the business words', () => {
  assert.equal(carrierKey('XPO Logistics, Inc.'), 'xpo logistics');
  assert.equal(carrierKey('Old Dominion Freight Lines, Inc.'), carrierKey('Old Dominion Freight Line'));
  assert.equal(carrierKey('Maersk A/S'), 'maersk'); assert.equal(carrierKey('Skyline Logistics B.V.'), 'skyline logistics');
  assert.equal(carrierKey('Example Pte. Ltd.'), 'example'); assert.equal(carrierKey('Example K.K.'), 'example'); assert.equal(carrierKey('Transportes Ejemplo S.A. de C.V.'), 'transportes ejemplo');
  // A legal form is only a legal form at the end of the name.
  assert.equal(carrierKey('SL Green Freight'), 'sl green freight'); assert.equal(carrierKey('AS Trucking'), 'as trucking'); assert.equal(carrierKey('SE Freight Lines'), 'se freight line');
  assert.equal(carrierKey('テスト運輸株式会社'), carrierKey('(株)テスト運輸')); assert.equal(carrierKey('示例物流有限公司'), '示例物流'); assert.equal(carrierKey('예시물류 주식회사'), '예시물류');
  assert.equal(carrierKey('EXLT'), 'exlt'); assert.equal(carrierKey(''), '');
});

test('a shorter carrier name matches a longer one, but sister companies stay apart', () => {
  assert.ok(sameCarrier('Old Dominion Freight Line', 'old dominion'));
  assert.ok(sameCarrier('XPO', 'XPO Logistics, Inc.'));
  assert.ok(sameCarrier('Ridgeline Freight', 'Ridgeline Freight Lines'));
  assert.ok(!sameCarrier('FedEx Freight', 'FedEx Express'));
  assert.ok(!sameCarrier('Ridgeline Logistics', 'Ridgeline Trucking'));
  assert.ok(sameCarrier('ODFL', 'Old Dominion', { ODFL: 'Old Dominion' }));
  assert.ok(!sameCarrier('', ''));
});

test('findCarrier takes an exact name first and never guesses between two carriers', () => {
  const list = [{ carrier: 'FedEx Freight', scac: 'FXFE' }, { carrier: 'FedEx Express', aliases: ['FDX Express'] }, { carrier: 'Ridgeline Freight Lines' }];
  const names = (c) => [c.carrier, c.scac, ...(c.aliases || [])];
  assert.equal(findCarrier(list, 'FXFE', names).carrier, 'FedEx Freight');
  assert.equal(findCarrier(list, 'FDX Express', names).carrier, 'FedEx Express');
  assert.equal(findCarrier(list, 'FedEx', names), null);
  assert.equal(findCarrier(list, 'Ridgeline', names).carrier, 'Ridgeline Freight Lines');
  assert.equal(findCarrier(list, 'Unknown Lines', names), null);
});

test('contract lookup follows the same rule, across every term of the carrier', () => {
  const contract = { carriers: [{ carrier: 'FedEx Freight', scac: 'FXFE', effective: '2026-01-01', expires: '2026-12-31' }, { carrier: 'FedEx Freight', effective: '2027-01-01' }, { carrier: 'FedEx Express' }, { carrier: 'Ridgeline Freight Lines, Inc.' }] };
  assert.equal(contractFor(contract, 'FXFE', '2027-03-01').block.effective, '2027-01-01');
  assert.equal(contractFor(contract, 'FedEx', '2026-03-01').block, null);
  assert.equal(contractFor(contract, 'Ridgeline', '2026-03-01').block.carrier, 'Ridgeline Freight Lines, Inc.');
  assert.equal(canonicalCarrier(contract, 'ridgeline freight'), 'Ridgeline Freight Lines, Inc.');
  assert.equal(canonicalCarrier(contract, 'FedEx'), 'FedEx');
});

test('carrierGrouper joins a short name to the one longer name that fits', () => {
  const g = carrierGrouper(['Ridgeline', 'Ridgeline Freight Inc.', 'FedEx', 'FedEx Freight', 'FedEx Express', 'Estes', 'Estes Express', 'Estes Express Lines']);
  assert.equal(g('Ridgeline'), g('Ridgeline Freight Inc.'));
  assert.notEqual(g('FedEx Freight'), g('FedEx Express')); assert.notEqual(g('FedEx'), g('FedEx Freight'));
  assert.equal(g('Estes'), g('Estes Express Lines')); assert.equal(g('Estes Express'), g('Estes Express Lines'));
  assert.equal(g('Never Seen Trucking'), 'never seen trucking');
});

test('places and lanes', () => {
  assert.equal(zoneOf('60607-1234'), '606');
  assert.equal(zoneOf('M5V 2T6'), 'M5V');
  assert.ok(placeMatches('IL', { state: 'il' }));
  assert.ok(placeMatches('600-629', { postal: '60607' }));
  assert.ok(!placeMatches('600-629', { postal: '75201' }));
  assert.ok(placeMatches('Dallas, TX', { city: 'Dallas', state: 'TX' }));
  assert.ok(placeMatches('*', {}));
});

test('charge descriptions map to codes', () => {
  assert.equal(chargeCode('Lift Gate Delivery'), 'liftgate');
  assert.equal(chargeCode('FSC'), 'fuel');
  assert.equal(chargeCode('Residential Surcharge'), 'residential');
  assert.equal(chargeCode('Address Correction Ground'), 'address_correction');
  assert.equal(chargeCode('Something odd'), 'other');
  assert.equal(chargeCode('Blue sticker fee', { 'blue sticker': 'appointment' }), 'appointment');
});

test('weights and density', () => {
  assert.equal(dimWeight(12, 12, 12), 13);
  assert.equal(dimWeight(12, 12, 12, 166), 11);
  assert.equal(dimWeight(0, 1, 1), null);
  assert.equal(densityPcf(500, 48, 40, 48), 9.38);
  assert.equal(classForDensity(9.38), 100);
  assert.equal(classForDensity(0.5), 400);
  assert.equal(classForDensity(60), 50);
});

test('dates', () => {
  assert.equal(daysBetween('2026-01-01', '2026-02-01'), 31);
  assert.equal(hoursBetween('2026-01-01T08:00:00', '2026-01-01T10:30:00'), 2.5);
  assert.equal(daysBetween('', '2026-01-01'), null);
});

const contract = {
  fuel_index: [{ week_of: '2026-10-26', price: 3.6 }, { week_of: '2026-11-02', price: 3.82 }],
  carriers: [{ carrier: 'Example Linehaul', scac: 'EXLT', effective: '2026-01-01', expires: '2026-12-31', discount_pct: 0,
    lanes: [{ origin: 'IL', destination: 'TX', basis: 'per_cwt', rate: 28, minimum: 150 }, { origin: '606', destination: '752', basis: 'flat', rate: 360 }],
    fuel: { basis: 'pct_of_linehaul', table: [{ min: 3.5, max: 3.75, value: 15 }, { min: 3.75, max: 4, value: 16 }] },
    accessorials: { liftgate: { amount: 25 }, detention: { per_hour: 50, free_hours: 2, max: 400 }, residential: { not_allowed: true } } }],
};

test('contract schema accepts the sample contract', () => { assert.ok(validate(FREIGHT_CONTRACT_SCHEMA, contract).ok); });

test('rating against a contract', () => {
  const { block } = contractFor(contract, 'EXLT', '2026-11-01');
  assert.ok(block);
  assert.equal(contractFor(contract, 'EXLT', '2027-01-05').expired.scac, 'EXLT');
  const ship = { origin: { state: 'IL', postal: '60607' }, destination: { state: 'TX', postal: '75201' }, weight: 1200 };
  const lane = laneFor(block, ship);
  assert.equal(lane.basis, 'flat', 'the more specific ZIP3 lane wins');
  assert.equal(laneLinehaul(lane, ship, block), 360);
  const lane2 = laneFor(block, { ...ship, destination: { state: 'TX', postal: '78701' } });
  assert.equal(laneLinehaul(lane2, { weight: 500 }, block), 150, 'minimum applies');
  assert.equal(dieselFor(contract.fuel_index, '2026-11-01'), 3.6);
  assert.equal(contractFuel(block, 3.6, 360, null), 54);
  assert.equal(accessorialAllowed(block, 'liftgate').allowed, 25);
  assert.equal(accessorialAllowed(block, 'detention', { hours: 5 }).allowed, 150);
  assert.equal(accessorialAllowed(block, 'detention', { hours: 20 }).allowed, 400);
  assert.equal(accessorialAllowed(block, 'residential').allowed, 0);
  assert.equal(accessorialAllowed(block, 'hazmat').rule, null);
});

