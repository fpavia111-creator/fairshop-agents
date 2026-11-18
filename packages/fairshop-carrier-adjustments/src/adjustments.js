// Carrier adjustments against the label data the seller entered.
import { exportProfile, round2, str, num, isoDate, addDays, skuKey, dimWeight, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const ADJ_PROFILES = Object.freeze([
  exportProfile('ups_adjustments', { tracking: 'Tracking Number', date: ['Invoice Date', 'Transaction Date'], carrier: { value: 'UPS' }, reason: ['Adjustment Reason', 'Charge Description'], amount: 'Net Amount', billed_weight: ['Billed Weight', 'Adjusted Weight'] }),
  exportProfile('usps_apv', { tracking: 'Tracking Number', date: ['Adjustment Date', 'Date'], carrier: { value: 'USPS' }, reason: { value: 'APV adjustment' }, amount: ['APV Amount', 'Adjustment Amount'], billed_weight: ['Measured Weight', 'Corrected Weight', 'Adjusted Weight'] }),
]);
export const ADJ_FIELDS = Object.freeze({
  tracking: t(['Tracking', 'Tracking Number'], { required: true }),
  date: t(['Date', 'Adjustment Date', 'Invoice Date'], { type: 'date' }),
  carrier: t(['Carrier', 'Provider']),
  reason: t(['Reason', 'Adjustment Reason', 'Charge Description']),
  amount: t(['Amount', 'Adjustment Amount', 'Net Amount'], { type: 'money', required: true }),
  billed_weight: t(['Billed Weight', 'Adjusted Weight', 'Corrected Weight'], { type: 'number' }),
});
export const LABEL_FIELDS = Object.freeze({
  tracking: t(['Tracking', 'Tracking Number'], { required: true }),
  order_id: t(['Order', 'Order ID', 'Order Number']),
  sku: t(['SKU', 'Item SKU']),
  entered_weight: t(['Entered Weight', 'Weight', 'Declared Weight'], { type: 'number' }),
  length: t(['Length', 'Package Length'], { type: 'number' }),
  width: t(['Width', 'Package Width'], { type: 'number' }),
  height: t(['Height', 'Package Height'], { type: 'number' }),
});
export const ADJ_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    dim_divisor: { type: 'object', additionalProperties: { type: 'number', minimum: 1 }, description: 'Cubic inches per pound per carrier from your agreement, with "default" (default 139)' },
    dispute_window_days: { type: 'integer', minimum: 1, maximum: 365, description: 'Days after the adjustment to dispute it, as your carrier terms say (default 30)' },
    repeat_min: { type: 'integer', minimum: 2, maximum: 50, description: 'Adjustments on one SKU before its product data is listed (default 2)' },
  },
});

