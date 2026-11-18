// FBA reimbursements owed: pure functions over Amazon inventory adjustments, reimbursements,
// customer returns and refunds. Reason codes and windows are settings the seller confirms.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, skuKey, finding, byFinding, byStatus, sortBy, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const ADJUSTMENT_PROFILES = Object.freeze([
  exportProfile('amazon_inventory_adjustments', { date: 'adjusted-date', fnsku: 'fnsku', sku: 'sku', reason: 'reason', quantity: 'quantity', transaction_id: 'transaction-item-id' }),
  exportProfile('amazon_inventory_ledger', { date: 'Date', fnsku: 'FNSKU', sku: ['MSKU', 'Sku'], reason: 'Reason', quantity: 'Quantity', transaction_id: ['Reference ID', 'Event Type'] }, { skipRow: (_r, get) => !/adjust/i.test(String(get('Event Type') || 'Adjustments')), note: 'Inventory Ledger (detailed view): only Adjustments rows are read.' }),
]);
export const REIMBURSEMENT_PROFILES = Object.freeze([
  exportProfile('amazon_reimbursements', { date: 'approval-date', reimbursement_id: 'reimbursement-id', sku: 'sku', reason: 'reason', quantity: { from: ['quantity-reimbursed-cash', 'quantity-reimbursed-inventory'], compute: (_r, get) => (num(get('quantity-reimbursed-cash')) || 0) + (num(get('quantity-reimbursed-inventory')) || 0) }, amount: 'amount-total', order_id: 'amazon-order-id' }),
]);
export const RETURN_PROFILES = Object.freeze([exportProfile('amazon_customer_returns', { order_id: 'order-id', sku: 'sku', date: 'return-date', quantity: 'quantity' })]);

export const ADJUSTMENT_FIELDS = Object.freeze({
  date: t(['Date', 'Adjusted Date', 'adjusted-date'], { type: 'date', required: true }),
  fnsku: t(['FNSKU', 'fnsku']),
  sku: t(['SKU', 'Seller SKU', 'MSKU', 'sku'], { required: true }),
  reason: t(['Reason', 'Reason Code', 'Disposition', 'reason'], { required: true }),
  quantity: t(['Quantity', 'Qty', 'quantity', 'Units'], { type: 'number', required: true }),
  transaction_id: t(['Transaction ID', 'transaction-item-id', 'Reference ID']),
});
export const REIMBURSEMENT_FIELDS = Object.freeze({
  date: t(['Approval Date', 'approval-date', 'Date'], { type: 'date' }),
  reimbursement_id: t(['Reimbursement ID', 'reimbursement-id'], { required: true }),
  sku: t(['SKU', 'sku', 'Seller SKU']),
  reason: t(['Reason', 'reason']),
  quantity: t(['Quantity', 'Quantity Reimbursed', 'Units'], { type: 'number' }),
  amount: t(['Amount', 'Amount Total', 'amount-total', 'Total'], { type: 'money' }),
  order_id: t(['Order ID', 'amazon-order-id', 'Order']),
});
export const RETURN_FIELDS = Object.freeze({ order_id: t(['Order ID', 'order-id', 'Order'], { required: true }), sku: t(['SKU', 'sku']), date: t(['Return Date', 'return-date', 'Date'], { type: 'date' }), quantity: t(['Quantity', 'Qty', 'quantity'], { type: 'number' }) });
export const REFUND_FIELDS = Object.freeze({ order_id: t(['Order ID', 'order-id', 'Order'], { required: true }), sku: t(['SKU', 'sku']), refund_date: t(['Refund Date', 'Date', 'posted-date'], { type: 'date' }), amount: t(['Refund Amount', 'Amount', 'Refunded'], { type: 'money' }), quantity: t(['Quantity', 'Qty', 'quantity-purchased'], { type: 'number' }) });

export const REIMB_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    lost_codes: { type: 'array', items: { type: 'string' }, description: 'Adjustment reason codes that mean lost (default M, 5)' },
    found_codes: { type: 'array', items: { type: 'string' }, description: 'Reason codes that mean found (default F, N)' },
    damaged_codes: { type: 'array', items: { type: 'string' }, description: 'Reason codes that mean damaged in the warehouse (default E, H, K, Q, 6)' },
    wait_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Days to let the marketplace find or pay a unit before it is claimed (default 30)' },
    claim_window_days: { type: 'integer', minimum: 1, maximum: 730, description: 'Days after the event during which a claim can be filed, as you confirm it (default 60)' },
    return_grace_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Days after a refund for the customer return to arrive (default 45)' },
    unit_values: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Value per unit by SKU, used for the estimate and the low-reimbursement check' },
    low_pct: { type: 'number', minimum: 0, maximum: 100, description: 'A reimbursement this many percent under the unit value is listed (default 20)' },
  },
});

