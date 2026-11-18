// FBA storage and aged-inventory fees: pure functions over the monthly storage fee report and
// inventory lots, against rates the seller confirms.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, skuKey, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const STORAGE_PROFILES = Object.freeze([
  exportProfile('amazon_storage_fees', { month: 'month_of_charge', sku: ['sku', 'fnsku'], size_tier: ['product_size_tier', 'size_tier'], avg_qty: 'average_quantity_on_hand', unit_volume: 'item_volume', fee: 'estimated_monthly_storage_fee' }),
]);
export const STORAGE_FIELDS = Object.freeze({
  month: t(['Month', 'Month of Charge', 'month_of_charge'], { required: true }),
  sku: t(['SKU', 'Seller SKU', 'sku'], { required: true }),
  size_tier: t(['Size Tier', 'Product Size Tier', 'product_size_tier']),
  avg_qty: t(['Average Quantity On Hand', 'Avg Qty', 'Average Units'], { type: 'number' }),
  unit_volume: t(['Item Volume', 'Unit Volume', 'Cubic Feet per Unit', 'item_volume'], { type: 'number' }),
  fee: t(['Storage Fee', 'Estimated Monthly Storage Fee', 'Fee'], { type: 'money', required: true }),
});
export const LOT_FIELDS = Object.freeze({ sku: t(['SKU', 'sku', 'Seller SKU'], { required: true }), received_date: t(['Received Date', 'Receipt Date', 'Inventory Date', 'Date'], { type: 'date', required: true }), qty: t(['Quantity', 'Qty', 'Units', 'Available'], { type: 'number', required: true }) });

const RATES = { type: 'object', additionalProperties: { type: 'number', minimum: 0 } };
export const STORAGE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['rates'],
  properties: {
    note: { type: 'string' },
    rates: { type: 'object', additionalProperties: RATES, description: 'Monthly rate per cubic foot by size tier ("standard", "oversize") and season ("jan-sep", "oct-dec"), from the current fee page, confirmed by you' },
    aged_brackets: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['from_days', 'per_cuft'], properties: { from_days: { type: 'integer', minimum: 1 }, per_cuft: { type: 'number', minimum: 0 } } }, description: 'Aged-inventory surcharge brackets you confirm: from this many days of age, this monthly rate per cubic foot' },
    unit_margin: { type: 'object', additionalProperties: { type: 'number' }, description: 'Margin per unit by SKU before storage, for the storage-versus-margin check' },
    warn_days: { type: 'integer', minimum: 1, maximum: 120, description: 'Warn this many days before a lot crosses into the next bracket (default 30)' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.05)' },
  },
});

const season = (month) => (/-(10|11|12)$/.test(month) ? 'oct-dec' : 'jan-sep');
const tierKey = (v) => (/over|large|bulky|extra/i.test(str(v)) ? 'oversize' : 'standard');

