// The shape every Fairshop agent shares: one read tool that checks the files, one that
// explains a single item, one that writes the worklist (CSV for people to fill in, an
// HTML page to read, a calendar when there are deadlines), one draft → one-click pair,
// and the tools it refuses by name. Each agent supplies its own job: the files it reads,
// the pure check that runs over them, the wording, and what it drafts.
//
// This removes repetition only. Each agent still owns its manifest, its policy rules and
// its domain logic, and the manifest is validated by defineManifest like any other.
import { relative } from 'node:path';
import { defineManifest } from './manifest.js';
import { MODEL_PIN, writeWorklist, draftPair, refusedTools } from './kit.js';
import { toIcs } from './formats.js';

export const OUT_ROOT = 'fairshop-out';

/** The as_of argument every agent takes. */
export const AS_OF = Object.freeze({ type: 'string', format: 'date', description: 'Date to measure ages, windows and deadlines from, as YYYY-MM-DD (default today)' });

/** Today, or the as_of argument, as YYYY-MM-DD. */
export const today = (asOf) => (asOf && /^\d{4}-\d{2}-\d{2}/.test(String(asOf)) ? String(asOf).slice(0, 10) : new Date().toISOString().slice(0, 10));

const rel = (ctx, f) => relative(ctx.root, f).split('\\').join('/');

/**
 * Build a Fairshop agent manifest.
 *
 * spec: {
 *   pkg                 package.json object (name, version)
 *   prefix              tool prefix ("baltic")
 *   label               human name ("Baltic of Payouts")
 *   description         one paragraph for the manifest
 *   files               input arguments (JSON Schema properties); every one described
 *   required            required input arguments
 *   sources             source kinds (fields, profiles), as in any manifest
 *   configSchemas       settings file schemas
 *   run(a, ctx)         → result { items: [{ id, status, findings: [...] , ... }], ... }
 *   line(r)             → one-sentence summary
 *   check               { verb?, title, description } for the main read tool (<prefix>_<verb>, verb default "audit")
 *   explain             { arg, argDescription, title, description, text(item), match?(item, want, ctx), list?(r) }
 *   report              { base, title, description, columns, htmlColumns?, labels?, rows(r), sections?(r), limits, ics?(r) → { file, calName, events } }
 *   draft               { noun, verb, category, actor, title?, description, required?, args?, build(a, ctx, r) → { id, text, amount?, extra? } }
 *   refused             [{ name, category, description }]
 *   prompt              { name, title, description, text } (the host model's walkthrough)
 *   extraTools, extraRules, argDocs
 * }
 */
