// Marketplace claims: A-to-z, eBay, Walmart and Etsy cases against shipment and delivery records.
import { exportProfile, round2, str, num, isoDate, addDays, daysBetween, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup, today } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CLAIM_PROFILES = Object.freeze([
  exportProfile('amazon_az_claims', { claim_id: 'Claim ID', channel: { value: 'Amazon' }, order_id: 'Order ID', opened_at: ['Claim Date', 'Date'], reason: 'Claim Reason', amount: 'Claim Amount', status: ['Claim Status', 'Status'], respond_by: ['Respond By', 'Response Due'], buyer_name: ['Buyer Name', 'Buyer'] }),
]);
export const CLAIM_FIELDS = Object.freeze({
  claim_id: t(['Claim ID', 'Case ID', 'Case Number', 'Dispute ID'], { required: true }),
  channel: t(['Channel', 'Marketplace']),
  order_id: t(['Order ID', 'Order', 'Order Number']),
  opened_at: t(['Opened', 'Opened At', 'Claim Date', 'Date Opened', 'Created'], { type: 'date' }),
  reason: t(['Reason', 'Claim Reason', 'Case Reason']),
  amount: t(['Amount', 'Claim Amount', 'Amount Requested'], { type: 'money' }),
  status: t(['Status', 'Claim Status', 'Case Status']),
  respond_by: t(['Respond By', 'Response Due', 'Due Date'], { type: 'date' }),
  buyer_name: t(['Buyer Name', 'Buyer', 'Customer Name'], { pii: 'name' }),
  buyer_email: t(['Buyer Email', 'Customer Email', 'Email'], { pii: 'email' }),
});
export const SHIPMENT_FIELDS = Object.freeze({
  order_id: t(['Order ID', 'Order', 'Order Number'], { required: true }),
  carrier: t(['Carrier', 'Provider']),
  tracking: t(['Tracking', 'Tracking Number', 'Tracking ID']),
  ship_date: t(['Ship Date', 'Shipped', 'Shipped At'], { type: 'date' }),
  delivered_date: t(['Delivered', 'Delivered Date', 'Delivery Date'], { type: 'date' }),
  signature: t(['Signature', 'Signed', 'Signature Confirmation'], { type: 'bool' }),
});
export const CLAIM_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    respond_days: { type: 'object', additionalProperties: { type: 'integer', minimum: 0, maximum: 60 }, description: 'Days to respond per channel when the export has no respond-by date ("default" for the rest; default 3)' },
    signature_over: { type: 'number', minimum: 0, description: 'Order amount from which you treat a signature as needed for a delivery defence (your own rule)' },
  },
});

const CLOSED = /closed|resolved|won|lost|granted|denied|withdrawn|cancel/i;
export function reasonClass(r) { const s = str(r).toLowerCase(); if (/not received|didn.?t receive|never arrived|inr|non.?receipt|lost in transit/.test(s)) return 'not_received'; if (/not as described|snad|damaged|defective|wrong item|broken|different/.test(s)) return 'not_as_described'; return 'other'; }