/** Statuses: dispute, act, review, ok. Findings: storage_over_rate, aged_bracket_soon, aged_in_bracket, storage_exceeds_margin. */
export function auditStorage(fees, lots, settings, { asOf } = {}) {
  const day = today(asOf); const tol = settings.tolerance ?? 0.05; const warn = settings.warn_days ?? 30;
  const brackets = (settings.aged_brackets || []).slice().sort((a, b) => a.from_days - b.from_days);
  const margin = Object.fromEntries(Object.entries(settings.unit_margin || {}).map(([k, v]) => [skuKey(k), v]));
  const items = []; const volume = new Map(); const latest = new Map();
  for (const f of sortBy(fees.map((r) => ({ ...r, id: `FEE:${skuKey(r.sku)}:${str(r.month).slice(0, 7)}` })))) {
    const sku = skuKey(f.sku); const month = str(f.month).slice(0, 7); const qty = num(f.avg_qty); const vol = num(f.unit_volume); const fee = round2(num(f.fee) || 0);
    if (vol) volume.set(sku, vol);
    const prev = latest.get(sku); if (!prev || month > prev.month) latest.set(sku, { month, fee, qty });
    const rate = ((settings.rates || {})[tierKey(f.size_tier)] || {})[season(month)];
    const expected = rate !== undefined && qty !== null && vol !== null ? round2(qty * vol * rate) : null;
    const fl = [];
    if (expected !== null && fee > expected + tol) fl.push(finding('storage_over_rate', fee - expected, `${sku} ${month}: charged ${fee}; ${qty} unit(s) × ${vol} cu ft × ${rate} (${tierKey(f.size_tier)}, ${season(month)}) gives ${expected}.`));
    items.push({ id: f.id, kind: 'fee', sku, month, qty, expected, fee, monthly: 0, act_by: null, status: fl.length ? 'dispute' : 'ok', findings: fl });
  }
  const surcharge = new Map();
  for (const l of sortBy(lots.map((r) => ({ ...r, id: `LOT:${skuKey(r.sku)}:${isoDate(r.received_date)}` })))) {
    const sku = skuKey(l.sku); const rd = isoDate(l.received_date); const qty = num(l.qty) || 0; const vol = volume.get(sku) ?? null; const age = rd ? daysBetween(rd, day) : null;
    const cur = [...brackets].reverse().find((b) => age !== null && age >= b.from_days); const next = brackets.find((b) => age !== null && age < b.from_days);
    const fl = []; let status = 'ok'; let monthly = 0; let actBy = null;
    if (cur) { monthly = vol === null ? 0 : round2(qty * vol * cur.per_cuft); surcharge.set(sku, round2((surcharge.get(sku) || 0) + monthly)); fl.push(finding('aged_in_bracket', vol === null ? null : monthly, `${qty} unit(s) of ${sku} received ${rd} are ${age} days old and in the ${cur.from_days}+ day bracket${vol === null ? '' : `: about ${monthly} a month`}.`)); status = 'review'; }
    if (next && rd && next.from_days - age <= warn) { actBy = addDays(rd, next.from_days); const extra = vol === null ? null : round2(qty * vol * (next.per_cuft - (cur ? cur.per_cuft : 0))); fl.push(finding('aged_bracket_soon', extra, `${qty} unit(s) of ${sku} reach ${next.from_days} days on ${actBy}${extra === null ? '' : `, adding about ${extra} a month`}. Sell, move or remove them before then.`)); status = 'act'; }
    items.push({ id: l.id, kind: 'lot', sku, month: '', qty, expected: null, fee: 0, monthly, act_by: actBy, status, findings: fl });
  }
  for (const [sku, m] of [...latest.entries()].sort()) {
    if (margin[sku] === undefined || !m.qty) continue;
    const perUnit = round2((m.fee + (surcharge.get(sku) || 0)) / m.qty);
    if (perUnit > margin[sku]) items.push({ id: `SKU:${sku}`, kind: 'sku', sku, month: m.month, qty: m.qty, expected: null, fee: m.fee, monthly: surcharge.get(sku) || 0, act_by: null, status: 'review', findings: [finding('storage_exceeds_margin', round2((perUnit - margin[sku]) * m.qty), `${sku}: storage and aged surcharge come to ${perUnit} a unit in ${m.month}, more than its ${margin[sku]} margin.`)] });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  return { as_of: day, items_checked: sorted.length, over: round2(sorted.reduce((s, i) => s + (i.findings.find((f) => f.code === 'storage_over_rate') || { amount: 0 }).amount, 0)), aged_monthly: round2(sorted.filter((i) => i.kind === 'lot').reduce((s, i) => s + i.monthly, 0)), ...byStatus(sorted, ['dispute', 'act', 'review', 'ok']), by_finding: byFinding(sorted), items: sorted };
}

export function planText(items, { from }) {
  const rows = items.filter((i) => i.kind === 'lot' && i.status !== 'ok');
  return { lots: rows.map((i) => i.id), text: [
    '# Aged inventory plan', '', `**To:** [TO CONFIRM the person who approves removals and promotions]`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Lots below are paying, or will soon pay, an aged-inventory surcharge. Choose for each: sell through (promotion), move, remove or dispose.', '',
    '| Lot | Units | Act by | Monthly now | Detail | Decision |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.id} | ${i.qty} | ${i.act_by || 'now'} | ${i.monthly} | ${i.findings.map((x) => x.detail).join(' ')} | [CHECK sell / move / remove] |`),
  ].join('\n') };
}
