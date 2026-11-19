// Customer-data masking: what the model sees, what stays on disk, and the modes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PiiMasker, piiKindOf, luhn, AgentRuntime, defineManifest, MODEL_PIN, loadPiiKey } from '../src/index.js';

const key = Buffer.alloc(32, 7);

test('field names decide the kind; generic names like "name" and "store" are left alone', () => {
  assert.equal(piiKindOf('Customer Email'), 'email');
  assert.equal(piiKindOf('buyer_name'), 'name');
  assert.equal(piiKindOf('ship_to_address'), 'address');
  assert.equal(piiKindOf('cashier'), 'staff');
  assert.equal(piiKindOf('name'), null);
  assert.equal(piiKindOf('store'), null);
  assert.equal(piiKindOf('zip'), null); assert.equal(piiKindOf('zip', 'strict'), 'zip');
  assert.equal(piiKindOf('order_id'), null); assert.equal(piiKindOf('order_id', 'strict'), 'order');
});

test('pseudonyms are stable per key, differ between keys, and are matched back with same()', () => {
  const a = new PiiMasker({ key }); const b = new PiiMasker({ key: Buffer.alloc(32, 9) });
  const t = a.maskValue('email', 'Ada.Lovelace@example.test');
  assert.match(t, /^CUS-[0-9a-f]{8}$/);
  assert.equal(new PiiMasker({ key }).maskValue('email', 'ada.lovelace@example.test'), t, 'case does not change the pseudonym');
  assert.notEqual(b.maskValue('email', 'ada.lovelace@example.test'), t);
  assert.ok(a.same('ada.lovelace@example.test', t, 'email'));
  assert.ok(a.same('ada.lovelace@example.test', 'ADA.LOVELACE@example.test', 'email'));
  assert.ok(!a.same('someone@example.test', t, 'email'));
  assert.equal(a.maskValue('name', 'Lovelace, Ada'), a.maskValue('name', 'Ada Lovelace'), 'name order does not matter');
});

test('a registered value is replaced inside free text, in both name orders, before the e-mail pattern runs', () => {
  const m = new PiiMasker({ key });
  m.registerRecords([{ customer_name: 'Ada Lovelace', customer_email: 'ada@example.test', note: 'x' }]);
  const out = m.maskText('Refund for Lovelace, Ada (ada@example.test) and bob@example.test');
  assert.doesNotMatch(out, /Ada|Lovelace|ada@/);
  assert.match(out, /CUS-[0-9a-f]{8} \(CUS-[0-9a-f]{8}\) and \[EMAIL\]/);
});

test('card numbers only when the Luhn check passes; order and tracking numbers survive', () => {
  assert.ok(luhn('4111 1111 1111 1111')); assert.ok(!luhn('4111 1111 1111 1112'));
  const m = new PiiMasker({ key });
  assert.equal(m.maskText('card 4111-1111-1111-1111'), 'card [CARD]');
  assert.equal(m.maskText('order 112-1234567-1234567, label 9400111899223344556677'), 'order 112-1234567-1234567, label 9400111899223344556677');
  assert.equal(m.maskText('call 555-010-0199'), 'call [PHONE]');
});

test('maskResult masks by key and in text, leaves counts and column maps alone, and reports what it did', () => {
  const m = new PiiMasker({ key });
  const r = m.maskResult({ items: [{ customer_email: 'ada@example.test', ship_to_address: '1 Example Way', detail: 'Ada wrote from ada@example.test', count: 3 }], by_customer: { customer_email: 2 }, sources: [{ mapped: { customer_email: 'Email' } }] });
  assert.match(r.items[0].customer_email, /^CUS-/); assert.equal(r.items[0].ship_to_address, '[ADDRESS]');
  assert.doesNotMatch(r.items[0].detail, /ada@/);
  assert.equal(r.by_customer.customer_email, 2);
  assert.deepEqual(r.sources[0].mapped, { customer_email: 'Email' });
  assert.deepEqual(m.report().kinds, ['address', 'email']);
});

