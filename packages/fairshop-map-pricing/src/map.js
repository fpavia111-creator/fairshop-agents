// Advertised prices against the seller's minimum advertised price (MAP) list.
import { round2, str, num, isoDate, skuKey, channelKey, channelLabel, finding, byFinding, byStatus, sortBy } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PRICE_FIELDS = Object.freeze({
  date: t(['Date', 'Seen On', 'Checked', 'Captured At'], { type: 'date' }),
  seller: t(['Seller', 'Reseller', 'Merchant', 'Store Name'], { required: true }),
  channel: t(['Channel', 'Marketplace', 'Site']),
  sku: t(['SKU', 'Item SKU', 'MPN', 'Model'], { required: true }),
  advertised_price: t(['Advertised Price', 'Price', 'Listed Price'], { type: 'money', required: true }),
  is_own: t(['Own', 'Is Own', 'Our Listing'], { type: 'bool' }),
});
export const MAP_POLICY_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['map'],
  properties: {
    note: { type: 'string' },
    map: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Minimum advertised price per SKU, from your own MAP policy' },
    exempt_sellers: { type: 'array', items: { type: 'string' }, description: 'Sellers you allow below MAP (an authorised clearance, for example)' },
    pause: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['from', 'to'], properties: { from: { type: 'string', format: 'date' }, to: { type: 'string', format: 'date' } } }, description: 'Date ranges when your policy is paused (a promotion you announced)' },
    tolerance: { type: 'number', minimum: 0, description: 'Prices this far under MAP are rounding (default 0.01)' },
  },
});

/** Statuses: own, notice, review, ok. One item per seller and SKU. */
export function checkMap(rows, policy) {
  const tol = policy.tolerance ?? 0.01; const map = Object.fromEntries(Object.entries(policy.map || {}).map(([k, v]) => [skuKey(k), v]));
  const exempt = new Set((policy.exempt_sellers || []).map((x) => x.toLowerCase())); const pause = policy.pause || [];
  const g = new Map();
  for (const r of rows) { const k = `${str(r.seller)}|${skuKey(r.sku)}`; (g.get(k) || g.set(k, []).get(k)).push(r); }
  const items = [];
  for (const [k, obs] of [...g.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const [seller, sku] = k.split('|'); const own = obs.some((o) => String(o.is_own).toLowerCase() === 'yes'); const floor = map[sku];
    const sorted = obs.map((o) => ({ date: isoDate(o.date), channel: channelLabel(channelKey(o.channel)), price: round2(num(o.advertised_price) || 0) })).sort((a, b) => (`${a.date}|${a.channel}|${a.price}` < `${b.date}|${b.channel}|${b.price}` ? -1 : 1));
    const f = []; let status = 'ok';
    const below = floor === undefined ? [] : sorted.filter((o) => o.price < floor - tol && !pause.some((p) => o.date && o.date >= p.from && o.date <= p.to));
    if (floor === undefined) { f.push(finding('sku_not_on_map_list', null, `${seller} advertises ${sku}, which is not on your MAP list.`)); status = 'review'; }
    else if (below.length && exempt.has(seller.toLowerCase())) status = 'ok';
    else if (below.length) {
      const low = Math.min(...below.map((o) => o.price)); const dates = [...new Set(below.map((o) => o.date))];
      f.push(finding(own ? 'own_below_map' : 'below_map', floor - low, `${seller} advertised ${sku} at ${low} (MAP ${floor}) on ${below.map((o) => `${o.channel} ${o.date}`).join(', ')}.`));
      if (!own && dates.length > 1) f.push(finding('repeat_below_map', null, `${seller} was below MAP on ${dates.length} different days.`));
      status = own ? 'own' : 'notice';
    }
    items.push({ id: `${seller}|${sku}`, seller, sku, own, map: floor ?? null, lowest: sorted.length ? Math.min(...sorted.map((o) => o.price)) : null, observations: sorted.length, below: below.length, last_seen: sorted.at(-1) ? sorted.at(-1).date : null, status, findings: f });
  }
  const sorted = sortBy(items);
  return { sellers: new Set(sorted.map((i) => i.seller)).size, observations: rows.length, ...byStatus(sorted, ['own', 'notice', 'review', 'ok']), by_seller: [...new Set(sorted.map((i) => i.seller))].sort().map((s) => ({ seller: s, skus: sorted.filter((i) => i.seller === s).length, below_map: sorted.filter((i) => i.seller === s && ['own', 'notice'].includes(i.status)).length })), by_finding: byFinding(sorted), items: sorted };
}

export function noticeText(items, { seller, from }) {
  const rows = items.filter((i) => i.seller.toLowerCase() === String(seller).toLowerCase() && i.status === 'notice');
  return { skus: rows.map((i) => i.sku), text: [
    `# Minimum advertised price notice: ${rows[0] ? rows[0].seller : seller}`, '', `**To:** [TO CONFIRM ${rows[0] ? rows[0].seller : seller} contact from your reseller agreement]`, `**From:** ${from || '[TO CONFIRM your name and brand]'}`, '',
    'Our records show the advertised prices below, under the minimum advertised prices in our policy. Please bring them back to the minimum, or tell us if we have this wrong.', '',
    '| SKU | Minimum advertised price | Lowest seen | Seen on |', '| --- | --- | --- | --- |', ...rows.map((i) => `| ${i.sku} | ${i.map} | ${i.lowest} | ${i.findings[0].detail.replace(/^.* on /, '').replace(/\.$/, '')} |`),
    '', '[CHECK the wording against your MAP policy and your agreement with this seller]',
  ].join('\n') };
}
