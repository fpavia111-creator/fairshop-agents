// Marketplace fee audit: pure functions over fee lines and a fee schedule the seller confirms.
import { exportProfile, round2, str, num, isoDate, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, monthOf, pct, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });

export const FEE_PROFILES = Object.freeze([
  exportProfile('amazon_settlement_v2', { order_id: 'order-id', channel: { value: 'Amazon' }, date: 'posted-date', fee_type: 'amount-description', fee: 'amount', sku: 'sku' }, { skipRow: (_r, get) => !/fee|commission/i.test(String(get('amount-description') || '')), note: 'Amazon settlement V2: only lines whose description names a fee or commission are read. The sale amount is not on a fee line; join the order lines with the sale_amount column, or the percent checks are listed as "no sale amount".' }),
  exportProfile('etsy_payments_csv', { order_id: { from: ['Info', 'Title'], compute: (_r, get) => (/Order #?(\d+)/i.exec(`${get('Info') || ''} ${get('Title') || ''}`) || [])[1] || '' }, channel: { value: 'Etsy' }, date: 'Date', fee_type: 'Title', fee: 'Fees & Taxes', sale_amount: 'Amount' }, { skipRow: (_r, get) => !/fee/i.test(String(get('Type') || '')), note: 'Etsy payment account CSV: fee rows only (Type mentions a fee); the order number is read from Info or Title.' }),
]);

export const FEE_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'order-id', 'Order Number', 'Order #']),
  channel: t(['Channel', 'Marketplace', 'Platform']),
  date: t(['Date', 'Posted Date', 'posted-date', 'Transaction Date', 'Fee Date'], { type: 'date' }),
  fee_type: t(['Fee Type', 'Fee', 'Fee Description', 'amount-description', 'Description', 'Charge Type'], { required: true }),
  fee: t(['Fee Amount', 'Amount', 'Fees', 'Charge'], { type: 'money', required: true }),
  sale_amount: t(['Sale Amount', 'Item Price', 'Principal', 'Product Sales', 'Order Amount', 'Sale Price'], { type: 'money' }),
  category: t(['Category', 'Product Category', 'Fee Category']),
  sku: t(['SKU', 'Seller SKU', 'sku']),
});

const RULE = { type: 'object', additionalProperties: false, properties: { percent: { type: 'number', minimum: 0, maximum: 100 }, fixed: { type: 'number', minimum: 0 }, min: { type: 'number', minimum: 0 }, by_category: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 100 } } } };
export const FEE_SCHEDULE_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['channels'],
  properties: {
    note: { type: 'string' },
    channels: { type: 'object', additionalProperties: { type: 'object', additionalProperties: RULE }, description: 'Per channel (amazon, etsy, ebay, walmart), per fee type: percent of the sale, fixed amount, minimum, percent by category. From your own fee pages or agreement.' },
    aliases: { type: 'object', additionalProperties: { type: 'string' }, description: 'Fee wording in your files → fee type in the schedule ("Commission" → "referral")' },
    tolerance: { type: 'number', minimum: 0, maximum: 100, description: 'Differences up to this amount are rounding (default 0.02)' },
    rate_change_points: { type: 'number', minimum: 0, maximum: 100, description: 'A month whose effective rate moves by more than this many percentage points is listed (default 1)' },
  },
});

/** Fee wording seen in exports → schedule key. Settings aliases come first. */
const WORDS = [[/referral|commission/, 'referral'], [/fba.*(per ?unit|fulfil)|fulfil?ment fee|pick ?and ?pack/, 'fba fulfillment'], [/final ?value/, 'final value'], [/transaction/, 'transaction'], [/listing/, 'listing'], [/(payment )?processing/, 'processing'], [/closing|variable closing/, 'closing'], [/storage/, 'storage'], [/advertis|offsite ads?/, 'advertising']];
export function feeKey(text, aliases = {}) {
  const s = str(text); if (!s) return '';
  for (const [k, v] of Object.entries(aliases)) if (k.toLowerCase() === s.toLowerCase()) return v.toLowerCase();
  const flat = s.toLowerCase().replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  const spaced = s.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[_-]+/g, ' ');
  for (const [re, k] of WORDS) if (re.test(spaced) || re.test(flat)) return k;
  return spaced.replace(/\s+/g, ' ').trim();
}

/** Expected fee for one line under one rule; null when it cannot be worked out. */
export function expectedFee(rule, sale, category) {
  const p = rule.by_category && category && rule.by_category[str(category).toLowerCase()] !== undefined ? rule.by_category[str(category).toLowerCase()] : rule.percent;
  if (p && (sale === null || sale === undefined)) return null;
  let v = (p ? sale * p / 100 : 0);
  if (rule.min !== undefined && p) v = Math.max(v, rule.min);
  return round2(v + (rule.fixed || 0));
}

/**
 * Check fee lines. Line statuses: dispute, review, ok. Finding codes: fee_over_schedule,
 * fee_not_in_schedule, fee_without_sale. Month-to-month rate moves are listed in rate_changes.
 */
