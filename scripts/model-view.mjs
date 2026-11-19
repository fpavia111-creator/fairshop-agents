#!/usr/bin/env node
// What reaches the AI model when an assistant calls each agent's main check: which input columns
// are masked, and which columns' values appear in the result in clear. Measured by running the check
// on the fictional fixtures with masking on (the default) and looking for every fixture value in the
// JSON the model receives. Report and draft files on disk are not counted: they stay on the machine.
//
//   node scripts/model-view.mjs            print the table and write docs/model-view-2026-11-19.json and .md
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, parseCsv } from '../packages/fairshop-core/src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const DATE = '2026-11-19';
// Free-text columns: a person or a marketplace could type anything here, including a shopper's name.
const FREE_TEXT = /^(reason|note|notes|description|title|campaign|failure_reason|cancel_reason|condition|memo|comment|reference|seller|affiliate|vendor)$/;
const out = []; let leaks = 0;
for (const n of readdirSync(PK).filter((x) => /^fairshop-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const { DEMO } = await import(pathToFileURL(join(PK, n, 'src', 'demo.js')).href);
  const tool = manifest.tools.find((t) => t.kind === 'read').name;
  const root = mkdtempSync(join(tmpdir(), 'mv-')); cpSync(join(PK, n, 'fixtures'), root, { recursive: true });
  const r = await new AgentRuntime(manifest, { root, audit: false, memory: false }).call(tool, DEMO.args);
  rmSync(root, { recursive: true, force: true });
  const json = JSON.stringify(r);
  // Columns each source marks as personal data, by their own names and the export names that map onto them.
  const masked = new Map(); const known = new Map();
  for (const s of Object.values(manifest.sources || {})) for (const [f, fd] of Object.entries(s.fields || {})) {
    for (const name of [f, ...((fd && fd.from) || [])]) known.set(String(name).toLowerCase(), { field: f, fd: fd || {} });
    if (fd && fd.pii) masked.set(f, fd.pii);
  }
  const clear = new Set(), clearFree = new Set(), leaked = [];
  for (const file of Object.values(DEMO.args).filter((x) => typeof x === 'string' && /\.csv$/i.test(x))) {
    for (const row of parseCsv(readFileSync(join(PK, n, 'fixtures', file), 'utf8'))) for (const [h, v] of Object.entries(row)) {
      const s = String(v ?? '').trim(); const k = known.get(h.toLowerCase());
      if (s.length < 3 || /^-?[\d.,]+$/.test(s) || /^\d{4}-\d\d-\d\d/.test(s)) continue;
      const seen = json.includes(JSON.stringify(s).slice(1, -1));
      if (k && k.fd.pii) { if (seen) leaked.push(`${h}: ${s}`); continue; }
      if (seen) { clear.add(h); if (FREE_TEXT.test(h)) clearFree.add(h); }
    }
  }
  // Canaries: personal values planted in the fixtures that must never reach a result.
  const canFile = join(PK, n, 'fixtures', 'canaries.json');
  const canaries = existsSync(canFile) ? JSON.parse(readFileSync(canFile, 'utf8')) : null;
  const canList = canaries ? (Array.isArray(canaries) ? canaries : Object.values(canaries).flat()).filter((x) => typeof x === 'string') : [];
  for (const c of canList) if (json.includes(c)) leaked.push(`canary: ${c}`);
  leaks += leaked.length;
  out.push({ agent: n, check: tool, masked: [...masked.entries()].map(([f, k]) => `${f} (${k})`).sort(), canaries: canList.length, leaked, text_in_clear: [...clear].sort(), free_text_in_clear: [...clearFree].sort(), plus: 'amounts, quantities, dates, rates, SKUs, order and listing numbers, and finding codes in clear' });
}
for (const o of out) console.log(`${o.agent}\n  masked: ${o.masked.join(', ') || '-'}${o.canaries ? ` (${o.canaries} canaries, ${o.leaked.length} leaked)` : ''}\n  text in clear: ${o.text_in_clear.join(', ') || '-'}${o.leaked.length ? `\n  LEAKED: ${o.leaked.join('; ')}` : ''}`);
mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', `model-view-${DATE}.json`), JSON.stringify(out, null, 2) + '\n');
const withPii = out.filter((o) => o.masked.length);
const L = [`# What reaches the AI model (${DATE})`, '',
  'Made by `node scripts/model-view.mjs`: each agent\'s main check is run on its fictional fixtures with masking on (the default), and every fixture value is looked for in the JSON result the assistant\'s model receives. Masked columns are replaced before the result leaves the tool: shopper e-mails and names by stable pseudonyms such as `CUS-3f9a2c1b` (the same shopper always gets the same one, so the model can still see that two returns came from one person), staff names by `STAFF-…`, street addresses by `[ADDRESS]`, phone numbers by `[PHONE]`, and card numbers that pass the Luhn check by `[CARD]`. The report and draft files written on your machine keep the real values.', '',
  'Everything else in the result is sent in clear: amounts, quantities, dates, rates, SKUs, order, listing and tracking numbers, finding codes, and the text columns listed below. Free-text columns (return reasons, cancel reasons, product titles and descriptions, campaign names, seller and affiliate names) are sent as they were typed: if someone writes a shopper\'s name into a return reason, the model sees it.', '',
  'Results go to whatever model the user\'s assistant uses. For shopper or staff data, use a model covered by your own agreements, or a local model. No compliance claim is made.', '',
  `**${withPii.length} of ${out.length} agents read personal data; ${out.reduce((t, o) => t + o.canaries, 0)} planted canary values and every masked column checked: ${leaks} leak(s).**`, '',
  '| Agent | Masked columns | Text sent in clear | Free text among them |', '|---|---|---|---|',
  ...out.map((o) => `| ${o.agent} | ${o.masked.join(', ') || '-'} | ${o.text_in_clear.join(', ') || '-'} | ${o.free_text_in_clear.join(', ') || '-'} |`), ''];
writeFileSync(join(ROOT, 'docs', `model-view-${DATE}.md`), L.join('\n'));
console.log(`\n${withPii.length} agents read personal data; ${leaks} leak(s). Wrote docs/model-view-${DATE}.json and .md`);
process.exit(leaks ? 1 : 0);
