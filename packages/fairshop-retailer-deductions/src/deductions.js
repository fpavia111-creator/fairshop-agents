// Retailer deductions against invoices and proof of delivery.
import { round2, str, num, isoDate, addDays, daysBetween, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const DEDUCTION_FIELDS = Object.freeze({
  retailer: t(['Retailer', 'Customer', 'Trading Partner'], { required: true }),
  remit_id: t(['Remit ID', 'Remittance', 'Check Number', 'Payment ID']),
  invoice_number: t(['Invoice', 'Invoice Number'], { required: true }),
  po: t(['PO', 'PO Number']),
  deduction_type: t(['Deduction Type', 'Type', 'Reason'], { required: true }),
  deduction_code: t(['Deduction Code', 'Reason Code', 'Code']),
  amount: t(['Amount', 'Deduction Amount'], { type: 'money', required: true }),
  deduction_date: t(['Deduction Date', 'Date', 'Remit Date'], { type: 'date' }),
});
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice', 'Invoice Number'], { required: true }),
  po: t(['PO', 'PO Number']),
  retailer: t(['Retailer', 'Customer']),
  amount: t(['Amount', 'Invoice Amount', 'Total'], { type: 'money' }),
  units_shipped: t(['Units Shipped', 'Units', 'Quantity'], { type: 'number' }),
  ship_date: t(['Ship Date', 'Date'], { type: 'date' }),
});
export const POD_FIELDS = Object.freeze({ invoice_number: t(['Invoice', 'Invoice Number'], { required: true }), units_delivered: t(['Units Delivered', 'Delivered', 'Received'], { type: 'number' }), signed: t(['Signed', 'Signature'], { type: 'bool' }) });
export const DEDUCTION_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    dispute_window_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 1, maximum: 730 }, description: 'Days to dispute per retailer, with "default" (default 90), from your vendor agreements' },
    write_off_under: { type: 'number', minimum: 0, description: 'Deductions under this amount are written off rather than disputed (default 25)' },
    allowances: { type: 'object', additionalProperties: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 100 } }, description: 'Per retailer, the percent of the invoice you agreed for promo, damage or return allowances' },
  },
});

export function deductionClass(v) { const s = str(v).toLowerCase(); if (/short/.test(s)) return 'shortage'; if (/promo|mdf|allowance|advertis|co.?op/.test(s)) return 'promo'; if (/fine|compliance|chargeback|penalt|asn|label|routing|late/.test(s)) return 'compliance'; if (/damag|defect|spoil/.test(s)) return 'damage'; if (/pric/.test(s)) return 'pricing'; if (/return/.test(s)) return 'returns'; return 'other'; }