/** Statuses: dispute, fix_data, review, window_closed. */
export function checkAdjustments(adjs, labels, s = {}, { asOf } = {}) {
  const day = today(asOf); const div = s.dim_divisor || {}; const win = s.dispute_window_days ?? 30; const rep = s.repeat_min ?? 2;
  const lab = new Map(labels.map((l) => [str(l.tracking), l])); const items = []; const skuCount = new Map();
  for (const a of sortBy(adjs.map((a) => ({ ...a, id: `${str(a.tracking)}|${str(a.reason)}|${num(a.amount)}` })))) {
    const l = lab.get(str(a.tracking)); const amt = round2(Math.abs(num(a.amount) || 0)); const d = isoDate(a.date); const by = d ? addDays(d, win) : null;
    const reason = str(a.reason); const carrier = str(a.carrier); const f = []; let status;
    const sku = l ? skuKey(l.sku) : '';
    if (/address/i.test(reason)) { f.push(finding('address_correction', null, `Address correction of ${amt} on ${a.tracking}. Check the address book entry for order ${l ? l.order_id : '(unknown)'}.`)); status = 'review'; }
    else if (!/dim|weight|apv|size|measure/i.test(reason)) { f.push(finding('other_adjustment', null, `"${reason}" of ${amt} on ${a.tracking}.`)); status = 'review'; }
    else if (!l || num(l.length) === null || num(l.width) === null || num(l.height) === null) { f.push(finding('no_declared_dims', null, `${a.tracking} has no dimensions on the label${l ? '' : ' (no label found)'}, so the ${amt} adjustment cannot be checked.`)); status = 'review'; }
    else {
      const dw = dimWeight(l.length, l.width, l.height, div[carrier.toLowerCase()] ?? div.default ?? 139); const should = Math.max(Math.ceil(num(l.entered_weight) || 0), dw || 0); const billed = num(a.billed_weight);
      if (billed !== null && billed > should) { f.push(finding('disputable', amt, `${a.tracking} was re-billed at ${billed} lb; your label (${num(l.entered_weight)} lb, ${l.length}×${l.width}×${l.height}) gives ${should} lb. Dispute by ${by}.`)); status = by && by < day ? 'window_closed' : 'dispute'; }
      else { f.push(finding('label_data_low', null, `${a.tracking} (${sku}): the adjustment to ${billed} lb matches the dimensions on your label; the entered weight ${num(l.entered_weight)} lb was too low. Enter dimensions when buying the label.`)); status = 'fix_data'; if (sku) skuCount.set(sku, (skuCount.get(sku) || 0) + 1); }
    }
    items.push({ id: a.id, kind: 'adjustment', tracking: str(a.tracking), carrier, sku, order_id: l ? str(l.order_id) : '', date: d, reason, amount: amt, dispute_by: status === 'dispute' || status === 'window_closed' ? by : null, status, findings: f });
  }
  for (const [sku, n] of [...skuCount.entries()].sort()) if (n >= rep) items.push({ id: `SKU:${sku}`, kind: 'sku', tracking: '', carrier: '', sku, order_id: '', date: null, reason: '', amount: round2(items.filter((i) => i.sku === sku && i.status === 'fix_data').reduce((a, i) => a + i.amount, 0)), dispute_by: null, status: 'fix_data', findings: [finding('repeat_sku', null, `${sku} was adjusted ${n} times with your own label data agreeing. Update its weight and box size in your shipping software.`)] });
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`); const adjOnly = sorted.filter((i) => i.kind === 'adjustment');
  return { as_of: day, adjustments: adjOnly.length, total: round2(adjOnly.reduce((a, i) => a + i.amount, 0)), disputable: round2(adjOnly.filter((i) => i.status === 'dispute').reduce((a, i) => a + i.amount, 0)), lost: round2(adjOnly.filter((i) => i.status === 'window_closed').reduce((a, i) => a + i.amount, 0)), ...byStatus(sorted, ['dispute', 'fix_data', 'review', 'window_closed']), by_finding: byFinding(sorted), items: sorted };
}

export function disputeText(items, { carrier, account, from }) {
  const rows = items.filter((i) => i.status === 'dispute' && (!carrier || i.carrier.toLowerCase() === String(carrier).toLowerCase())); const total = round2(rows.reduce((a, i) => a + i.amount, 0));
  return { total, trackings: rows.map((i) => i.tracking), text: [`# Adjustment dispute${carrier ? `: ${carrier}` : ''}`, '', `**To:** [TO CONFIRM ${carrier || 'carrier'} billing disputes]`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, `**Account:** ${account || '[TO CONFIRM shipper account]'}`, '', `Please reverse the ${rows.length} adjustment(s) below, ${total} in total. The weight and dimensions we entered are attached.`, '', '| Tracking | Date | Amount | Dispute by | Detail |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.tracking} | ${i.date} | ${i.amount} | ${i.dispute_by} | ${i.findings[0].detail} |`), '', '[ATTACH photos of the packed box on a scale with a tape measure, if you have them]'].join('\n') };
}
