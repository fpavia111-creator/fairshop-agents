// Path limits: an over-long path is refused before the file system sees it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safePath, AgentRuntime, defineManifest, MODEL_PIN } from '../src/index.js';

test('an over-long path or name is refused with a short message (a Windows mkdir of one never returned)', () => {
  const root = mkdtempSync(join(tmpdir(), 'long-path-'));
  assert.throws(() => safePath(root, 'A'.repeat(200000)), /^Error: path is too long \(200000 characters/);
  assert.throws(() => safePath(root, `out/${'b'.repeat(300)}/x`), /path is too long/);
  assert.equal(safePath(root, 'out/report.csv'), join(root, 'out', 'report.csv'));
});

test('a tool given an over-long output folder returns an error instead of hanging', async () => {
  const root = mkdtempSync(join(tmpdir(), 'long-out-'));
  const m = defineManifest({ name: 'long-demo', version: '0.0.1', description: 'demo', model: MODEL_PIN,
    tools: [{ name: 'demo_write', kind: 'report', description: 'Write one file.', inputSchema: { type: 'object', properties: { out_dir: { type: 'string', description: 'folder' } } }, handler: async (a, ctx) => ({ file: ctx.writeFile(ctx.outDir(a.out_dir), 'x.txt', 'x') }) }],
    policy: { rules: [{ tool: 'demo_write', decision: 'allow' }, { tool: '*', decision: 'block' }] } });
  const r = await new AgentRuntime(m, { root, audit: false }).call('demo_write', { out_dir: 'A'.repeat(200000) });
  assert.equal(r.status, 'error'); assert.match(r.reason, /path is too long/); assert.ok(r.reason.length < 400);
});
