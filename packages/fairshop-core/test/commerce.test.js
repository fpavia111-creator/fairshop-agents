// Commerce helpers and the shared agent builder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { channelKey, sameChannel, stateCode, stateName, skuKey, emailKey, addressKey, monthOf, pct, ageBucket, money, close, finding, byFinding, byStatus, sortBy, rollup, shopAgent, worklistRows, today, AgentRuntime, ONE_CLICK_CATEGORIES } from '../src/index.js';

test('channel names from exports fold to one key; processors and POS stay apart', () => {
  for (const v of ['Amazon.com', 'AMZN US', 'Amazon Seller Central', 'amazon_fba']) assert.equal(channelKey(v), 'amazon', v);
  assert.equal(channelKey('Shopify Online Store'), 'shopify'); assert.equal(channelKey('Shopify POS'), 'shopify_pos');
  assert.equal(channelKey('Walmart Marketplace'), 'walmart'); assert.equal(channelKey('eBay'), 'ebay'); assert.equal(channelKey('PayPal (Braintree)'), 'paypal');
  assert.equal(channelKey('Example Wholesale Portal'), 'example wholesale portal');
  assert.ok(sameChannel('Etsy', 'ETSY.com')); assert.ok(!sameChannel('', ''));
});

test('US states by code or name; anything else is empty', () => {
  assert.equal(stateCode('tx'), 'TX'); assert.equal(stateCode('Texas'), 'TX'); assert.equal(stateCode('New  York'), 'NY');
  assert.equal(stateCode('TX - Texas'), 'TX'); assert.equal(stateCode('District of Columbia'), 'DC');
  assert.equal(stateCode('Ontario'), ''); assert.equal(stateCode('ZZ'), ''); assert.equal(stateName('CA'), 'California');
});

test('SKU, e-mail and address keys', () => {
  assert.equal(skuKey(' ab-1  x '), 'AB-1 X');
  assert.equal(emailKey('Jo.Doe+spring@GoogleMail.com'), 'jodoe@gmail.com');
  assert.equal(emailKey('jo.doe+spring@example.test'), 'jo.doe@example.test');
  assert.equal(addressKey('12 Elm Street', '78701-1234'), addressKey('12 elm st', '78701'));
});

test('dates, percents, buckets and money', () => {
  assert.equal(monthOf('2026-11-03'), '2026-11'); assert.equal(monthOf(''), '');
  assert.equal(pct(1, 3), 33.3); assert.equal(pct(1, 0), null);
  assert.equal(ageBucket(0), '0-30'); assert.equal(ageBucket(31), '31-60'); assert.equal(ageBucket(400), '91+'); assert.equal(ageBucket(null), 'unknown');
  assert.equal(money('1.234,56'), 1234.56); assert.equal(money(''), 0); assert.ok(close(10, 10.009)); assert.ok(!close(10, 10.02));
});

test('findings roll up by code and status, and order never depends on input order', () => {
  const items = [{ id: 'b', status: 'ok', findings: [] }, { id: 'a', status: 'claim', findings: [finding('x', 2.005, 'd'), finding('y', null, 'e')] }, { id: 'c', status: 'claim', findings: [finding('x', 1, 'f')] }];
  assert.deepEqual(byFinding(items), { x: { count: 2, amount: 3.01 }, y: { count: 1, amount: 0 } });
  assert.deepEqual(byStatus(items, ['claim', 'review', 'ok']), { claim: 2, review: 0, ok: 1 });
  assert.deepEqual(sortBy(items).map((i) => i.id), ['a', 'b', 'c']);
  assert.deepEqual(sortBy([...items].reverse()).map((i) => i.id), ['a', 'b', 'c']);
  assert.deepEqual(rollup([{ k: 'A', v: 1 }, { k: 'B', v: 2 }, { k: 'A', v: 3 }, { k: '', v: 9 }], (r) => r.k, ['v']), [{ key: 'A', count: 2, v: 4 }, { key: 'B', count: 1, v: 2 }]);
  assert.equal(worklistRows(items, ['id'])[1].findings, 'x y');
  assert.equal(today('2026-11-16T10:00:00'), '2026-11-16'); assert.match(today(), /^\d{4}-\d{2}-\d{2}$/);
});

