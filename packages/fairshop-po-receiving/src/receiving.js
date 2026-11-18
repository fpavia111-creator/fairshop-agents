// Three-way match: purchase orders, receipts and supplier invoices.
import { round2, str, num, isoDate, addDays, daysBetween, skuKey, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PO_FIELDS = Object.freeze({
  po: t(['PO', 'PO Number', 'Purchase Order'], { required: true }),
  vendor: t(['Vendor', 'Supplier']),
  sku: t(['SKU', 'Item', 'Item SKU'], { required: true }),
  qty_ordered: t(['Qty Ordered', 'Ordered', 'Quantity'], { type: 'number', required: true }),
  unit_cost: t(['Unit Cost', 'Cost', 'PO Price'], { type: 'money' }),
  promised_date: t(['Promised Date', 'Expected Date', 'Due Date', 'ETA'], { type: 'date' }),
});
export const RECEIPT_FIELDS = Object.freeze({ po: t(['PO', 'PO Number'], { required: true }), sku: t(['SKU', 'Item'], { required: true }), qty_received: t(['Qty Received', 'Received', 'Quantity'], { type: 'number', required: true }), received_date: t(['Received Date', 'Date', 'Receipt Date'], { type: 'date' }) });
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice', 'Invoice Number', 'Bill Number'], { required: true }),
  vendor: t(['Vendor', 'Supplier']),
  po: t(['PO', 'PO Number'], { required: true }),
  sku: t(['SKU', 'Item'], { required: true }),
  qty_billed: t(['Qty Billed', 'Quantity', 'Billed'], { type: 'number', required: true }),
  unit_price: t(['Unit Price', 'Price', 'Rate'], { type: 'money', required: true }),
  invoice_date: t(['Invoice Date', 'Date'], { type: 'date' }),
});
export const RECEIVING_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    price_tolerance_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Invoice prices this far above the PO are rounding (default 1)' },
    over_receipt_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Receipts this far above the order are accepted (default 5)' },
    late_grace_days: { type: 'integer', minimum: 0, maximum: 60, description: 'Days after the promised date before a delivery is late (default 3)' },
  },
});

/** Statuses: dispute, chase, review, ok. One item per PO and SKU. */
export function matchPOs(pos, receipts, invoices, s = {}, { asOf } = {}) {
  const day = today(asOf); const ptol = s.price_tolerance_pct ?? 1; const over = s.over_receipt_pct ?? 5; const grace = s.late_grace_days ?? 3;
  const key = (p, k) => `${str(p).toUpperCase()}|${skuKey(k)}`;
  const lines = new Map(); const get = (k) => lines.get(k) || lines.set(k, { po: null, rec: [], inv: [] }).get(k);
  for (const p of pos) get(key(p.po, p.sku)).po = p; for (const r of receipts) get(key(r.po, r.sku)).rec.push(r); for (const i of invoices) get(key(i.po, i.sku)).inv.push(i);
  const items = [];
  for (const [k, v] of [...lines.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [po, sku] = k.split('|'); const f = []; let status = 'ok'; const rank = { dispute: 4, chase: 3, review: 2, ok: 1 }; const set = (x) => { if (rank[x] > rank[status]) status = x; };
    const ordered = v.po ? num(v.po.qty_ordered) || 0 : 0; const cost = v.po ? num(v.po.unit_cost) : null; const promised = v.po ? isoDate(v.po.promised_date) : null;
    const received = v.rec.reduce((a, r) => a + (num(r.qty_received) || 0), 0); const firstRec = v.rec.map((r) => isoDate(r.received_date)).filter(Boolean).sort()[0] || null;
    if (!v.po) { f.push(finding('billed_no_po', round2(v.inv.reduce((a, i) => a + (num(i.qty_billed) || 0) * (num(i.unit_price) || 0), 0)), `Invoice line(s) for ${sku} on ${po}, which is not one of your POs.`)); f[0].amount = null; set('review'); }
    else {
      const due = promised ? addDays(promised, grace) : null;
      if (!v.rec.length) { if (due && due < day) { f.push(finding('open_past_due', null, `Nothing received on ${po} for ${sku}; it was promised for ${promised}.`)); set('chase'); } }
      else {
        if (received < ordered && due && due < day) { f.push(finding('short_shipped', null, `${received} of ${ordered} ${sku} received on ${po}.`)); set('review'); }
        if (received > ordered * (1 + over / 100)) { f.push(finding('over_received', null, `${received} ${sku} received on ${po} against ${ordered} ordered.`)); set('review'); }
        if (firstRec && due && firstRec > due) { f.push(finding('late_delivery', null, `${po} ${sku} arrived ${firstRec}, ${daysBetween(promised, firstRec)} day(s) after ${promised}.`)); set('review'); }
      }
      let billed = 0; const seenQty = [];
      for (const i of v.inv.slice().sort((a, b) => (`${isoDate(a.invoice_date)}|${str(a.invoice_number)}` < `${isoDate(b.invoice_date)}|${str(b.invoice_number)}` ? -1 : 1))) {
        const q = num(i.qty_billed) || 0; const p = num(i.unit_price) || 0; const prevBilled = billed; billed += q;
        if (seenQty.includes(q) && billed > received) { f.push(finding('duplicate_invoice', q * p, `Invoice ${i.invoice_number} bills ${q} ${sku} on ${po} again.`)); set('dispute'); }
        else if (billed > received) { f.push(finding('billed_not_received', (billed - Math.max(received, prevBilled)) * p, `${billed} ${sku} billed on ${po} up to invoice ${i.invoice_number}; ${received} received.`)); set('dispute'); }
        if (cost !== null && p > cost * (1 + ptol / 100)) { f.push(finding('price_variance', (p - cost) * q, `Invoice ${i.invoice_number} bills ${sku} at ${p}; the PO says ${cost}.`)); set('dispute'); }
        seenQty.push(q);
      }
    }
    const claim = round2(f.reduce((a, x) => a + (x.amount || 0), 0));
    items.push({ id: k, po, sku, vendor: str((v.po || v.inv[0] || {}).vendor), ordered, received, billed: v.inv.reduce((a, i) => a + (num(i.qty_billed) || 0), 0), promised_date: promised, first_received: firstRec, claim, status, findings: f });
  }
  const sorted = sortBy(items);
  return { as_of: day, lines: sorted.length, to_claim: round2(sorted.reduce((a, i) => a + i.claim, 0)), ...byStatus(sorted, ['dispute', 'chase', 'review', 'ok']), by_vendor: rollup(sorted, (i) => i.vendor || '(none)', ['claim']).map(({ key, ...v }) => ({ vendor: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function claimText(items, { vendor, from }) {
  const rows = items.filter((i) => i.claim > 0 && (!vendor || i.vendor.toLowerCase() === String(vendor).toLowerCase())); const total = round2(rows.reduce((a, i) => a + i.claim, 0));
  return { total, lines: rows.map((i) => i.id), text: [`# Supplier claim${vendor ? `: ${vendor}` : ''}`, '', `**To:** [TO CONFIRM ${vendor || 'supplier'} accounts receivable]`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '', `Please issue a credit note for ${total}, or explain the lines below.`, '', '| PO | SKU | Ordered | Received | Billed | Credit | Detail |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.po} | ${i.sku} | ${i.ordered} | ${i.received} | ${i.billed} | ${i.claim} | ${i.findings.filter((x) => x.amount).map((x) => x.detail).join(' ')} |`), '', `**Credit requested:** ${total}`].join('\n') };
}
