// Discount code checks: pure functions over orders and the seller's code rules.
import { exportProfile, firstRowPer, round2, str, num, isoDate, emailKey, addressKey, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const ORDER_PROFILES = Object.freeze([
  exportProfile('shopify_discounts_orders', { order_id: 'Name', order_date: 'Created at', customer_email: 'Email', ship_address: 'Shipping Address1', ship_zip: 'Shipping Zip', discount_code: 'Discount Code', discount_amount: 'Discount Amount', subtotal: 'Subtotal' }, { rows: firstRowPer('order_id'), note: 'Shopify orders export: one row per order.' }),
]);
export const ORDER_FIELDS = Object.freeze({
  order_id: t(['Order', 'Order ID', 'Name', 'Order Number'], { required: true }),
  order_date: t(['Order Date', 'Created at', 'Date'], { type: 'date', required: true }),
  customer_email: t(['Customer Email', 'Email'], { pii: 'email' }),
  ship_address: t(['Ship Address', 'Shipping Address1', 'Shipping Address', 'Address'], { pii: 'address' }),
  ship_zip: t(['Ship Zip', 'Shipping Zip', 'Postal Code', 'Zip']),
  discount_code: t(['Discount Code', 'Coupon', 'Promo Code', 'Code']),
  discount_amount: t(['Discount Amount', 'Discount', 'Coupon Amount'], { type: 'money' }),
  subtotal: t(['Subtotal', 'Items Total', 'Merchandise Total'], { type: 'money' }),
});
export const CODE_FIELDS = Object.freeze({
  discount_code: t(['Code', 'Discount Code', 'Coupon'], { required: true }),
  type: t(['Type', 'Code Type', 'Kind']),
  max_uses: t(['Max Uses', 'Usage Limit', 'Limit'], { type: 'number' }),
  starts: t(['Starts', 'Start Date', 'Valid From'], { type: 'date' }),
  ends: t(['Ends', 'End Date', 'Valid To', 'Expires'], { type: 'date' }),
  min_order: t(['Minimum Order', 'Min Order', 'Minimum Subtotal'], { type: 'money' }),
});
export const COUPON_SETTINGS_SCHEMA = Object.freeze({ type: 'object', additionalProperties: false, properties: { note: { type: 'string' }, employee_domains: { type: 'array', items: { type: 'string' }, description: 'E-mail domains of your staff, for staff codes' } } });

/** Statuses: abuse, review, ok. Findings: unknown_code, expired, below_minimum, over_limit, new_customer_repeat, same_address_many_accounts, staff_code_outside. */
export function checkCoupons(orders, codes, settings = {}) {
  const rules = new Map(codes.map((c) => [str(c.discount_code).toUpperCase(), { type: str(c.type).toLowerCase(), max: num(c.max_uses), starts: isoDate(c.starts), ends: isoDate(c.ends), min: num(c.min_order) }]));
  const staff = (settings.employee_domains || []).map((d) => d.toLowerCase());
  const all = sortBy(orders.map((o) => ({ ...o, id: str(o.order_id).replace(/^#/, ''), d: isoDate(o.order_date), ek: emailKey(o.customer_email), ak: addressKey(o.ship_address, o.ship_zip), code: str(o.discount_code).toUpperCase() })), (o) => `${o.d}|${o.id}`);
  const seenE = new Set(); const seenA = new Map(); const uses = new Map(); const items = [];
  for (const o of all) {
    const prevE = o.ek && seenE.has(o.ek); const prevA = o.ak && seenA.has(o.ak); const otherEmails = o.ak ? [...(seenA.get(o.ak) || [])].filter((e) => e !== o.ek) : [];
    if (o.code) {
      const r = rules.get(o.code); const amt = round2(Math.abs(num(o.discount_amount) || 0)); const sub = num(o.subtotal); const f = []; let status = 'ok';
      const hit = (code, detail) => { f.push(finding(code, f.some((x) => x.amount) ? null : amt, detail)); status = 'abuse'; };
      if (!r) { f.push(finding('unknown_code', null, `Code ${o.code} is not in your list of codes. Was it issued by hand, or found on a coupon site?`)); status = 'review'; }
      else {
        const inDates = (!r.starts || o.d >= r.starts) && (!r.ends || o.d <= r.ends);
        if (!inDates) hit('expired', `Code ${o.code} was used on ${o.d}, outside ${r.starts || '…'} to ${r.ends || '…'}.`);
        if (r.min && sub !== null && sub < r.min) hit('below_minimum', `Subtotal ${sub} is under the ${r.min} minimum for ${o.code}.`);
        if (inDates) { const n = (uses.get(o.code) || 0) + 1; uses.set(o.code, n); const max = r.type === 'single_use' ? 1 : r.max; if (max && n > max) hit('over_limit', `Use ${n} of ${o.code}; its limit is ${max}.`); }
        if (r.type === 'new_customer' && (prevE || prevA)) hit('new_customer_repeat', `New-customer code ${o.code} on order ${o.id}, but this ${prevE ? 'e-mail' : 'shipping address'} ordered before.`);
        if (r.type === 'new_customer' && otherEmails.length) { f.push(finding('same_address_many_accounts', null, `${otherEmails.length + 1} different e-mail addresses ship to this address.`)); status = 'abuse'; }
        if (r.type === 'employee') { const dom = String(o.customer_email || '').toLowerCase().split('@')[1] || ''; if (!staff.includes(dom)) hit('staff_code_outside', `Staff code ${o.code} used by an e-mail outside your staff domains.`); }
      }
      items.push({ id: o.id, order_date: o.d, customer_email: str(o.customer_email), discount_code: o.code, discount_amount: amt, subtotal: sub, at_stake: f.reduce((s, x) => s + (x.amount || 0), 0), status, findings: f });
    }
    if (o.ek) seenE.add(o.ek); if (o.ak) (seenA.get(o.ak) || seenA.set(o.ak, new Set()).get(o.ak)).add(o.ek);
  }
  const sorted = sortBy(items);
  const byCode = rollup(sorted, (i) => i.discount_code, ['discount_amount', 'at_stake']).map(({ key, ...v }) => ({ code: key, uses: v.count, discount: v.discount_amount, at_stake: v.at_stake, flagged: sorted.filter((i) => i.discount_code === key && i.status !== 'ok').length }));
  return { orders_with_code: sorted.length, discount_total: round2(sorted.reduce((s, i) => s + i.discount_amount, 0)), at_stake: round2(sorted.reduce((s, i) => s + i.at_stake, 0)), ...byStatus(sorted, ['abuse', 'review', 'ok']), by_code: byCode, by_finding: byFinding(sorted), items: sorted };
}

export function reviewText(r, { from }) {
  const rows = r.by_code.filter((c) => c.flagged);
  return { codes: rows.map((c) => c.code), text: [
    '# Discount code review', '', '**To:** [TO CONFIRM marketing or e-commerce lead]', `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'These codes were used outside their rules. Decide for each whether to keep, limit or end it.', '',
    '| Code | Uses | Discount given | Outside the rules | Decision |', '| --- | --- | --- | --- | --- |',
    ...rows.map((c) => `| ${c.code} | ${c.uses} | ${c.discount} | ${c.flagged} order(s), ${c.at_stake} | [CHECK keep / limit / end] |`),
  ].join('\n') };
}
