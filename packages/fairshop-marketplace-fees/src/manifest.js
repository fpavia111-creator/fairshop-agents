import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS, channelKey, channelLabel } from 'fairshop-core';
import { FEE_FIELDS, FEE_PROFILES, FEE_SCHEDULE_SCHEMA, auditFees, disputeText } from './fees.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  fees: { type: 'string', description: 'Fee lines under --root (Amazon settlement, Etsy payment account, eBay or Walmart reports, or your own CSV): order, channel, date, fee type, fee amount, sale amount, category' },
  schedule: { type: 'string', description: 'Fee schedule JSON you confirm: per channel and fee type a percent, fixed amount, minimum and percents by category; optional aliases for fee wording' },
  as_of: AS_OF,
};
const run = (a, ctx) => auditFees(ctx.records(a.fees, 'fees'), ctx.readJson(a.schedule, 'fee_schedule'), { asOf: a.as_of });
const line = (r) => `${r.lines} fee line(s), ${r.fees} in fees: ${r.dispute} above your schedule (${r.over} over), ${r.review} to review, ${r.ok} as expected; ${r.rate_changes.length} month-to-month rate change(s).`;

export const manifest = shopAgent({
  pkg, prefix: 'fees', label: 'Fairshop Marketplace Fees',
  description: 'Checks every marketplace fee line (Amazon, eBay, Etsy, Walmart) against the fee schedule you confirm: fees above it, fee types not in it, percent fees with no sale amount, and effective rates that moved month to month. Drafts a fee review request per channel; a person sends it.',
  files, required: ['fees', 'schedule'],
  sources: { fees: { label: 'Marketplace fee lines', args: ['fees'], fields: FEE_FIELDS, profiles: FEE_PROFILES } },
  configSchemas: { fee_schedule: FEE_SCHEDULE_SCHEMA },
  run, line,
  check: { title: 'Check fees against your schedule', description: 'Check every fee line against your fee schedule. Returns what is above it (to dispute), what to review (fee types not in the schedule, percent fees without a sale amount), month-to-month rate changes and totals by fee type.' },
  explain: { arg: 'order_id', argDescription: 'Order number or fee line id from fees_audit', title: 'Explain the fees on one order', description: 'Show every fee line of one order with the expected fee and why it was flagged.', match: (i, want) => i.order_id.toLowerCase() === want.toLowerCase() || i.id.toLowerCase() === want.toLowerCase(), text: (i) => `${i.order_id || i.id} ${i.channel} ${i.fee_type}: charged ${i.fee}, expected ${i.expected ?? 'n/a'} (${i.status}). ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'marketplace-fees', title: 'Marketplace fees against your fee schedule', description: 'Write marketplace-fees.csv (flagged fee lines with a blank decision column) and marketplace-fees.html (by fee type, rate changes by month, every flagged line) into out_dir (default fairshop-out/fees).',
    columns: ['id', 'channel', 'order_id', 'date', 'fee_type', 'sale_amount', 'fee', 'expected', 'status', 'over', 'findings', 'reasons', 'decision'],
    htmlColumns: ['channel', 'order_id', 'date', 'fee_type', 'sale_amount', 'fee', 'expected', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'channel', 'order_id', 'date', 'fee_type', 'sale_amount', 'fee', 'expected'], 'over'),
    sections: (r) => [{ title: 'By fee type', rows: r.by_fee_type, columns: ['fee_type', 'count', 'fee', 'over'] }, { title: 'Fee rate changes by month', rows: r.rate_changes, columns: ['channel', 'fee_type', 'month', 'from_pct', 'to_pct'] }],
    limits: [LIMITS.files, LIMITS.settings, 'A change in the effective rate can come from a different category mix, not a fee change; it is listed for a person to read.', LIMITS.advice],
  },
  draft: {
    noun: 'fee_review', verb: 'send', category: 'binding_send',
    description: 'Write drafts/fee_review-<channel>.md listing every fee line of one channel above your schedule, with charged, expected and the difference. Marked DRAFT. Sending goes through fees_request_send (one click); a person sends it.',
    required: ['channel'], args: { channel: { type: 'string', description: 'Channel to write to (Amazon, Etsy, eBay, Walmart)' }, from: { type: 'string', description: 'Your name and store' }, account: { type: 'string', description: 'Your seller id on that channel' } },
    build: (a, ctx, r) => {
      const k = channelKey(a.channel); const items = r.items.filter((i) => i.channel_key === k);
      if (!items.length) throw new Error(`no fee lines for channel "${String(a.channel).slice(0, 40)}"`);
      const d = disputeText(items, { channel: channelLabel(k), from: a.from, account: a.account });
      if (!d.lines.length) throw new Error(`no fee above your schedule on ${channelLabel(k)}`);
      return { id: channelLabel(k), text: d.text, amount: d.total, extra: { lines: d.lines.length } };
    },
  },
  refused: [
    { name: 'fee_dispute_submit', category: 'binding_send', description: 'Fairshop Marketplace Fees never opens a case with a marketplace; a person sends the reviewed request.' },
    { name: 'listing_price_update', category: 'go_live', description: 'Fairshop Marketplace Fees never changes a price or listing to make up for a fee.' },
  ],
  prompt: { name: 'marketplace_fee_audit', title: 'Check marketplace fees against your schedule', description: 'Walks the host model through a fee audit with Fairshop Marketplace Fees.',
    text: 'You are helping a marketplace seller check fees with fairshop-marketplace-fees. Fee lines: {{fees}}. Schedule: {{schedule}}.\n\nRules: the schedule is the seller\'s own; do not tell them what a marketplace charges. fee_dispute_submit and listing_price_update are blocked.\n\n1. Call fees_audit. Lead with the total above the schedule by channel, then fee types not in the schedule, then rate changes.\n2. Use fees_explain for an order.\n3. Call fees_write_report.\n4. Offer fees_draft_fee_review per channel; fees_request_send only when asked (one named click).' },
});