/** Statuses: respond, overdue, closed. Advice: defend, weak, gather_evidence, refund_likely. */
export function reviewClaims(claims, shipments, settings = {}, { asOf } = {}) {
  const day = today(asOf); const rd = settings.respond_days || {}; const sig = settings.signature_over ?? null;
  const ship = new Map(); for (const s of shipments) ship.set(str(s.order_id), s);
  const items = [];
  for (const c of sortBy(claims.map((c) => ({ ...c, id: str(c.claim_id) })))) {
    const ch = channelKey(c.channel) || 'unknown'; const opened = isoDate(c.opened_at); const amount = round2(num(c.amount) || 0);
    const by = isoDate(c.respond_by) || (opened ? addDays(opened, rd[ch] ?? rd.default ?? 3) : null);
    const s = ship.get(str(c.order_id)) || null; const cls = reasonClass(c.reason);
    const delivered = s && isoDate(s.delivered_date); const signed = s && String(s.signature).toLowerCase() === 'yes';
    const f = []; let advice; const needed = []; const onFile = [];
    if (cls === 'not_received') {
      needed.push('tracking', 'delivery scan'); if (sig !== null && amount >= sig) needed.push('signature');
      if (s && str(s.tracking)) onFile.push('tracking'); if (delivered) onFile.push('delivery scan'); if (signed) onFile.push('signature');
      if (!s || !str(s.tracking)) { f.push(finding('no_tracking', amount, `No tracking on file for order ${c.order_id}; a not-received claim is hard to defend.`)); advice = 'refund_likely'; }
      else if (!delivered || (opened && delivered > opened)) { f.push(finding('not_delivered', amount, `Tracking ${s.tracking} shows no delivery before the claim was opened.`)); advice = 'refund_likely'; }
      else if (sig !== null && amount >= sig && !signed) { f.push(finding('no_signature_over_threshold', amount, `Delivered ${delivered} by ${s.carrier || 'the carrier'}, but the order is ${amount} and has no signature (your rule: ${sig} and over).`)); advice = 'weak'; }
      else { f.push(finding('delivered_with_proof', null, `Delivered ${delivered} (${s.carrier || 'carrier'} ${s.tracking}) before the claim was opened ${opened}.`)); advice = 'defend'; }
    } else {
      needed.push('listing photos', 'messages', 'photos of the item sent'); if (s && str(s.tracking)) onFile.push('tracking');
      f.push(finding('evidence_needed', null, `"${str(c.reason)}": attach the listing as it was, your messages with the buyer and photos of what was sent.`)); advice = 'gather_evidence';
    }
    let status = CLOSED.test(str(c.status)) ? 'closed' : by && by < day ? 'overdue' : 'respond';
    if (status === 'overdue') f.push(finding('late_response', null, `The respond-by date ${by} has passed.`));
    if (status === 'closed') { f.length = 0; advice = 'none'; }
    items.push({ id: c.id, channel: channelLabel(ch), channel_key: ch, order_id: str(c.order_id), buyer_name: str(c.buyer_name), buyer_email: str(c.buyer_email), reason: str(c.reason), reason_class: cls, opened, respond_by: by, days_left: by ? daysBetween(day, by) : null, amount, carrier: s ? str(s.carrier) : '', tracking: s ? str(s.tracking) : '', delivered: delivered || null, signature: !!signed, advice, readiness_pct: needed.length ? Math.round((onFile.filter((x) => needed.includes(x)).length / needed.length) * 100) : null, still_needed: needed.filter((x) => !onFile.includes(x)), status, findings: f });
  }
  const sorted = sortBy(items, (i) => `${i.respond_by || '9999'}|${i.id}`);
  const open = sorted.filter((i) => i.status !== 'closed');
  return { as_of: day, claims: sorted.length, at_stake: round2(open.reduce((s, i) => s + i.amount, 0)), ...byStatus(sorted, ['respond', 'overdue', 'closed']), urgent: open.filter((i) => i.status === 'respond' && i.days_left !== null && i.days_left <= 1).map((i) => i.id), by_advice: Object.fromEntries(['defend', 'weak', 'gather_evidence', 'refund_likely'].map((a) => [a, open.filter((i) => i.advice === a).length])), by_channel: rollup(open, (i) => i.channel, ['amount']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function responseText(i, { from }) {
  return [
    `# Claim response: ${i.channel} ${i.id}`, '', `**To:** [TO CONFIRM ${i.channel} claim page for ${i.id}]`, `**From:** ${from || '[TO CONFIRM your name and store]'}`, `**Order:** ${i.order_id}`, `**Respond by:** ${i.respond_by || '[CHECK respond-by date]'}`, '',
    i.advice === 'defend' ? `The order was delivered on ${i.delivered} before the claim was opened. Carrier: ${i.carrier}. Tracking: ${i.tracking}.`
      : i.advice === 'weak' ? `The order was delivered on ${i.delivered} (carrier ${i.carrier}, tracking ${i.tracking}). [CHECK whether to defend without a signature or refund]`
        : i.advice === 'gather_evidence' ? `About "${i.reason}": the item matched the listing when it was sent. [ATTACH listing as it was on the order date] [ATTACH photos of the item sent] [ATTACH messages with the buyer]`
          : `We could not confirm delivery for this order. [CHECK whether to refund or reship before the respond-by date]`,
    '', ...i.findings.map((f) => `- ${f.detail}`),
  ].join('\n');
}
