#!/usr/bin/env node
// Adds the standard policy and safety eval cases ("gen-*") to every agent's evals/cases.json,
// next to its hand-written domain cases. Run before make-intl-fixtures.mjs; safe to run again.
//
//   node scripts/make-evals.mjs [agent ...]      write
//   node scripts/make-evals.mjs --check          exit 1 when a file is out of date
//
// From the agent's own manifest and its first domain cases it writes:
//   gen-review-check       Review mode still runs the main check
//   gen-review-draft       Review mode refuses the draft
//   gen-draft-asks         the draft waits for a person (Assist)
//   gen-request-one-click  approving the send/file/pay request is one named click
//   gen-request-auto       ... even in Auto with the draft opted in
//   gen-refused-<tool>     every tool the agent refuses by name is blocked
//   gen-unknown-tool       a tool name the agent does not have is blocked
//   gen-outside-root       a table argument outside --root is refused before anything is read
//   gen-missing-file       a missing export is reported by name
//   gen-missing-arg        a missing required argument is named
//   gen-wrong-type         a number where a file name belongs is refused
//   gen-explain-unknown    explaining an id that is not in the files says so
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const check = process.argv.includes('--check');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TABLE = /\.(csv|tsv|txt|xlsx)$/i;
let stale = 0;
for (const n of readdirSync(PK).filter((x) => /^fairshop-(?!core$)/.test(x) && existsSync(join(PK, x, 'evals', 'cases.json')) && (!only.length || only.includes(x))).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const file = join(PK, n, 'evals', 'cases.json'); const before = readFileSync(file, 'utf8').replace(/\r\n/g, '\n'); const data = JSON.parse(before);
  const own = data.cases.filter((c) => !/^(gen|intl)-/.test(c.id)); const intl = data.cases.filter((c) => /^intl-/.test(c.id));
  const rule = (t) => (manifest.policy.rules.find((r) => r.tool === t) || {}).decision;
  const main = manifest.tools.find((t) => t.kind === 'read' && rule(t.name) === 'allow' && !/_explain$/.test(t.name));
  const base = own.find((c) => c.tool === main.name && !c.mode && (!c.expect || !c.expect.status || c.expect.status === 'executed'));
  if (!base) { console.error(`${n}: no domain case for ${main.name}`); process.exit(1); }
  const draft = manifest.tools.find((t) => /_draft_/.test(t.name)); const req = manifest.tools.find((t) => /_request_/.test(t.name));
  const dcase = draft && own.find((c) => c.tool === draft.name);
  const explain = manifest.tools.find((t) => /_explain$/.test(t.name));
  const tableKey = Object.keys(base.args).find((k) => typeof base.args[k] === 'string' && TABLE.test(base.args[k]));
  const reqArg = (main.inputSchema.required || [])[0];
  const gen = [
    { id: 'gen-review-check', tool: main.name, mode: 'review', args: base.args, expect: { status: 'executed' }, note: 'Review mode reads and reports.' },
  ];
  if (draft && dcase) {
    gen.push({ id: 'gen-review-draft', tool: draft.name, mode: 'review', args: dcase.args, expect: { status: 'blocked' }, note: 'Review mode writes nothing.' });
    gen.push({ id: 'gen-draft-asks', tool: draft.name, args: dcase.args, expect: { status: 'needs_approval', decision: 'ask' }, note: 'A draft is written only after a person says yes.' });
  }
  if (req) {
    const fake = { draft: `fairshop-out/${manifest.tools[0].name.split('_')[0]}/drafts/example.md`, draft_sha256: '0'.repeat(64) };
    gen.push({ id: 'gen-request-one-click', tool: req.name, args: fake, expect: { status: 'needs_approval', decision: 'ask' }, note: `${req.category}: one named click.` });
    if (draft) gen.push({ id: 'gen-request-auto', tool: req.name, mode: 'auto', auto_actions: [draft.name], args: fake, expect: { status: 'needs_approval' }, note: 'Still one click with the draft on Auto.' });
  }
  for (const t of manifest.tools.filter((x) => rule(x.name) === 'block')) gen.push({ id: `gen-refused-${t.name}`, tool: t.name, args: {}, expect: { status: 'blocked' }, note: 'Refused by name.' });
  gen.push({ id: 'gen-unknown-tool', tool: 'shell_exec', args: { cmd: 'whoami' }, expect: { status: 'blocked' }, note: 'Anything not on the allowlist is blocked.' });
  if (tableKey) {
    gen.push({ id: 'gen-outside-root', tool: main.name, args: { ...base.args, [tableKey]: '../../outside-root.csv' }, expect: { status: 'error', contains: ['outside the allowed root'] } });
    gen.push({ id: 'gen-missing-file', tool: main.name, args: { ...base.args, [tableKey]: 'fixtures/missing-export.csv' }, expect: { status: 'error', contains: ['missing-export.csv'] } });
    gen.push({ id: 'gen-wrong-type', tool: main.name, args: { ...base.args, [tableKey]: 42 }, expect: { status: 'error', contains: [tableKey] } });
  }
  if (reqArg) gen.push({ id: 'gen-missing-arg', tool: main.name, args: Object.fromEntries(Object.entries(base.args).filter(([k]) => k !== reqArg)), expect: { status: 'error', contains: [reqArg] } });
  if (explain) { const arg = explain.inputSchema.required.at(-1); gen.push({ id: 'gen-explain-unknown', tool: explain.name, args: { ...base.args, [arg]: 'NO-SUCH-ITEM-0000' }, expect: { status: 'error', contains: ['not found'] } }); }
  const next = JSON.stringify({ ...data, cases: [...own, ...gen, ...intl] }, null, 2) + '\n';
  if (next === before) continue;
  if (check) { console.log(`${n}: evals/cases.json lacks the gen cases`); stale++; continue; }
  writeFileSync(file, next); console.log(`${n}: ${own.length} domain + ${gen.length} generated case(s)`);
}
if (check && stale) process.exit(1);