export function shopAgent(spec) {
  const { pkg, prefix } = spec;
  const out = `${OUT_ROOT}/${prefix}`;
  const files = spec.files;
  const required = spec.required || [];
  const run = (a, ctx) => spec.run(a, ctx);
  const line = spec.line;
  const tools = []; const rules = [];
  const checkName = `${prefix}_${(spec.check && spec.check.verb) || 'audit'}`;

  tools.push({
    name: checkName, kind: 'read', title: spec.check.title, description: spec.check.description,
    inputSchema: { type: 'object', additionalProperties: false, required, properties: files },
    handler: async (a, ctx) => { const r = run(a, ctx); return { summary: line(r), ...r }; },
  });
  rules.push({ tool: checkName, decision: 'allow' });

  if (spec.explain) {
    const e = spec.explain; const name = `${prefix}_explain`;
    tools.push({
      name, kind: 'read', title: e.title, description: e.description,
      inputSchema: { type: 'object', additionalProperties: false, required: [...required, e.arg], properties: { ...files, [e.arg]: { type: 'string', description: e.argDescription } } },
      handler: async (a, ctx) => {
        const r = run(a, ctx); const want = String(a[e.arg]).trim();
        const hits = (e.list ? e.list(r) : r.items).filter((i) => (e.match ? e.match(i, want, ctx) : String(i.id).toLowerCase() === want.toLowerCase()));
        if (!hits.length) throw new Error(`${e.arg} "${want.slice(0, 60)}" not found; pass one from ${checkName}`);
        return { summary: hits.map((i) => e.text(i)).join('\n'), items: hits };
      },
    });
    rules.push({ tool: name, decision: 'allow' });
  }

  if (spec.report) {
    const rp = spec.report; const name = `${prefix}_write_report`;
    tools.push({
      name, kind: 'report', title: rp.toolTitle || `Write the ${rp.base} worklist`, description: rp.description,
      inputSchema: { type: 'object', additionalProperties: false, required, properties: { ...files, out_dir: { type: 'string', description: `Folder under --root for the report files (default ${out})` } } },
      handler: async (a, ctx) => {
        const r = run(a, ctx); const rows = rp.rows(r); const dir = a.out_dir || out;
        const w = writeWorklist(ctx, dir, rp.base, { title: typeof rp.title === 'function' ? rp.title(r) : rp.title, intro: line(r), rows, columns: rp.columns, htmlColumns: rp.htmlColumns, labels: rp.labels || {}, sections: rp.sections ? rp.sections(r) : [], limits: rp.limits || [] });
        if (rp.ics) { const ev = rp.ics(r); if (ev && ev.events.length) w.files.push(ctx.writeFile(ctx.outDir(dir), ev.file, toIcs(ev.events, { calName: ev.calName }))); }
        return { summary: `Report written: ${line(r)}`, rows: rows.length, files: w.files.map((f) => rel(ctx, f)), output_sha256: w.output_sha256 };
      },
    });
    rules.push({ tool: name, decision: 'allow' });
  }

  if (spec.draft) {
    const d = spec.draft;
    const pair = draftPair({
      prefix, noun: d.noun, verb: d.verb, category: d.category || 'binding_send', outDir: out, actor: d.actor || 'a person on your team', title: d.title,
      description: d.description, requestDescription: d.requestDescription,
      required: [...required, ...(d.required || [])], args: { ...files, ...(d.args || {}) },
      build: (a, ctx) => d.build(a, ctx, run(a, ctx)),
    });
    tools.push(...pair.tools); rules.push(...pair.rules);
  }

  for (const t of spec.extraTools || []) tools.push(t);
  rules.push(...(spec.extraRules || []));
  const refused = refusedTools(spec.refused || []);
  tools.push(...refused.tools); rules.push(...refused.rules);

  const prompts = spec.prompt ? [{
    name: spec.prompt.name, title: spec.prompt.title, description: spec.prompt.description,
    arguments: required.map((k) => ({ name: k, description: files[k].description, required: true })),
    text: spec.prompt.text,
  }] : [];

  return defineManifest({
    name: pkg.name, version: pkg.version, description: spec.description,
    model: MODEL_PIN, caps: { maxSteps: 60, maxSpendUsd: 0 },
    configSchemas: spec.configSchemas || {}, sources: spec.sources || {}, argDocs: spec.argDocs || {},
    prompts, tools,
    policy: { rules: [...rules, { tool: '*', decision: 'block', reason: `Not on the ${spec.label || pkg.name} allowlist.` }] },
  });
}

/** Rows for a worklist from items: id columns first, then status, amount, finding codes, reasons and a blank decision. */
export function worklistRows(items, cols, amountKey = 'amount') {
  return items.map((i) => ({ ...Object.fromEntries(cols.map((c) => [c, i[c] ?? ''])), status: i.status, [amountKey]: i[amountKey] ?? '', findings: (i.findings || []).map((f) => f.code).join(' '), reasons: (i.findings || []).map((f) => f.detail).join(' '), decision: '' }));
}

/**
 * The demo every Fairshop agent runs (`<agent> demo`): the main check on the fictional
 * fixtures, the report, one draft on Auto, the one-click request (which stays a click),
 * and a refused tool. show(item) prints one line per item.
 */
export async function shopDemo(manifest, fixturesDir, { title, args, draftArgs = null, show = null, intro = '' }) {
  const { demoRuntime, printStep } = await import('./demo.js');
  const tools = manifest.tools.map((t) => t.name);
  const check = manifest.tools.find((t) => t.kind === 'read').name;
  const draft = tools.find((n) => /_draft_/.test(n)); const req = tools.find((n) => /_request_/.test(n)); const report = tools.find((n) => /_write_report$/.test(n));
  const refused = manifest.policy.rules.find((r) => r.decision === 'block' && r.tool !== '*');
  const rt = demoRuntime(manifest, fixturesDir, { mode: 'auto', autoActions: draft ? [draft] : [] });
  process.stdout.write(`${title} demo (fictional data${args.as_of ? `, as of ${args.as_of}` : ''}), Auto mode on for drafts\n`);
  if (intro) process.stdout.write(`${intro}\n`);
  const a = await rt.call(check, args);
  printStep('Check the files', a);
  if (show && a.result) for (const i of (a.result.items || []).slice(0, 25)) process.stdout.write(`    ${show(i)}\n`);
  if (report) printStep('Write the worklist', await rt.call(report, args));
  if (draft && draftArgs) {
    const d = await rt.call(draft, { ...args, ...draftArgs });
    printStep('Write a draft (Auto)', d);
    if (req && d.result) printStep('Approve it: one named click, even in Auto', await rt.call(req, { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  }
  if (refused) printStep(`The agent tries ${refused.tool} itself`, await rt.call(refused.tool, {}));
}
