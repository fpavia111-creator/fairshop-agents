#!/usr/bin/env node
// Runs every agent's private eval cases (fictional fixtures, no model calls) and prints one line per agent.
//   node scripts/run-all-evals.mjs [agent ...]       exit 1 when any case fails
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const only = process.argv.slice(2);
const { runEvalFile } = await import(pathToFileURL(join(PK, 'fairshop-core', 'src', 'index.js')).href);
let total = 0, passed = 0, bad = 0; const counts = [];
for (const n of readdirSync(PK).filter((x) => /^fairshop-(?!core$)/.test(x) && existsSync(join(PK, x, 'evals', 'cases.json')) && (!only.length || only.includes(x))).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const r = await runEvalFile(manifest, join(PK, n, 'evals', 'cases.json'));
  total += r.total; passed += r.passed; counts.push(r.total);
  if (r.passed !== r.total) bad++;
  console.log(`${n.padEnd(32)} ${r.passed}/${r.total}${r.passed !== r.total ? `  FAIL: ${r.results.filter((x) => !x.pass).map((x) => x.id).join(', ')}` : ''}`);
}
console.log(`\n${counts.length} agent(s), ${passed}/${total} eval cases pass (per agent ${Math.min(...counts)} to ${Math.max(...counts)}).`);
process.exit(bad ? 1 : 0);
