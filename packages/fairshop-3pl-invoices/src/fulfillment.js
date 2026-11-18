// 3PL invoice audit against the rate card, shipped orders, receipts and pallet counts.
import { exportProfile, round2, str, num, isoDate, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const INVOICE_PROFILES = Object.freeze([exportProfile('three_pl_invoice', { invoice_number: 'Invoice Number', date: ['Invoice Date', 'Date'], charge_type: ['Charge Type', 'Fee Type', 'Activity'], reference: ['Reference', 'Order Number', 'ASN'], qty: ['Quantity', 'Units'], rate: ['Rate', 'Unit Price'], amount: ['Amount', 'Extended Amount'] })]);
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice Number', 'Invoice']),
  date: t(['Date', 'Invoice Date'], { type: 'date' }),
  charge_type: t(['Charge Type', 'Fee Type', 'Activity', 'Description'], { required: true }),
  reference: t(['Reference', 'Order', 'Order Number', 'ASN', 'Period']),
  qty: t(['Quantity', 'Qty', 'Units'], { type: 'number' }),
  rate: t(['Rate', 'Unit Price', 'Unit Rate'], { type: 'money' }),
  amount: t(['Amount', 'Extended Amount', 'Total'], { type: 'money', required: true }),
});
export const SHIPPED_FIELDS = Object.freeze({ order_id: t(['Order', 'Order ID', 'Order Number'], { required: true }), units: t(['Units', 'Quantity', 'Items'], { type: 'number' }) });
export const RECEIPT_FIELDS = Object.freeze({ reference: t(['ASN', 'Reference', 'PO'], { required: true }), units_received: t(['Units Received', 'Received', 'Quantity'], { type: 'number', required: true }) });
export const PALLET_FIELDS = Object.freeze({ period: t(['Period', 'Month'], { required: true }), pallets: t(['Pallets', 'Pallet Count', 'Counted Pallets'], { type: 'number', required: true }) });
export const RATECARD_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['rates'],
  properties: {
    note: { type: 'string' },
    rates: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Rate per unit from your 3PL agreement: pick_first, pick_additional, receiving_per_unit, storage_per_pallet, and any other charge key (packaging_mailer, ...)' },
    aliases: { type: 'object', additionalProperties: { type: 'string' }, description: 'Charge wording on the invoice → rate key ("Pick and pack" → "pick")' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.02)' },
  },
});

// Packaging words first: "Packaging mailer" is not a pick.
const WORDS = [[/mailer/, 'packaging_mailer'], [/box/, 'packaging_box'], [/pick|pack|fulfil/, 'pick'], [/receiv|inbound|putaway/, 'receiving'], [/storage|pallet/, 'storage'], [/kit/, 'kitting'], [/return/, 'returns']];
export function chargeKey(text, aliases = {}) { const s = str(text); for (const [k, v] of Object.entries(aliases)) if (k.toLowerCase() === s.toLowerCase()) return v; const low = s.toLowerCase(); for (const [re, k] of WORDS) if (re.test(low)) return k; return low; }