export function auditFees(rows, schedule = {}, { asOf } = {}) {
  const tol = schedule.tolerance ?? 0.02; const move = schedule.rate_change_points ?? 1; const aliases = schedule.aliases || {};
  const chans = Object.fromEntries(Object.entries(schedule.channels || {}).map(([c, rules]) => [channelKey(c), Object.fromEntries(Object.entries(rules).map(([k, v]) => [k.toLowerCase(), v]))]));
  const lines = sortBy(rows.filter((r) => str(r.fee_type) || num(r.fee)).map((r) => {
    const ch = channelKey(r.channel) || 'unknown'; const key = feeKey(r.fee_type, aliases);
    return { ch, key, order_id: str(r.order_id), date: isoDate(r.date), fee_type: str(r.fee_type), fee: round2(Math.abs(num(r.fee) || 0)), sale: num(r.sale_amount) === null ? null : round2(Math.abs(num(r.sale_amount))), category: str(r.category), sku: str(r.sku), id: `${ch}:${str(r.order_id) || '-'}:${key}:${isoDate(r.date) || ''}:${Math.abs(num(r.fee) || 0)}` };
  }));
  const ids = new Map(); const items = [];
  for (const l of lines) {
    const n = (ids.get(l.id) || 0) + 1; ids.set(l.id, n); const id = n > 1 ? `${l.id}#${n}` : l.id;
    const rule = (chans[l.ch] || {})[l.key]; const f = []; let expected = null; let status = 'ok';
    if (!rule) { f.push(finding('fee_not_in_schedule', null, `"${l.fee_type}" (${l.fee}) on ${channelLabel(l.ch)} is not in your fee schedule. Add it, or ask the marketplace what it is.`)); status = 'review'; }
    else {
      expected = expectedFee(rule, l.sale, l.category);
      if (expected === null) { f.push(finding('fee_without_sale', null, `${l.fee_type} ${l.fee} is a percent fee but the line has no sale amount, so it cannot be checked.`)); status = 'review'; }
      else if (l.fee > expected + tol) { f.push(finding('fee_over_schedule', l.fee - expected, `${l.fee_type} ${l.fee} on a sale of ${l.sale ?? 0}${l.category ? ` (${l.category})` : ''}; your schedule gives ${expected}.`)); status = 'dispute'; }
    }
    items.push({ id, channel: channelLabel(l.ch), channel_key: l.ch, order_id: l.order_id, date: l.date, month: monthOf(l.date), fee_type: l.fee_type, fee_key: l.key, sale_amount: l.sale, fee: l.fee, expected, over: f[0] && f[0].code === 'fee_over_schedule' ? f[0].amount : 0, sku: l.sku, category: l.category, status, findings: f });
  }
  // Effective rate per channel, fee type and month (percent fees with a sale amount only).
  const groups = new Map();
  for (const i of items) { if (!i.sale_amount || !i.month) continue; const k = `${i.channel}|${i.fee_key}|${i.month}`; const g = groups.get(k) || { channel: i.channel, fee_type: i.fee_key, month: i.month, fees: 0, sales: 0 }; g.fees = round2(g.fees + i.fee); g.sales = round2(g.sales + i.sale_amount); groups.set(k, g); }
  const series = sortBy([...groups.values()].map((g) => ({ ...g, id: `${g.channel}|${g.fee_type}|${g.month}`, rate_pct: pct(g.fees, g.sales) })));
  const rateChanges = [];
  for (let i = 1; i < series.length; i++) { const a = series[i - 1], b = series[i]; if (a.channel === b.channel && a.fee_type === b.fee_type && Math.abs(b.rate_pct - a.rate_pct) > move) rateChanges.push({ channel: b.channel, fee_type: b.fee_type, month: b.month, from_pct: a.rate_pct, to_pct: b.rate_pct, detail: `${b.channel} ${b.fee_type}: ${a.rate_pct}% in ${a.month}, ${b.rate_pct}% in ${b.month}. Check for a fee change or a different category mix.` }); }
  const sorted = sortBy(items, (i) => `${i.channel_key}|${i.date}|${i.id}`);
  const over = round2(sorted.reduce((s, i) => s + i.over, 0));
  const byType = rollup(sorted, (i) => `${i.channel} · ${i.fee_key}`, ['fee', 'over']).map(({ key, ...v }) => ({ fee_type: key, ...v }));
  return { as_of: today(asOf), lines: sorted.length, fees: round2(sorted.reduce((s, i) => s + i.fee, 0)), over, ...byStatus(sorted, ['dispute', 'review', 'ok']), rate_changes: rateChanges, by_fee_type: byType, by_finding: byFinding(sorted), items: sorted };
}

/** Dispute text for one channel. */
export function disputeText(items, { channel, from, account }) {
  const rows = items.filter((i) => i.status === 'dispute'); const total = round2(rows.reduce((s, i) => s + i.over, 0));
  return { total, lines: rows.map((i) => i.id), text: [
    `# Fee review request: ${channel}`, '', `**To:** [TO CONFIRM ${channel} seller support]`, `**From:** ${from || '[TO CONFIRM your name and store]'}`, `**Seller account:** ${account || '[TO CONFIRM seller id]'}`, '',
    `The ${rows.length} fee line(s) below are higher than the fee schedule we work from, ${total} in total. Please check each and credit what was overcharged, or tell us which rule applies.`, '',
    '| Order | Date | Fee | Sale | Charged | Expected | Difference |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.order_id} | ${i.date || ''} | ${i.fee_type} | ${i.sale_amount ?? ''} | ${i.fee} | ${i.expected} | ${i.over} |`),
    '', `**Total difference:** ${total}`, '', '[CHECK the fee schedule version and category for each line before sending]',
  ].join('\n') };
}
