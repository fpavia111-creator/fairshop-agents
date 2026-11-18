// Stock by location against channel listings: pure functions.
import { exportProfile, round2, str, num, skuKey, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const STOCK_PROFILES = Object.freeze([exportProfile('shopify_inventory', { sku: 'SKU', location: 'Location', on_hand: ['On hand', 'Available'], committed: 'Committed' })]);
export const LISTING_PROFILES = Object.freeze([
  exportProfile('amazon_all_listings', { channel: { value: 'Amazon' }, sku: 'seller-sku', listing_id: 'asin1', listed_qty: 'quantity', status: { from: ['status'], compute: (_r, get) => String(get('status') || 'Active') }, fulfillment: { from: ['fulfillment-channel'], compute: (_r, get) => (/amazon/i.test(String(get('fulfillment-channel') || '')) ? 'fba' : 'merchant') } }),
  exportProfile('ebay_listings', { channel: { value: 'eBay' }, sku: 'Custom label (SKU)', listing_id: 'Item number', listed_qty: ['Available quantity', 'Quantity'], status: { value: 'active' }, fulfillment: { value: 'merchant' } }),
]);
export const STOCK_FIELDS = Object.freeze({
  sku: t(['SKU', 'Item SKU', 'Variant SKU'], { required: true }),
  location: t(['Location', 'Warehouse', 'Site', 'Fulfillment Center']),
  on_hand: t(['On Hand', 'Quantity On Hand', 'Qty On Hand', 'Stock'], { type: 'number', required: true }),
  committed: t(['Committed', 'Reserved', 'Allocated'], { type: 'number' }),
});
export const LISTING_FIELDS = Object.freeze({
  channel: t(['Channel', 'Marketplace', 'Store'], { required: true }),
  sku: t(['SKU', 'Seller SKU', 'Custom Label'], { required: true }),
  listing_id: t(['Listing ID', 'Item ID', 'ASIN', 'Item Number']),
  listed_qty: t(['Listed Quantity', 'Quantity', 'Available Quantity', 'Qty'], { type: 'number', required: true }),
  status: t(['Status', 'Listing Status']),
  fulfillment: t(['Fulfillment', 'Fulfilled By', 'Fulfillment Channel']),
});
export const INVENTORY_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    feeds: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } }, description: 'Locations that ship each fulfilment type: "fba" (default locations named FBA or Amazon) and "merchant" (default every other location)' },
    buffer: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 }, description: 'Units held back per channel' },
  },
});

/** Statuses: fix, review, ok. */
export function compareListings(stock, listings, s = {}) {
  const feeds = Object.fromEntries(Object.entries(s.feeds || {}).map(([k, v]) => [k.toLowerCase(), v.map((x) => x.toLowerCase())]));
  const buffer = Object.fromEntries(Object.entries(s.buffer || {}).map(([k, v]) => [channelKey(k), v]));
  const isFba = (loc) => /\bfba\b|amazon/i.test(loc);
  const avail = new Map(); const locs = new Set();
  for (const r of stock) { const k = skuKey(r.sku); const loc = str(r.location) || '(default)'; locs.add(loc); const a = Math.max(0, (num(r.on_hand) || 0) - (num(r.committed) || 0)); const m = avail.get(k) || new Map(); m.set(loc, (m.get(loc) || 0) + a); avail.set(k, m); }
  const feeding = (type) => { const set = feeds[type]; return (loc) => (set ? set.includes(loc.toLowerCase()) : type === 'fba' ? isFba(loc) : !isFba(loc)); };
  const items = []; const listed = new Set();
  for (const l of sortBy(listings.map((l) => ({ ...l, id: `${channelLabel(channelKey(l.channel))}:${str(l.listing_id) || skuKey(l.sku)}` })))) {
    const sku = skuKey(l.sku); const ch = channelKey(l.channel); const type = /fba|amazon/i.test(str(l.fulfillment)) ? 'fba' : 'merchant'; const qty = num(l.listed_qty) || 0; const active = !/inactive|ended|paused|closed/i.test(str(l.status));
    const m = avail.get(sku); const can = m ? Math.max(0, [...m.entries()].filter(([loc]) => feeding(type)(loc)).reduce((a, [, v]) => a + v, 0) - (buffer[ch] || 0)) : 0;
    const f = []; let status = 'ok'; let over = 0;
    if (active) listed.add(sku);
    if (!m) { f.push(finding('unknown_sku', null, `${channelLabel(ch)} lists ${sku}, which is not in your stock file.`)); status = 'review'; }
    else if (active && qty > can) { over = qty - can; f.push(finding('listed_over_available', null, `${channelLabel(ch)} lists ${qty} of ${sku}; its ${type} locations can ship ${can}${buffer[ch] ? ` after a buffer of ${buffer[ch]}` : ''}. ${over} unit(s) could be oversold.`)); status = 'fix'; }
    else if (active && qty === 0 && can > 0) { f.push(finding('listed_zero_with_stock', null, `${channelLabel(ch)} lists 0 of ${sku} while ${can} can ship.`)); status = 'fix'; }
    else if (!active && can > 0) { f.push(finding('inactive_with_stock', null, `The ${channelLabel(ch)} listing for ${sku} is ${str(l.status) || 'inactive'} while ${can} can ship.`)); status = 'review'; }
    items.push({ id: l.id, kind: 'listing', channel: channelLabel(ch), sku, listing_id: str(l.listing_id), fulfillment: type, listed: qty, can_ship: can, suggested: m ? can : 0, oversell_units: over, units: 0, status, findings: f });
  }
  for (const [sku, m] of [...avail.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    if (total > 0 && !listed.has(sku)) items.push({ id: `SKU:${sku}`, kind: 'stock', channel: '', sku, listing_id: '', fulfillment: '', listed: 0, can_ship: total, suggested: null, oversell_units: 0, units: total, status: 'review', findings: [finding('stock_not_listed', null, `${total} unit(s) of ${sku} are in stock (${[...m.entries()].filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ')}) with no active listing anywhere.`)] });
  }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  return { listings: sorted.filter((i) => i.kind === 'listing').length, oversell_units: sorted.reduce((a, i) => a + i.oversell_units, 0), stranded_units: sorted.reduce((a, i) => a + i.units, 0), ...byStatus(sorted, ['fix', 'review', 'ok']), by_channel: rollup(sorted.filter((i) => i.kind === 'listing'), (i) => i.channel, ['listed', 'can_ship', 'oversell_units']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function updatesText(items) {
  const rows = items.filter((i) => i.kind === 'listing' && i.status === 'fix');
  return { listings: rows.map((i) => i.id), text: [
    '# Listing quantity corrections', '', '**For:** [TO CONFIRM the person who updates listings]', '',
    '| Channel | SKU | Listing | Listed now | Can ship | Set to |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.channel} | ${i.sku} | ${i.listing_id} | ${i.listed} | ${i.can_ship} | ${i.suggested} |`), '', '[CHECK open orders and inbound stock before changing any quantity]',
  ].join('\n') };
}