function demo() {
  return shopAgent({
    pkg: { name: 'demo-of-things', version: '0.0.1' }, prefix: 'demo', label: 'Demo of Things', description: 'A demo agent that checks rows.',
    files: { rows: { type: 'string', description: 'Rows file under --root' } }, required: ['rows'],
    sources: { rows: { label: 'Rows', args: ['rows'], fields: { id: { required: true }, amount: { type: 'money' } } } },
    run: (a, ctx) => { const items = ctx.records(a.rows).map((r) => ({ id: r.id, amount: Number(r.amount), status: Number(r.amount) > 5 ? 'review' : 'ok', findings: Number(r.amount) > 5 ? [finding('big', Number(r.amount), `Row ${r.id} is big.`)] : [] })); return { rows: items.length, by_finding: byFinding(items), items }; },
    line: (r) => `${r.rows} row(s).`,
    check: { title: 'Check rows', description: 'Check every row and flag the big ones.' },
    explain: { arg: 'id', argDescription: 'Row id', title: 'Explain one row', description: 'Show one row and why it was flagged.', text: (i) => `${i.id}: ${i.status}` },
    report: { base: 'demo', title: 'Payouts against orders', description: 'Write the demo worklist.', columns: ['id', 'status', 'amount', 'findings', 'reasons', 'decision'], rows: (r) => worklistRows(r.items, ['id']), sections: (r) => [{ title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }], limits: ['Demo only.'] },
    draft: { noun: 'note', verb: 'send', category: 'binding_send', description: 'Draft a note about the big rows.', build: (a, ctx, r) => ({ id: 'all', text: `# Note\n\n**To:** [TO CONFIRM recipient]\n\n${r.items.filter((i) => i.status === 'review').map((i) => `- ${i.id}`).join('\n')}` }) },
    refused: [{ name: 'store_refund', category: 'move_money', description: 'Demo never refunds.' }],
    prompt: { name: 'demo_walk', title: 'Walk through the demo', description: 'Walkthrough.', text: 'Use demo_audit on {{rows}}.' },
  });
}

test('shopAgent builds the standard tools with the right policy, and refuses the rest', async () => {
  const m = demo();
  assert.deepEqual(m.tools.map((t) => t.name), ['demo_audit', 'demo_explain', 'demo_write_report', 'demo_draft_note', 'demo_request_send', 'store_refund']);
  const rule = (n) => m.policy.rules.find((r) => r.tool === n).decision;
  assert.equal(rule('demo_audit'), 'allow'); assert.equal(rule('demo_draft_note'), 'ask'); assert.equal(rule('demo_request_send'), 'ask'); assert.equal(rule('store_refund'), 'block');
  assert.ok(ONE_CLICK_CATEGORIES.includes(m.tools.find((t) => t.name === 'demo_request_send').category));
  const root = mkdtempSync(join(tmpdir(), 'shop-agent-')); writeFileSync(join(root, 'r.csv'), 'id,amount\nA,3\nB,9\n');
  const rt = new AgentRuntime(m, { root, audit: false });
  const a = await rt.call('demo_audit', { rows: 'r.csv' }); assert.equal(a.result.summary, '2 row(s).'); assert.equal(a.result.by_finding.big.count, 1);
  const e = await rt.call('demo_explain', { rows: 'r.csv', id: 'b' }); assert.equal(e.result.summary, 'B: review');
  const miss = await rt.call('demo_explain', { rows: 'r.csv', id: 'Z' }); assert.equal(miss.status, 'error'); assert.match(miss.reason, /not found; pass one from demo_audit/);
  const w = await rt.call('demo_write_report', { rows: 'r.csv' }); assert.equal(w.status, 'executed', w.reason);
  assert.deepEqual(w.result.files, ['fairshop-out/demo/demo.csv', 'fairshop-out/demo/demo.html']);
  assert.match(readFileSync(join(root, w.result.files[1]), 'utf8'), /Payouts against orders/);
  const d = await rt.call('demo_draft_note', { rows: 'r.csv' }); assert.equal(d.status, 'needs_approval');
  assert.equal((await rt.call('store_refund', {})).status, 'blocked');
  assert.equal((await rt.call('anything_else', {})).status, 'blocked');
  assert.equal(m.prompts[0].arguments[0].name, 'rows');
});