const has = (list, v) => list.map((x) => String(x).toUpperCase()).includes(String(v).trim().toUpperCase());
export function reasonClass(reason, s = {}) {
  const r = str(reason);
  if (has(s.lost_codes || ['M', '5'], r)) return 'lost';
  if (has(s.found_codes || ['F', 'N'], r)) return 'found';
  if (has(s.damaged_codes || ['E', 'H', 'K', 'Q', '6'], r)) return 'damaged';
  if (/found/i.test(r)) return 'found';
  if (/lost|misplac/i.test(r)) return 'lost';
  if (/damag/i.test(r)) return 'damaged';
  return 'other';
}

/** Statuses: claim, waiting, window_closed, review, ok. Findings: lost_not_reimbursed, damaged_not_reimbursed, refund_no_return, reimbursed_low. */
export function findReimbursements({ adjustments = [], reimbursements = [], returns = [], refunds = [] }, settings = {}, { asOf } = {}) {
  const day = today(asOf); const wait = settings.wait_days ?? 30; const win = settings.claim_window_days ?? 60; const grace = settings.return_grace_days ?? 45;
  const values = Object.fromEntries(Object.entries(settings.unit_values || {}).map(([k, v]) => [skuKey(k), v])); const low = settings.low_pct ?? 20;
  const items = [];
  const reimb = reimbursements.map((r) => ({ id: str(r.reimbursement_id), date: isoDate(r.date), sku: skuKey(r.sku), reason: str(r.reason), qty: Math.abs(num(r.quantity) || 0), amount: round2(num(r.amount) || 0), order_id: str(r.order_id) }));
  const warehouseReimb = new Map(); for (const r of reimb) if (!r.order_id && /lost|damag|warehouse|misplac|inbound/i.test(r.reason)) warehouseReimb.set(r.sku, (warehouseReimb.get(r.sku) || 0) + r.qty);
  const bySku = new Map();
  for (const a of adjustments) { const k = skuKey(a.sku); if (!k) continue; (bySku.get(k) || bySku.set(k, []).get(k)).push({ date: isoDate(a.date), cls: reasonClass(a.reason, settings), qty: num(a.quantity) || 0, fnsku: str(a.fnsku), tx: str(a.transaction_id) }); }
  for (const [sku, evs] of [...bySku.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const sorted = evs.slice().sort((x, y) => (`${x.date}|${x.cls}|${x.qty}|${x.tx}` < `${y.date}|${y.cls}|${y.qty}|${y.tx}` ? -1 : 1));
    const open = sorted.filter((e) => e.cls === 'lost' || e.cls === 'damaged').map((e) => ({ ...e, left: Math.abs(e.qty) }));
    let found = sorted.filter((e) => e.cls === 'found').reduce((s, e) => s + Math.abs(e.qty), 0);
    let paid = warehouseReimb.get(sku) || 0;
    for (const e of open.filter((x) => x.cls === 'lost')) { const u = Math.min(e.left, found); e.left -= u; found -= u; }
    for (const e of open) { const u = Math.min(e.left, paid); e.left -= u; paid -= u; }
    const unit = values[sku] ?? null; const f = []; let claimable = 0, waiting = 0, closed = 0; let claimBy = null;
    for (const e of open.filter((x) => x.left > 0)) {
      const by = e.date ? addDays(e.date, win) : null; const age = e.date ? daysBetween(e.date, day) : null;
      if (age !== null && age < wait) { waiting += e.left; continue; }
      if (by && by < day) { closed += e.left; continue; }
      claimable += e.left; if (by && (!claimBy || by < claimBy)) claimBy = by;
      f.push(finding(e.cls === 'lost' ? 'lost_not_reimbursed' : 'damaged_not_reimbursed', unit === null ? null : e.left * unit, `${e.left} unit(s) of ${sku} ${e.cls === 'lost' ? 'lost' : 'damaged'} in the warehouse on ${e.date}${e.tx ? ` (${e.tx})` : ''}, not found or reimbursed. Claim by ${by}.`));
    }
    const status = claimable ? 'claim' : waiting ? 'waiting' : closed ? 'window_closed' : 'ok';
    if (!claimable && closed) f.push(finding('window_closed', null, `${closed} unit(s) of ${sku} were not reimbursed and the claim window has closed.`));
    items.push({ id: `SKU:${sku}`, kind: 'inventory', sku, fnsku: (sorted[0] || {}).fnsku || '', order_id: '', units: claimable, units_waiting: waiting, units_closed: closed, value: unit === null ? null : round2(claimable * unit), lost_value: unit === null ? null : round2(closed * unit), claim_by: claimBy, status, findings: f });
  }
  const returned = new Map(); for (const r of returns) { const k = `${str(r.order_id)}|${skuKey(r.sku)}`; returned.set(k, (returned.get(k) || 0) + Math.abs(num(r.quantity) || 1)); }
  const reimbOrders = new Set(reimb.filter((r) => r.order_id).map((r) => `${r.order_id}|${r.sku}`));
  for (const r of sortBy(refunds.map((x) => ({ ...x, id: `${str(x.order_id)}|${skuKey(x.sku)}` })))) {
    const k = r.id; const qty = Math.abs(num(r.quantity) || 1); const back = returned.get(k) || 0; const short = Math.max(0, qty - back); const amt = round2(Math.abs(num(r.amount) || 0));
    const rd = isoDate(r.refund_date); const dueBack = rd ? addDays(rd, grace) : null; const by = dueBack ? addDays(dueBack, win) : null;
    const base = { id: `ORDER:${str(r.order_id)}:${skuKey(r.sku)}`, kind: 'refund', sku: skuKey(r.sku), fnsku: '', order_id: str(r.order_id), units: 0, units_waiting: 0, units_closed: 0, value: 0, lost_value: 0, claim_by: by, findings: [] };
    if (!short || reimbOrders.has(k)) { items.push({ ...base, status: 'ok' }); continue; }
    const value = round2(amt * short / qty);
    if (dueBack && dueBack >= day) { items.push({ ...base, units_waiting: short, status: 'waiting' }); continue; }
    if (by && by < day) { items.push({ ...base, units_closed: short, lost_value: value, status: 'window_closed', findings: [finding('window_closed', null, `Refund on ${r.order_id} (${rd}) with no return; the claim window closed on ${by}.`)] }); continue; }
    items.push({ ...base, units: short, value, status: 'claim', findings: [finding('refund_no_return', value, `Order ${r.order_id} was refunded ${amt} on ${rd} for ${qty} unit(s) of ${skuKey(r.sku)}; ${short} never came back within ${grace} days and no reimbursement names the order. Claim by ${by}.`)] });
  }
  for (const r of sortBy(reimb)) {
    const unit = values[r.sku]; if (!unit || !r.qty || !r.amount) continue;
    const per = round2(r.amount / r.qty);
    if (per < unit * (1 - low / 100)) items.push({ id: `REIMB:${r.id}`, kind: 'reimbursement', sku: r.sku, fnsku: '', order_id: r.order_id, units: 0, units_waiting: 0, units_closed: 0, value: 0, lost_value: 0, claim_by: null, status: 'review', findings: [finding('reimbursed_low', (unit - per) * r.qty, `Reimbursement ${r.id} paid ${per} per unit for ${r.qty} unit(s) of ${r.sku}; your unit value is ${unit}. Ask for the value to be reviewed with proof of cost.`)] });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  const claimable = round2(sorted.filter((i) => i.status === 'claim').reduce((s, i) => s + (i.value || 0), 0));
  const urgent = sorted.filter((i) => i.status === 'claim' && i.claim_by && daysBetween(day, i.claim_by) <= 7).map((i) => i.id);
  return { as_of: day, items_checked: sorted.length, claimable, lost: round2(sorted.reduce((s, i) => s + (i.lost_value || 0), 0)), ...byStatus(sorted, ['claim', 'waiting', 'window_closed', 'review', 'ok']), urgent, by_finding: byFinding(sorted), items: sorted };
}

export function caseText(items, { from, account }) {
  const rows = items.filter((i) => i.status === 'claim' || (i.status === 'review' && i.kind === 'reimbursement'));
  const total = round2(rows.reduce((s, i) => s + (i.value || 0) + (i.kind === 'reimbursement' ? i.findings[0].amount || 0 : 0), 0));
  return { total, claims: rows.map((i) => i.id), text: [
    '# FBA reimbursement case', '', '**To:** [TO CONFIRM Seller Central case, Fulfillment by Amazon > Investigate inventory]', `**From:** ${from || '[TO CONFIRM your name and store]'}`, `**Seller account:** ${account || '[TO CONFIRM merchant token]'}`, '',
    'Please investigate the items below and reimburse what is owed.', '',
    '| Item | SKU | Order | Units | Value | Claim by | Detail |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.id} | ${i.sku} | ${i.order_id} | ${i.units} | ${i.value ?? '[CHECK unit value]'} | ${i.claim_by || ''} | ${i.findings.map((x) => x.detail).join(' ')} |`),
    '', `**Total (estimate):** ${total}`, '', '[ATTACH proof of cost (supplier invoice) for any unit value questioned]',
  ].join('\n') };
}
