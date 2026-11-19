#!/usr/bin/env node
// Writes sample-reports/: the HTML (and CSV) report of chosen agents on their fictional fixtures,
// in English, plus an index page. Each report is made by the agent's own report tool through the runtime.
//   node scripts/sample-reports.mjs [agent ...]
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(ROOT, 'packages'); const OUT = join(ROOT, 'sample-reports');
const PICK = ['fairshop-payouts', 'fairshop-fba-reimbursements', 'fairshop-marketplace-claims', 'fairshop-sales-tax', 'fairshop-3pl-invoices', 'fairshop-shipping-costs', 'fairshop-carrier-adjustments', 'fairshop-store-shrink'];
const only = process.argv.slice(2); const agents = only.length ? only : PICK;
const { AgentRuntime, escapeHtml, htmlPage } = await import(pathToFileURL(join(PK, 'fairshop-core', 'src', 'index.js')).href);
mkdirSync(OUT, { recursive: true }); const done = [];
for (const n of agents) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const c = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases.find((x) => /_write_report$/.test(x.tool) && !x.mode);
  const root = mkdtempSync(join(tmpdir(), `sample-${n}-`)); cpSync(join(PK, n, 'fixtures'), join(root, 'fixtures'), { recursive: true });
  const r = await new AgentRuntime(manifest, { root, audit: false, lang: 'en' }).call(c.tool, c.args);
  if (r.status !== 'executed') { console.error(`${n}: ${r.reason}`); process.exit(1); }
  for (const f of r.result.files) { const src = join(root, f); const short = n.replace(/^fairshop-/, ''); const name = `${short}${f.endsWith('.ics') ? '.ics' : f.endsWith('.csv') ? '.csv' : '.html'}`; writeFileSync(join(OUT, name), readFileSync(src)); }
  done.push({ n, short: n.replace(/^fairshop-/, ''), summary: r.result.summary.replace(/^Report written: /, ''), title: (readFileSync(join(root, r.result.files.find((f) => f.endsWith('.html'))), 'utf8').match(/<h1>(.*?)<\/h1>/) || [])[1] || n });
  console.log(`${n}: ${r.result.files.map((f) => basename(f)).join(', ')}`);
}
const body = [`<h1>Fairshop sample reports</h1>`, `<p class="mut">Written by the agents themselves on the fictional files in each agent's <code>fixtures/</code> folder. Every name, store, shopper and number is made up. Each page has a CSV twin with a blank decision column for the person who works the list.</p>`, '<ul>', ...done.map((d) => `<li><a href="${escapeHtml(d.short)}.html">${d.title}</a> <span class="mut">(${escapeHtml(d.n)})</span><br><span class="mut">${escapeHtml(d.summary)}</span></li>`), '</ul>'].join('\n');
writeFileSync(join(OUT, 'index.html'), htmlPage({ title: 'Fairshop sample reports', bodyHtml: body, footer: 'Fictional data. Nothing was sent or paid.', lang: 'en' }));
console.log(`${done.length} sample report(s) in sample-reports/ (${readdirSync(OUT).length} files)`);
