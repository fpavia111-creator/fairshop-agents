#!/usr/bin/env node
// Family rules for Fairshop. Exit 1 when any rule fails.
//  - every package in scripts/agents.json exists, and nothing else does; 30 or more agents
//  - names are fairshop-<what it does>; tool prefixes are distinct; bin = package name
//  - README, CHANGELOG with the version, LICENSE (MIT) in every package; package depends on fairshop-core
//  - 15+ eval cases per agent; 20+ tests per agent (counted from the last npm test log when present)
//  - every one-click tool waits for a click; the last policy rule blocks everything else
//  - masking: agents that read customer or staff fields list canaries in fixtures/canaries.json
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(ROOT, 'packages');
const { ONE_CLICK_CATEGORIES, piiKindOf } = await import(pathToFileURL(join(PK, 'fairshop-core', 'src', 'index.js')).href);
const reg = JSON.parse(readFileSync(join(ROOT, 'scripts', 'agents.json'), 'utf8'));
const listed = reg.groups.flatMap(([, list]) => list.map(([n]) => n));
const onDisk = readdirSync(PK).filter((n) => /^fairshop-(?!core$)/.test(n));
const problems = []; const prefixes = new Map(); const toolNames = new Set();
for (const n of listed) if (!onDisk.includes(n)) problems.push(`${n}: listed in agents.json but not in packages/`);
for (const n of onDisk) if (!listed.includes(n)) problems.push(`${n}: in packages/ but not in agents.json`);
if (onDisk.length < 30) problems.push(`only ${onDisk.length} agents`);
// Test counts per package from the last full test log, when there is one.
const log = existsSync(join(ROOT, 'scratch', 'logs', 'npm-test.log')) ? readFileSync(join(ROOT, 'scratch', 'logs', 'npm-test.log'), 'utf8') : '';
const testsBy = new Map(); { let cur = null; for (const l of log.split('\n')) { const m = /^> (fairshop-[a-z0-9-]+)@/.exec(l); if (m) cur = m[1]; const t = /^ℹ tests (\d+)/.exec(l); if (t && cur) testsBy.set(cur, Number(t[1])); } }
let evalTotal = 0, piiAgents = 0;
for (const n of onDisk.sort()) {
  const dir = join(PK, n); const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  if (!/^fairshop-[a-z0-9]+(-[a-z0-9]+){0,3}$/.test(n)) problems.push(`${n}: name is not fairshop-<1 to 4 words>`);
  if (!pkg.bin || !pkg.bin[n]) problems.push(`${n}: bin is not the package name`);
  if (pkg.license !== 'MIT') problems.push(`${n}: licence ${pkg.license}`);
  if (!(pkg.dependencies || {})['fairshop-core']) problems.push(`${n}: does not depend on fairshop-core`);
  for (const f of ['README.md', 'CHANGELOG.md', 'LICENSE']) if (!existsSync(join(dir, f))) problems.push(`${n}: no ${f}`);
  if (existsSync(join(dir, 'CHANGELOG.md')) && !readFileSync(join(dir, 'CHANGELOG.md'), 'utf8').includes(`## ${pkg.version}`)) problems.push(`${n}: CHANGELOG has no ${pkg.version} section`);
  const { manifest } = await import(pathToFileURL(join(dir, 'src', 'index.js')).href);
  const prefix = manifest.tools[0].name.split('_')[0];
  if (prefixes.has(prefix)) problems.push(`${n}: tool prefix "${prefix}" also used by ${prefixes.get(prefix)}`); prefixes.set(prefix, n);
  for (const t of manifest.tools) toolNames.add(t.name);
  for (const t of manifest.tools) if (ONE_CLICK_CATEGORIES.includes(t.category)) { const r = manifest.policy.rules.find((x) => x.tool === t.name); if (!r || r.decision === 'allow') problems.push(`${n}: ${t.name} (${t.category}) does not wait for a click`); }
  const last = manifest.policy.rules.at(-1); if (last.tool !== '*' || last.decision !== 'block') problems.push(`${n}: the last policy rule does not block everything else`);
  const cases = JSON.parse(readFileSync(join(dir, 'evals', 'cases.json'), 'utf8')).cases; evalTotal += cases.length;
  if (cases.length < 15) problems.push(`${n}: ${cases.length} eval cases (15 needed)`);
  if (testsBy.has(n) && testsBy.get(n) < 20) problems.push(`${n}: ${testsBy.get(n)} tests (20 needed)`);
  const personal = Object.values(manifest.sources || {}).some((s) => Object.entries(s.fields || {}).some(([f, fd]) => fd.pii || piiKindOf(f)));
  if (personal) { piiAgents++; if (!existsSync(join(dir, 'fixtures', 'canaries.json'))) problems.push(`${n}: reads customer or staff fields but lists no canaries`); }
  for (const f of ['src/demo.js', 'fixtures/README.md', 'fixtures/intl/README.md']) if (!existsSync(join(dir, f))) problems.push(`${n}: no ${f}`);
}
console.log(`${onDisk.length} agents, ${prefixes.size} prefixes, ${toolNames.size} distinct tool names, ${evalTotal} eval cases, ${piiAgents} agents with customer or staff fields (all masked, canaries listed)${testsBy.size ? `, tests per agent ${Math.min(...testsBy.values())} to ${Math.max(...[...testsBy.entries()].filter(([k]) => k !== 'fairshop-core').map(([, v]) => v))}` : ''}.`);
if (problems.length) { console.log(problems.map((p) => `  FAIL ${p}`).join('\n')); process.exit(1); }
console.log('All family rules pass.');
