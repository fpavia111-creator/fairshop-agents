import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { CLAIM_FIELDS, CLAIM_PROFILES, SHIPMENT_FIELDS, CLAIM_SETTINGS_SCHEMA, reviewClaims, responseText } from './claims.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  claims: { type: 'string', description: 'Claims or cases export under --root (Amazon A-to-z, eBay, Walmart, Etsy or your own CSV): claim id, channel, order, opened date, reason, amount, status, respond-by' },
  shipments: { type: 'string', description: 'Shipments under --root: order, carrier, tracking, ship date, delivered date, signature (yes/no)' },
  settings: { type: 'string', description: 'Optional settings JSON: respond_days per channel, signature_over (your own rule)' },
  as_of: AS_OF,
};
const run = (a, ctx) => reviewClaims(ctx.records(a.claims, 'claims'), ctx.records(a.shipments, 'shipments'), a.settings ? ctx.readJson(a.settings, 'claim_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.claims} claim(s), ${r.at_stake} at stake: ${r.respond} to answer${r.urgent.length ? ` (${r.urgent.length} due today or tomorrow)` : ''}, ${r.overdue} overdue, ${r.closed} closed. Open: ${r.by_advice.defend} your tracking can defend, ${r.by_advice.weak} weak, ${r.by_advice.gather_evidence} need photos and messages, ${r.by_advice.refund_likely} likely refunds.`;

export const manifest = shopAgent({
  pkg, prefix: 'claims', label: 'Fairshop Marketplace Claims',
  description: 'Lines up Amazon A-to-z, eBay, Walmart and Etsy claims with your shipment and delivery records: respond-by dates, which claims your tracking can defend, which need a signature or photos, which are likely refunds, and which are overdue. Drafts each response; a person submits it.',
  files, required: ['claims', 'shipments'],
  sources: { claims: { label: 'Marketplace claims', args: ['claims'], fields: CLAIM_FIELDS, profiles: CLAIM_PROFILES }, shipments: { label: 'Shipments', args: ['shipments'], fields: SHIPMENT_FIELDS } },
  configSchemas: { claim_settings: CLAIM_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Line up claims with delivery records', description: 'For every claim, work out the respond-by date, what your shipment records prove, what is still needed, and whether it looks defensible.' },
  explain: { arg: 'claim_id', argDescription: 'Claim or case id from claims_audit', title: 'Explain one claim', description: 'Show one claim with its deadline, delivery evidence and what is still needed.', text: (i) => `${i.id} (${i.channel}, order ${i.order_id}): ${i.status}, respond by ${i.respond_by}, advice ${i.advice}${i.still_needed.length ? `, still needed: ${i.still_needed.join(', ')}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'marketplace-claims', title: (r) => `Marketplace claims as of ${r.as_of}`, description: 'Write marketplace-claims.csv and .html (every open claim with its deadline and evidence) and claim-deadlines.ics into out_dir (default fairshop-out/claims).',
    columns: ['id', 'channel', 'order_id', 'reason', 'respond_by', 'advice', 'tracking', 'delivered', 'status', 'amount', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'channel', 'order_id', 'respond_by', 'advice', 'delivered', 'status', 'amount', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'closed'), ['id', 'channel', 'order_id', 'reason', 'respond_by', 'advice', 'tracking', 'delivered']),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'amount'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Respond-by dates come from the export or from your respond_days settings; check each on the marketplace before relying on it.', 'The advice is a reading of your own records, not a prediction of the marketplace decision.', LIMITS.advice],
    ics: (r) => ({ file: 'claim-deadlines.ics', calName: 'Marketplace claim deadlines', events: r.items.filter((i) => i.status === 'respond' && i.respond_by).map((i) => ({ uid: `claim-${i.id}@fairshop`, date: i.respond_by, summary: `Respond to ${i.channel} claim ${i.id}`, description: 'Written by fairshop-marketplace-claims.', reminders: [1] })) }),
  },
  draft: {
    noun: 'claim_response', verb: 'send', category: 'binding_send',
    description: 'Write drafts/claim_response-<claim>.md for one open claim: the delivery facts from your records, or what to attach. Marked DRAFT. Sending goes through claims_request_send (one click); a person submits it on the marketplace.',
    required: ['claim_id'], args: { claim_id: { type: 'string', description: 'Claim or case id to answer' }, from: { type: 'string', description: 'Your name and store' } },
    build: (a, ctx, r) => { const i = r.items.find((x) => x.id === String(a.claim_id).trim()); if (!i) throw new Error(`claim "${String(a.claim_id).slice(0, 40)}" not found`); if (i.status === 'closed') throw new Error(`claim ${i.id} is closed`); return { id: i.id, text: responseText(i, a), amount: i.amount, extra: { advice: i.advice } }; },
  },
  refused: [
    { name: 'claim_response_submit', category: 'binding_send', description: 'Fairshop Marketplace Claims never submits a response on a marketplace; a person does.' },
    { name: 'issue_refund', category: 'move_money', description: 'Fairshop Marketplace Claims never refunds a buyer.' },
  ],
  prompt: { name: 'marketplace_claims', title: 'Answer marketplace claims before they expire', description: 'Walks the host model through open claims.',
    text: 'You are helping a seller answer marketplace claims with fairshop-marketplace-claims. Claims: {{claims}}. Shipments: {{shipments}}.\n\nRules: buyer names and e-mails are masked; never ask for them. claim_response_submit and issue_refund are blocked. The advice is a reading of the records, not a prediction.\n\n1. Call claims_audit. Lead with claims due today or tomorrow, then overdue ones.\n2. claims_explain for a claim.\n3. claims_write_report for the worklist and the deadline calendar.\n4. Offer claims_draft_claim_response per claim; claims_request_send only when asked (one named click).' },
});
