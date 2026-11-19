// Affiliate commissions: pure functions over a network statement, orders and the seller's terms.
import { exportProfile, round2, str, num, isoDate, emailKey, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const COMMISSION_PROFILES = Object.freeze([
  exportProfile('affiliate_actions', { action_id: ['Action Id', 'Transaction ID', 'Trans ID'], affiliate: ['Partner', 'Affiliate', 'Publisher'], order_id: ['Order Id', 'Order ID', 'OID'], order_date: ['Action Date', 'Event Date', 'Date'], sale_amount: ['Sale Amount', 'Order Amount'], commission: ['Payout', 'Commission'], status: ['State', 'Status'] }),
]);
export const COMMISSION_FIELDS = Object.freeze({
  action_id: t(['Action ID', 'Transaction ID', 'Commission ID'], { required: true }),
  affiliate: t(['Affiliate', 'Partner', 'Publisher'], { pii: 'partner' }),
  order_id: t(['Order ID', 'Order', 'OID']),
  order_date: t(['Order Date', 'Action Date', 'Date'], { type: 'date' }),
  sale_amount: t(['Sale Amount', 'Order Amount', 'Sale'], { type: 'money' }),
  commission: t(['Commission', 'Payout', 'Amount'], { type: 'money', required: true }),
  status: t(['Status', 'State']),
  affiliate_email: t(['Affiliate Email', 'Partner Email'], { pii: 'email' }),
});
export const ORDER_FIELDS = Object.freeze({
  order_id: t(['Order ID', 'Order', 'Name'], { required: true }),
  total: t(['Total', 'Subtotal', 'Order Total'], { type: 'money' }),
  status: t(['Status', 'Financial Status', 'Order Status']),
  refunded: t(['Refunded', 'Refunded Amount'], { type: 'money' }),
  customer_email: t(['Customer Email', 'Email'], { pii: 'email' }),
});
export const AFFILIATE_TERMS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    default_rate_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Commission percent in your program terms' },
    rates: { type: 'object', additionalProperties: { type: 'number', minimum: 0, maximum: 100 }, description: 'Commission percent per affiliate, where it differs' },
    tolerance: { type: 'number', minimum: 0, description: 'Differences up to this amount are rounding (default 0.02)' },
  },
});

/** Statuses: reverse (not yet paid), clawback (already paid), review, ok. */
export function checkCommissions(rows, orders, terms = {}) {
  const tol = terms.tolerance ?? 0.02; const rates = Object.fromEntries(Object.entries(terms.rates || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const ord = new Map(orders.map((o) => [str(o.order_id).replace(/^#/, ''), o])); const seenOrder = new Map(); const items = [];
  for (const c of sortBy(rows.map((r) => ({ ...r, id: str(r.action_id) })), (r) => `${isoDate(r.order_date)}|${r.id}`)) {
    const oid = str(c.order_id).replace(/^#/, ''); const o = ord.get(oid); const com = round2(Math.abs(num(c.commission) || 0)); const sale = num(c.sale_amount); const paid = /paid|locked|closed/i.test(str(c.status));
    const rate = rates[str(c.affiliate).toLowerCase()] ?? terms.default_rate_pct; const f = [];
    const add = (code, amount, detail) => f.push(finding(code, f.some((x) => x.amount) ? null : amount, detail));
    if (!o) add('order_not_found', com, `Order ${oid || '(none)'} is not in your orders.`);
    else {
      const total = round2(num(o.total) || 0); const refunded = round2(Math.abs(num(o.refunded) || 0)); const net = round2(Math.max(0, total - refunded));
      const dead = /cancel|void|refunded$/i.test(str(o.status).trim()) && !/partial/i.test(str(o.status));
      if (seenOrder.has(oid)) add('duplicate_commission', com, `Order ${oid} already earned commission on ${seenOrder.get(oid)}.`);
      else if (dead || net <= tol) add('commission_on_refunded', com, `Order ${oid} was ${str(o.status) || 'refunded'}; no commission is due.`);
      else if (rate !== undefined) {
        const due = round2(net * rate / 100);
        if (com > due + tol) add(sale !== null && sale > total + tol ? 'sale_above_order' : refunded ? 'commission_on_refunded' : 'rate_above_terms', com - due, `Commission ${com} on order ${oid}; ${rate}% of ${net}${refunded ? ` (after ${refunded} refunded)` : ''}${sale !== null && sale > total + tol ? ` (statement says a sale of ${sale}, the order was ${total})` : ''} is ${due}.`);
      }
      if (str(c.affiliate_email) && emailKey(c.affiliate_email) === emailKey(o.customer_email)) f.push(finding('self_referral', null, `The affiliate's own e-mail placed order ${oid}. Check your program terms on own purchases.`));
      if (!seenOrder.has(oid)) seenOrder.set(oid, c.id);
    }
    const back = round2(f.reduce((s, x) => s + (x.amount || 0), 0));
    items.push({ id: c.id, affiliate: str(c.affiliate), order_id: oid, order_date: isoDate(c.order_date), sale_amount: sale, commission: com, commission_status: str(c.status), affiliate_email: str(c.affiliate_email), recover: back, status: back ? (paid ? 'clawback' : 'reverse') : f.length ? 'review' : 'ok', findings: f });
  }
  const sorted = sortBy(items);
  return { actions: sorted.length, commission: round2(sorted.reduce((s, i) => s + i.commission, 0)), to_recover: round2(sorted.reduce((s, i) => s + i.recover, 0)), ...byStatus(sorted, ['reverse', 'clawback', 'review', 'ok']), by_affiliate: rollup(sorted, (i) => i.affiliate || '(none)', ['commission', 'recover']).map(({ key, ...v }) => ({ affiliate: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function reversalText(items, { network, from }) {
  const rows = items.filter((i) => ['reverse', 'clawback'].includes(i.status)); const total = round2(rows.reduce((s, i) => s + i.recover, 0));
  return { total, actions: rows.map((i) => i.id), text: [
    `# Commission reversal request${network ? `: ${network}` : ''}`, '', `**To:** [TO CONFIRM ${network || 'affiliate network'} program support]`, `**From:** ${from || '[TO CONFIRM your name and program]'}`, '',
    `Please reverse or adjust the ${rows.length} commission(s) below, ${total} in total.`, '',
    '| Action | Affiliate | Order | Commission | Adjust by | Reason |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.id} | ${i.affiliate} | ${i.order_id} | ${i.commission} | ${i.recover} | ${i.findings.filter((f) => f.amount).map((f) => f.detail).join(' ')} |`),
    '', `**Total:** ${total}`,
  ].join('\n') };
}
