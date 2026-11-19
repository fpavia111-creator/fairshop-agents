import { createHash } from 'node:crypto';
import { mkdtempSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentRuntime } from './runtime.js';

// The demo runs on fictional fixtures only, so it uses a fixed masking key: the pseudonyms it prints
// (CUS-…, AFF-…) are the same on every run and in the README. Real runs use the key kept in .fairshop/.
const DEMO_PII_KEY = createHash('sha256').update('fairshop demo: fictional data only').digest();

/** Copy bundled fixtures into a temp folder and return a runtime rooted there. */
export function demoRuntime(manifest, fixturesDir, options = {}) {
  const root = mkdtempSync(join(tmpdir(), `${manifest.name}-demo-`));
  cpSync(fixturesDir, root, { recursive: true });
  return new AgentRuntime(manifest, { root, piiKey: DEMO_PII_KEY, ...options });
}

export function printStep(label, r) {
  const head = `\n▶ ${label}\n  status: ${r.status}  decision: ${r.decision}${r.approved_by ? `  approved by: ${r.approved_by}` : ''}${r.auto ? '  (auto)' : ''}`;
  process.stdout.write(head + '\n');
  if (r.reason && r.status !== 'executed') process.stdout.write(`  reason: ${r.reason}\n`);
  if (r.result && r.result.summary) process.stdout.write(`  ${r.result.summary}\n`);
}
