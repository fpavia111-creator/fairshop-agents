// Shipping charged against label cost: pure functions over orders and label exports.
import { exportProfile, round2, str, num, isoDate, addDays, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const LABEL_PROFILES = Object.freeze([
  exportProfile('shipstation_shipments', { order_id: 'Order Number', label_date: ['Ship Date', 'Shipped Date'], carrier: ['Carrier', 'Provider'], service: ['Service', 'Requested Service'], label_cost: ['Shipping Cost', 'Shipment Cost', 'Label Cost'], tracking: 'Tracking Number', voided: ['Voided', 'Void'], refund_status: ['Void Status', 'Refund Status'] }),
  exportProfile('shippo_labels', { order_id: 'Order Number', label_date: ['Created', 'Date'], carrier: ['Provider', 'Carrier'], service: ['Service Level', 'Service'], label_cost: 'Rate Amount', tracking: 'Tracking Number', voided: { from: ['Status'], compute: (_r, get) => (/refund/i.test(String(get('Status') || '')) ? 'yes' : 'no') }, refund_status: ['Refund Status', 'Status'] }),
]);
export const ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Order Number', 'Name'], { required: true }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date' }),
  channel: t(['Channel', 'Source', 'Marketplace']),
  shipping_charged: t(['Shipping Charged', 'Shipping', 'Shipping Paid'], { type: 'money', required: true }),
  subtotal: t(['Subtotal', 'Items Total'], { type: 'money' }),
  ship_method: t(['Shipping Method', 'Ship Method', 'Requested Service']),
});
export const LABEL_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Order Number']),
  label_date: t(['Label Date', 'Ship Date', 'Created'], { type: 'date' }),
  carrier: t(['Carrier', 'Provider']),
  service: t(['Service', 'Service Level']),
  label_cost: t(['Label Cost', 'Shipping Cost', 'Postage', 'Rate Amount'], { type: 'money', required: true }),
  tracking: t(['Tracking', 'Tracking Number'], { required: true }),
  voided: t(['Voided', 'Void'], { type: 'bool' }),
  refund_status: t(['Refund Status', 'Void Status']),
});
export const SHIPPING_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    free_shipping_threshold: { type: 'number', minimum: 0, description: 'Order subtotal from which you ship free' },
    loss_tolerance: { type: 'number', minimum: 0, description: 'Labels may cost this much more than was charged before an order is listed (default 1.00)' },
    void_refund_days: { type: 'integer', minimum: 1, maximum: 120, description: 'Days to wait for a voided label to be refunded (default 30)' },
  },
});

/** Statuses: claim, review, ok. */
export function checkShipping(orders, labels, s = {}, { asOf } = {}) {
  const day = today(asOf); const tol = s.loss_tolerance ?? 1; const wait = s.void_refund_days ?? 30; const free = s.free_shipping_threshold;
  const byOrder = new Map(); const known = new Set(orders.map((o) => str(o.order_id).replace(/^#/, '')));
  for (const l of labels) { const k = str(l.order_id).replace(/^#/, ''); (byOrder.get(k) || byOrder.set(k, []).get(k)).push(l); }
  const items = [];
  for (const o of sortBy(orders.map((o) => ({ ...o, id: str(o.order_id).replace(/^#/, '') })))) {
    const ls = (byOrder.get(o.id) || []).filter((l) => String(l.voided).toLowerCase() !== 'yes').sort((a, b) => (str(a.tracking) < str(b.tracking) ? -1 : 1));
    const charged = round2(num(o.shipping_charged) || 0); const cost = round2(ls.reduce((a, l) => a + (num(l.label_cost) || 0), 0)); const sub = num(o.subtotal); const f = []; let status = 'ok';
    if (ls.length > 1) { const extra = round2(ls.slice(1).reduce((a, l) => a + (num(l.label_cost) || 0), 0)); f.push(finding('duplicate_label', extra, `Order ${o.id} has ${ls.length} labels (${ls.map((l) => str(l.tracking)).join(', ')}). If only one shipped, void and claim the rest.`)); status = 'claim'; }
    if (ls.length) {
      if (charged === 0 && free !== undefined && sub !== null && sub < free) { f.push(finding('free_below_threshold', f.length ? null : cost, `Order ${o.id} shipped free on a ${sub} subtotal, under your ${free} threshold; the label cost ${cost}.`)); if (status === 'ok') status = 'review'; }
      else if (cost - charged > tol && (charged > 0 || free === undefined || sub === null || sub < free)) { f.push(finding('label_over_charged', f.length ? null : cost - charged, `Order ${o.id} charged ${charged} for shipping and its label cost ${cost}.`)); if (status === 'ok') status = 'review'; }
    }
    items.push({ id: o.id, kind: 'order', order_id: o.id, channel: channelLabel(channelKey(o.channel)), charged, label_cost: cost, labels: ls.length, tracking: ls.map((l) => str(l.tracking)).join(' '), at_stake: round2(f.reduce((a, x) => a + (x.amount || 0), 0)), status, findings: f });
  }
  for (const l of sortBy(labels.map((l) => ({ ...l, id: `LABEL:${str(l.tracking)}` })))) {
    const k = str(l.order_id).replace(/^#/, ''); const c = round2(num(l.label_cost) || 0); const d = isoDate(l.label_date); const f = []; let status = null;
    if (String(l.voided).toLowerCase() === 'yes' && !/refund(ed)?$|credited|complete/i.test(str(l.refund_status)) && d && addDays(d, wait) < day) { f.push(finding('void_not_refunded', c, `Label ${l.tracking} (${c}) was voided on ${d} and is "${str(l.refund_status) || 'not refunded'}" after ${wait} days.`)); status = 'claim'; }
    else if (!known.has(k) && String(l.voided).toLowerCase() !== 'yes') { f.push(finding('label_no_order', c, `Label ${l.tracking} (${c}) names order ${k || '(none)'}, which is not in your orders.`)); status = 'review'; }
    if (status) items.push({ id: l.id, kind: 'label', order_id: k, channel: '', charged: 0, label_cost: c, labels: 1, tracking: str(l.tracking), at_stake: c, status, findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`); const os = sorted.filter((i) => i.kind === 'order');
  return { orders: os.length, charged: round2(os.reduce((a, i) => a + i.charged, 0)), label_cost: round2(os.reduce((a, i) => a + i.label_cost, 0)), to_claim: round2(sorted.filter((i) => i.status === 'claim').reduce((a, i) => a + i.at_stake, 0)), ...byStatus(sorted, ['claim', 'review', 'ok']), by_channel: rollup(os, (i) => i.channel || '(none)', ['charged', 'label_cost']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function refundText(items, { platform, from }) {
  const rows = items.filter((i) => i.status === 'claim'); const total = round2(rows.reduce((a, i) => a + i.at_stake, 0));
  return { total, labels: rows.map((i) => i.id), text: [`# Label refund request${platform ? `: ${platform}` : ''}`, '', `**To:** [TO CONFIRM ${platform || 'shipping platform'} support]`, `**From:** ${from || '[TO CONFIRM your name and store]'}`, '', `Please refund the ${rows.length} label(s) below, ${total} in total.`, '', '| Item | Order | Tracking | Amount | Reason |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.id} | ${i.order_id} | ${i.tracking} | ${i.at_stake} | ${i.findings.filter((f) => f.amount).map((f) => f.detail).join(' ')} |`), '', '[CHECK that the duplicate labels were not used before asking]'].join('\n') };
}
