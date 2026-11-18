import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS, channelKey, channelLabel } from 'fairshop-core';
import { BALANCE_FIELDS, BALANCE_PROFILES, RESERVE_TERMS_SCHEMA, auditReserves, inquiryText } from './reserves.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  balance: { type: 'string', description: 'Balance or activity export under --root (Stripe balance transactions, PayPal activity, Shopify Payments): date, processor, type, amount, reference, release date' },
  terms: { type: 'string', description: 'Optional reserve terms JSON: percent and days per processor from your own notice, grace_days, upcoming_days, dispute_days' },
  as_of: AS_OF,
};
const run = (a, ctx) => auditReserves(ctx.records(a.balance, 'balance'), a.terms ? ctx.readJson(a.terms, 'reserve_terms') : {}, { asOf: a.as_of });
const line = (r) => `${r.holds} hold(s), ${r.held_now} still held: ${r.chase} release(s) overdue (${r.overdue}), ${r.review} to review, ${r.upcoming} due soon, ${r.held} held to term, ${r.ok} released.`;

export const manifest = shopAgent({
  pkg, prefix: 'reserves', label: 'Fairshop Processor Reserves',
  description: 'Tracks reserves and holds in Stripe, PayPal and Shopify Payments balance exports against the reserve terms you confirm: releases overdue, holds above your terms, releases coming up and dispute holds open too long. Drafts a release inquiry per processor; a person sends it.',
  files, required: ['balance'],
  sources: { balance: { label: 'Balance and activity lines', args: ['balance'], fields: BALANCE_FIELDS, profiles: BALANCE_PROFILES } },
  configSchemas: { reserve_terms: RESERVE_TERMS_SCHEMA },
  run, line,
  check: { title: 'Track reserves and holds', description: 'Match every reserve or dispute hold to its releases and work out what is still held, what is overdue, what is due soon and which holds are above your terms.' },
  explain: { arg: 'hold', argDescription: 'Hold reference or id from reserves_audit', title: 'Explain one hold', description: 'Show one hold: amount, released, still held, expected release and findings.', text: (i) => `${i.id} (${i.processor}, ${i.date}): ${i.status}, held ${i.amount}, released ${i.released}, still held ${i.held}${i.expected_release ? `, expected back ${i.expected_release}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'processor-reserves', title: (r) => `Processor reserves and holds as of ${r.as_of}`, description: 'Write processor-reserves.csv and .html (every hold still held or flagged, by processor) and release-dates.ics into out_dir (default fairshop-out/reserves).',
    columns: ['id', 'processor', 'kind', 'date', 'amount', 'released', 'expected_release', 'status', 'held', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'processor', 'date', 'amount', 'released', 'expected_release', 'status', 'held', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'processor', 'kind', 'date', 'amount', 'released', 'expected_release'], 'held'),
    sections: (r) => [{ title: 'By processor', rows: r.by_processor, columns: ['processor', 'count', 'amount', 'released', 'held'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Reserve terms are the ones in your terms file or the release dates in the export; the agent does not know a processor\'s current terms.', LIMITS.advice],
    ics: (r) => ({ file: 'release-dates.ics', calName: 'Reserve release dates', events: r.items.filter((i) => i.held > 0 && i.expected_release && i.status !== 'chase').map((i) => ({ uid: `reserve-${i.processor_key}-${i.id}@fairshop`, date: i.expected_release, summary: `${i.processor} reserve release expected: ${i.held}`, description: `Written by fairshop-processor-reserves for hold ${i.id}.`, reminders: [1] })) }),
  },
  draft: {
    noun: 'release_inquiry', verb: 'send', category: 'binding_send',
    description: 'Write drafts/release_inquiry-<processor>.md listing overdue releases and long-open dispute holds of one processor. Marked DRAFT. Sending goes through reserves_request_send (one click); a person sends it.',
    required: ['processor'], args: { processor: { type: 'string', description: 'Processor to write to (Stripe, PayPal, Shopify, ...)' }, from: { type: 'string', description: 'Your name and business' }, account: { type: 'string', description: 'Your account id with the processor' } },
    build: (a, ctx, r) => { const k = channelKey(a.processor); const d = inquiryText(r.items.filter((i) => i.processor_key === k), { processor: channelLabel(k), from: a.from, account: a.account }); if (!d.holds.length) throw new Error(`nothing overdue at ${channelLabel(k)}`); return { id: channelLabel(k), text: d.text, amount: d.total, extra: { holds: d.holds } }; },
  },
  refused: [
    { name: 'balance_transfer', category: 'move_money', description: 'Fairshop Processor Reserves never moves money between balances or to a bank.' },
    { name: 'payout_schedule_change', category: 'go_live', description: 'Fairshop Processor Reserves never changes payout or reserve settings at a processor.' },
  ],
  prompt: { name: 'processor_reserves', title: 'Find reserve releases that are overdue', description: 'Walks the host model through a reserves check.',
    text: 'You are helping an e-commerce owner track money a payment processor is holding, with fairshop-processor-reserves. Balance export: {{balance}}.\n\nRules: terms come from the owner\'s file; balance_transfer and payout_schedule_change are blocked.\n\n1. Call reserves_audit (with the terms file when there is one). Lead with overdue releases, then holds above terms.\n2. reserves_explain for a hold.\n3. reserves_write_report for the worklist and the release calendar.\n4. Offer reserves_draft_release_inquiry per processor; reserves_request_send only when asked (one named click).' },
});