/** Statuses: dispute, review, write_off, window_closed, ok. */
export function checkDeductions(deds, invoices, pods = [], s = {}, { asOf } = {}) {
  const day = today(asOf); const win = s.dispute_window_days || {}; const small = s.write_off_under ?? 25; const allow = Object.fromEntries(Object.entries(s.allowances || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const inv = new Map(invoices.map((i) => [str(i.invoice_number), i])); const pod = new Map(pods.map((p) => [str(p.invoice_number), p]));
  const seen = new Set(); const items = [];
  for (const d of sortBy(deds.map((d) => ({ ...d, id: `${str(d.remit_id)}|${str(d.invoice_number)}|${deductionClass(d.deduction_type)}|${num(d.amount)}` })), (d) => `${isoDate(d.deduction_date)}|${d.id}`)) {
    const cls = deductionClass(d.deduction_type); const amt = round2(Math.abs(num(d.amount) || 0)); const dd = isoDate(d.deduction_date); const retailer = str(d.retailer);
    const by = dd ? addDays(dd, win[retailer] ?? win.default ?? 90) : null; const i = inv.get(str(d.invoice_number)); const p = pod.get(str(d.invoice_number)); const f = []; let status = 'ok';
    const dupKey = `${str(d.invoice_number)}|${cls}|${amt}`; let n = 1; while (seen.has(`${d.id}#${n}`)) n++; seen.add(`${d.id}#${n}`);
    if (n > 1 || seen.has(`dup:${dupKey}`)) { f.push(finding('duplicate_deduction', amt, `${retailer} took ${amt} for ${cls} on invoice ${d.invoice_number} more than once.`)); status = 'dispute'; }
    else if (!i) { f.push(finding('invoice_not_found', null, `Invoice ${d.invoice_number} is not in your invoices.`)); status = 'review'; }
    else if (cls === 'shortage') {
      const shipped = num(i.units_shipped); const got = p ? num(p.units_delivered) : null; const signed = p && String(p.signed).toLowerCase() === 'yes';
      if (p && signed && got !== null && shipped !== null && got >= shipped) { f.push(finding('shortage_with_pod', amt, `Shortage of ${amt} on invoice ${d.invoice_number}; your signed proof of delivery shows all ${shipped} unit(s) delivered.`)); status = 'dispute'; }
      else if (!p) { f.push(finding('shortage_no_pod', null, `Shortage of ${amt} on invoice ${d.invoice_number} and no proof of delivery on file. Get it from the carrier.`)); status = 'review'; }
      else f.push(finding('shortage_matches_pod', null, `Proof of delivery shows ${got} of ${shipped} unit(s); the shortage looks right.`));
    } else if (['promo', 'damage', 'returns'].includes(cls) && allow[retailer.toLowerCase()] && allow[retailer.toLowerCase()][cls] !== undefined) {
      const agreed = round2((num(i.amount) || 0) * allow[retailer.toLowerCase()][cls] / 100);
      if (amt > agreed + 0.01) { f.push(finding('allowance_above_agreed', amt - agreed, `${cls} deduction of ${amt} on invoice ${d.invoice_number}; you agreed ${allow[retailer.toLowerCase()][cls]}% (${agreed}).`)); status = 'dispute'; }
    } else if (cls === 'compliance') { f.push(finding('compliance_fine', null, `${str(d.deduction_type)} (${str(d.deduction_code)}) of ${amt}: check the ASN, labels and routing records before deciding.`)); status = 'review'; }
    else if (cls !== 'promo' && cls !== 'damage' && cls !== 'returns') { f.push(finding('needs_review', null, `${str(d.deduction_type)} of ${amt} on invoice ${d.invoice_number}.`)); status = 'review'; }
    seen.add(`dup:${dupKey}`);
    if (status !== 'ok' && status !== 'dispute' && amt < small && f.every((x) => x.code !== 'invoice_not_found')) status = 'write_off';
    if (status === 'dispute' && amt < small && f[0].code !== 'duplicate_deduction') status = 'write_off';
    if (['dispute', 'review'].includes(status) && by && by < day) { f.push(finding('window_closed', null, `The window to dispute closed on ${by}.`)); status = 'window_closed'; }
    if (status === 'ok' && !f.length && amt < small) status = 'write_off';
    items.push({ id: d.id + (n > 1 ? `#${n}` : ''), retailer, remit_id: str(d.remit_id), invoice_number: str(d.invoice_number), type: cls, code: str(d.deduction_code), amount: amt, date: dd, dispute_by: by, days_left: by ? daysBetween(day, by) : null, recover: status === 'dispute' ? round2(f.reduce((a, x) => a + (x.amount || 0), 0)) : 0, status, findings: f });
  }
  const sorted = sortBy(items);
  return { as_of: day, deductions: sorted.length, deducted: round2(sorted.reduce((a, i) => a + i.amount, 0)), to_dispute: round2(sorted.reduce((a, i) => a + i.recover, 0)), ...byStatus(sorted, ['dispute', 'review', 'write_off', 'window_closed', 'ok']), by_retailer: rollup(sorted, (i) => i.retailer, ['amount', 'recover']).map(({ key, ...v }) => ({ retailer: key, ...v })), by_type: rollup(sorted, (i) => i.type, ['amount', 'recover']).map(({ key, ...v }) => ({ type: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function disputeText(items, { retailer, from }) {
  const rows = items.filter((i) => i.status === 'dispute' && i.retailer.toLowerCase() === String(retailer).toLowerCase()); const total = round2(rows.reduce((a, i) => a + i.recover, 0));
  return { total, deductions: rows.map((i) => i.id), text: [`# Deduction dispute: ${rows[0] ? rows[0].retailer : retailer}`, '', `**To:** [TO CONFIRM ${rows[0] ? rows[0].retailer : retailer} deductions team or vendor portal]`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '', `We dispute the ${rows.length} deduction(s) below and ask for ${total} to be repaid.`, '', '| Remittance | Invoice | Type | Deducted | Dispute | Dispute by | Reason |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.remit_id} | ${i.invoice_number} | ${i.type} | ${i.amount} | ${i.recover} | ${i.dispute_by} | ${i.findings.map((x) => x.detail).join(' ')} |`), '', '[ATTACH signed proof of delivery and the promotion agreement where cited]'].join('\n') };
}