/** Statuses: dispute, review, ok. */
export function auditInvoice(lines, card, { shipped = [], receipts = [], pallets = [] } = {}) {
  const r = card.rates || {}; const tol = card.tolerance ?? 0.02;
  const units = new Map(shipped.map((o) => [str(o.order_id).replace(/^#/, ''), num(o.units) || 1])); const rec = new Map(); for (const x of receipts) rec.set(str(x.reference), (rec.get(str(x.reference)) || 0) + (num(x.units_received) || 0)); const pal = new Map(pallets.map((p) => [str(p.period), num(p.pallets)]));
  const rows = sortBy(lines.map((l, i) => ({ key: chargeKey(l.charge_type, card.aliases), type: str(l.charge_type), ref: str(l.reference).replace(/^#/, ''), qty: num(l.qty) ?? 1, rate: num(l.rate), amount: round2(num(l.amount) || 0), inv: str(l.invoice_number), date: isoDate(l.date), i })).map((x) => ({ ...x, id: `${x.inv}|${x.type}|${x.ref}|${x.amount}|${x.qty}` })));
  const seen = new Map(); const items = [];
  for (const x of rows) {
    const n = (seen.get(`${x.key}|${x.ref}`) || 0) + 1; seen.set(`${x.key}|${x.ref}`, n); const f = []; let expected = null;
    const add = (code, amount, detail) => f.push(finding(code, f.some((y) => y.amount) ? null : amount, detail));
    if (x.key === 'pick') {
      if (n > 1 && x.ref) add('duplicate_order_charge', x.amount, `Order ${x.ref} is charged for picking ${n} times.`);
      else if (shipped.length && x.ref && !units.has(x.ref)) add('order_not_shipped', x.amount, `Order ${x.ref} is not in your shipped orders.`);
      else if (r.pick_first !== undefined) { const u = units.get(x.ref) ?? x.qty; expected = round2(r.pick_first + (r.pick_additional || 0) * Math.max(0, u - 1)); if (x.amount > expected + tol) add('rate_above_card', x.amount - expected, `Picking ${u} unit(s) on order ${x.ref} costs ${expected} on your card; billed ${x.amount}.`); }
    } else if (x.key === 'receiving' && r.receiving_per_unit !== undefined) {
      expected = round2(x.qty * r.receiving_per_unit); const got = rec.get(x.ref);
      if (got !== undefined && x.qty > got) add('receiving_units_over', (x.qty - got) * (x.rate ?? r.receiving_per_unit), `${x.qty} unit(s) billed as received on ${x.ref}; your receipts show ${got}.`);
      if (x.amount > expected + tol) add('rate_above_card', x.amount - expected, `Receiving ${x.qty} unit(s) costs ${expected} on your card; billed ${x.amount}.`);
    } else if (x.key === 'storage' && r.storage_per_pallet !== undefined) {
      expected = round2(x.qty * r.storage_per_pallet); const counted = pal.get(x.ref);
      if (counted !== undefined && counted !== null && x.qty > counted) add('storage_pallets_over', (x.qty - counted) * (x.rate ?? r.storage_per_pallet), `${x.qty} pallet(s) billed for ${x.ref}; you counted ${counted}.`);
      if (x.amount > expected + tol) add('rate_above_card', x.amount - expected, `${x.qty} pallet(s) cost ${expected} on your card; billed ${x.amount}.`);
    } else if (r[x.key] !== undefined) { expected = round2(x.qty * r[x.key]); if (x.amount > expected + tol) add('rate_above_card', x.amount - expected, `${x.type}: ${x.qty} × ${r[x.key]} is ${expected} on your card; billed ${x.amount}.`); }
    else add('not_on_rate_card', null, `"${x.type}" (${x.amount}) is not on your rate card. Ask what it is for.`);
    const over = round2(f.reduce((a, y) => a + (y.amount || 0), 0));
    items.push({ id: x.id, invoice_number: x.inv, date: x.date, charge_type: x.type, charge_key: x.key, reference: x.ref, qty: x.qty, amount: x.amount, expected, over, status: over > 0 ? 'dispute' : f.length ? 'review' : 'ok', findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.charge_key}|${i.id}`);
  return { lines: sorted.length, billed: round2(sorted.reduce((a, i) => a + i.amount, 0)), to_dispute: round2(sorted.reduce((a, i) => a + i.over, 0)), ...byStatus(sorted, ['dispute', 'review', 'ok']), by_fee_type: rollup(sorted, (i) => i.charge_key, ['amount', 'over']).map(({ key, ...v }) => ({ fee_type: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function disputeText(r, { provider, from }) {
  const rows = r.items.filter((i) => i.status !== 'ok');
  return { total: r.to_dispute, lines: rows.map((i) => i.id), text: [`# Invoice review${provider ? `: ${provider}` : ''}`, '', `**To:** [TO CONFIRM ${provider || '3PL'} account manager]`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '', `We checked the invoice against our rate card, shipped orders, receipts and pallet counts. Please credit ${r.to_dispute} and explain the charges marked "question".`, '', '| Invoice | Charge | Reference | Billed | Card | Credit | Detail |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.invoice_number} | ${i.charge_type} | ${i.reference} | ${i.amount} | ${i.expected ?? ''} | ${i.over || 'question'} | ${i.findings.map((f) => f.detail).join(' ')} |`), '', `**Credit requested:** ${r.to_dispute}`].join('\n') };
}
