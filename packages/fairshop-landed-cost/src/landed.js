// Landed cost: import costs spread over each shipment's SKUs by weight or value.
import { round2, str, num, skuKey, finding, byFinding, byStatus, sortBy, pct } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const LINE_FIELDS = Object.freeze({
  shipment_id: t(['Shipment', 'Shipment ID', 'Container', 'Entry'], { required: true }),
  po: t(['PO', 'PO Number']),
  sku: t(['SKU', 'Item'], { required: true }),
  qty: t(['Quantity', 'Qty', 'Units'], { type: 'number', required: true }),
  unit_cost: t(['Unit Cost', 'FOB', 'Price'], { type: 'money', required: true }),
  unit_weight: t(['Unit Weight', 'Weight per Unit'], { type: 'number', unit: false }),
});
export const COST_FIELDS = Object.freeze({ shipment_id: t(['Shipment', 'Shipment ID', 'Container', 'Entry'], { required: true }), cost_type: t(['Cost Type', 'Type', 'Charge'], { required: true }), amount: t(['Amount', 'Cost', 'Total'], { type: 'money', required: true }) });
export const RECORDED_FIELDS = Object.freeze({ sku: t(['SKU', 'Variant SKU'], { required: true }), recorded_cost: t(['Recorded Cost', 'Cost per item', 'Unit Cost', 'Cost'], { type: 'money', required: true }) });
export const LANDED_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    basis: { type: 'object', additionalProperties: { type: 'string', enum: ['weight', 'value', 'units'] }, description: 'How each cost type is spread: by weight, value or units, with "default" (default: freight and drayage by weight, the rest by value)' },
    variance_pct: { type: 'number', minimum: 0, maximum: 100, description: 'A recorded cost this many percent off the landed cost is listed (default 5)' },
  },
});

const DEFAULT_BASIS = { freight: 'weight', drayage: 'weight', default: 'value' };
const typeKey = (v) => str(v).toLowerCase().replace(/[^a-z]+/g, ' ').trim();

/** Statuses: review, ok. Items: one per SKU, plus shipments with no costs and costs with no shipment. */
export function landedCost(lines, costs, recorded = [], s = {}) {
  const basis = { ...DEFAULT_BASIS, ...Object.fromEntries(Object.entries(s.basis || {}).map(([k, v]) => [typeKey(k), v])) }; const vpct = s.variance_pct ?? 5;
  const ships = new Map(); for (const l of lines) { const k = str(l.shipment_id); (ships.get(k) || ships.set(k, []).get(k)).push({ sku: skuKey(l.sku), qty: num(l.qty) || 0, cost: num(l.unit_cost) || 0, w: num(l.unit_weight) }); }
  const cs = new Map(); for (const c of costs) { const k = str(c.shipment_id); (cs.get(k) || cs.set(k, []).get(k)).push({ type: typeKey(c.cost_type), amount: round2(num(c.amount) || 0) }); }
  const bySku = new Map(); const items = []; let allocated = 0;
  for (const [sid, ls] of [...ships.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const extra = ls.map(() => 0); const shipCosts = cs.get(sid) || []; const fallback = [];
    for (const c of shipCosts) {
      let how = basis[c.type] || basis.default || 'value'; const w = (l) => (how === 'weight' ? (l.w || 0) * l.qty : how === 'units' ? l.qty : l.cost * l.qty);
      let total = ls.reduce((a, l) => a + w(l), 0); if (!total) { fallback.push(c.type); how = 'value'; total = ls.reduce((a, l) => a + l.cost * l.qty, 0); }
      const shares = ls.map((l) => (total ? (how === 'weight' ? (l.w || 0) * l.qty : how === 'units' ? l.qty : l.cost * l.qty) / total : 0));
      shares.forEach((sh, i) => { extra[i] += c.amount * sh; }); allocated = round2(allocated + c.amount);
    }
    if (!shipCosts.length) items.push({ id: `SHIP:${sid}`, kind: 'shipment', sku: '', units: ls.reduce((a, l) => a + l.qty, 0), unit_cost: null, landed_unit: null, recorded: null, variance_pct: null, extra: 0, status: 'review', findings: [finding('costs_missing', null, `Shipment ${sid} has no freight, duty or other costs in the costs file; its SKUs are at purchase cost only.`)] });
    ls.forEach((l, i) => { const x = bySku.get(l.sku) || { qty: 0, base: 0, extra: 0, shipments: [] }; x.qty += l.qty; x.base += l.cost * l.qty; x.extra += extra[i]; x.shipments.push(sid); bySku.set(l.sku, x); });
    if (fallback.length) items.push({ id: `SHIP:${sid}:basis`, kind: 'shipment', sku: '', units: 0, unit_cost: null, landed_unit: null, recorded: null, variance_pct: null, extra: 0, status: 'review', findings: [finding('basis_fallback', null, `Shipment ${sid}: no unit weights, so ${[...new Set(fallback)].join(', ')} was spread by value.`)] });
  }
  for (const [sid, c] of [...cs.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) if (!ships.has(sid)) items.push({ id: `SHIP:${sid}`, kind: 'shipment', sku: '', units: 0, unit_cost: null, landed_unit: null, recorded: null, variance_pct: null, extra: round2(c.reduce((a, x) => a + x.amount, 0)), status: 'review', findings: [finding('costs_no_shipment', round2(c.reduce((a, x) => a + x.amount, 0)), `${c.length} cost line(s) for shipment ${sid}, which is not in the lines file.`)] });
  const rec = new Map(recorded.map((r) => [skuKey(r.sku), num(r.recorded_cost)]));
  for (const [sku, x] of [...bySku.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const unit = x.qty ? round2(x.base / x.qty) : null; const landed = x.qty ? round2((x.base + x.extra) / x.qty) : null; const r = rec.has(sku) ? rec.get(sku) : null; const v = r !== null && landed ? pct(r - landed, landed) : null; const f = [];
    if (r !== null && v !== null && Math.abs(v) > vpct) f.push(finding(r < landed ? 'recorded_cost_low' : 'recorded_cost_high', round2(Math.abs(landed - r) * x.qty), `${sku}: recorded at ${r}, landed cost ${landed} (${v}%) over ${x.qty} unit(s) in ${[...new Set(x.shipments)].join(', ')}.`));
    items.push({ id: `SKU:${sku}`, kind: 'sku', sku, units: x.qty, unit_cost: unit, landed_unit: landed, recorded: r, variance_pct: v, extra: round2(x.extra), status: f.length ? 'review' : 'ok', findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  return { shipments: ships.size, skus: bySku.size, allocated, unallocated: round2(sorted.filter((i) => i.findings.some((f) => f.code === 'costs_no_shipment')).reduce((a, i) => a + i.extra, 0)), ...byStatus(sorted, ['review', 'ok']), by_shipment: [...ships.keys()].sort().map((sid) => ({ shipment: sid, lines: ships.get(sid).length, costs: round2((cs.get(sid) || []).reduce((a, x) => a + x.amount, 0)) })), by_finding: byFinding(sorted), items: sorted };
}

export function updatesText(items) {
  const rows = items.filter((i) => i.kind === 'sku' && i.findings.length);
  return { skus: rows.map((i) => i.sku), text: ['# Unit cost updates', '', '**For:** [TO CONFIRM the person who keeps item costs]', '', '| SKU | Recorded | Landed | Difference % | Set to |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.sku} | ${i.recorded} | ${i.landed_unit} | ${i.variance_pct} | [CHECK ${i.landed_unit} or a blended cost with stock on hand] |`)].join('\n') };
}