test('strict mode also cuts ZIP codes and pseudonymises order numbers; off mode changes nothing', () => {
  const s = new PiiMasker({ key, mode: 'strict' });
  const r = s.maskResult({ zip: '78701', order_id: '#1001' });
  assert.equal(r.zip, '787XX'); assert.match(r.order_id, /^ORD-/);
  const off = new PiiMasker({ key, mode: 'off' });
  assert.deepEqual(off.maskResult({ customer_email: 'ada@example.test' }), { customer_email: 'ada@example.test' });
  assert.throws(() => new PiiMasker({ mode: 'loud' }), /pii mode/);
});

test('the key is created once in the state folder and reused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pii-key-'));
  const k1 = loadPiiKey(dir); const k2 = loadPiiKey(dir);
  assert.ok(existsSync(join(dir, 'pii.key'))); assert.deepEqual(k1, k2);
  writeFileSync(join(dir, 'pii.key'), 'nope'); assert.throws(() => loadPiiKey(dir), /not a 64-character hex key/);
});

function manifest() {
  return defineManifest({
    name: 'pii-demo', version: '0.0.1', description: 'demo', model: MODEL_PIN,
    sources: { orders: { label: 'Orders', args: ['orders'], fields: { order_id: { aliases: ['Order'] }, buyer: { aliases: ['Buyer'], pii: 'name' }, email: { aliases: ['Email'] }, total: { type: 'money' } } } },
    tools: [
      { name: 'demo_read', kind: 'read', description: 'Read orders and echo them.', inputSchema: { type: 'object', required: ['orders'], properties: { orders: { type: 'string', description: 'orders file' } } },
        handler: async (a, ctx) => { const rows = ctx.records(a.orders); ctx.writeFile(ctx.outDir('out'), 'rows.json', JSON.stringify(rows)); return { rows, line: `First buyer: ${rows[0].buyer}` }; } },
    ],
    policy: { rules: [{ tool: 'demo_read', decision: 'allow' }, { tool: '*', decision: 'block' }] },
  });
}

test('runtime: results are masked, files on disk keep the real values, and the result says what was masked', async () => {
  const root = mkdtempSync(join(tmpdir(), 'pii-rt-'));
  writeFileSync(join(root, 'o.csv'), 'Order,Buyer,Email,total\n#1001,Grace Hopper,grace@example.test,10\n');
  const r = await new AgentRuntime(manifest(), { root, audit: false }).call('demo_read', { orders: 'o.csv' });
  assert.equal(r.status, 'executed', r.reason);
  const text = JSON.stringify(r);
  assert.doesNotMatch(text, /Grace|Hopper|grace@/);
  assert.equal(r.result.rows[0].order_id, '#1001');
  assert.match(r.result.line, /^First buyer: CUS-[0-9a-f]{8}$/);
  assert.deepEqual(r.pii.kinds, ['email', 'name']);
  assert.match(readFileSync(join(root, 'out', 'rows.json'), 'utf8'), /Grace Hopper/);
  const off = await new AgentRuntime(manifest(), { root, audit: false, pii: 'off' }).call('demo_read', { orders: 'o.csv' });
  assert.match(JSON.stringify(off.result), /Grace Hopper/); assert.ok(off.warnings.some((w) => /masking is OFF/.test(w)));
  assert.throws(() => new AgentRuntime(manifest(), { root, pii: 'sometimes' }), /pii must be/);
});

test('affiliate and creator names are a kind of their own (AFF-…), also inside free text (final pass)', () => {
  assert.equal(piiKindOf('Affiliate'), 'partner'); assert.equal(piiKindOf('publisher_name'), 'partner');
  const m = new PiiMasker({ key });
  const t = m.maskValue('partner', 'Petra Lind Studio');
  assert.match(t, /^AFF-[0-9a-f]{8}$/);
  assert.notEqual(t, m.maskValue('name', 'Petra Lind Studio'));
});
