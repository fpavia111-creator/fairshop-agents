// Duplicate and orphan listings across channels: pure functions.
import { exportProfile, round2, str, num, skuKey, channelKey, channelLabel, tokenSetSimilarity, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const LISTING_PROFILES = Object.freeze([
  exportProfile('amazon_all_listings', { channel: { value: 'Amazon' }, listing_id: 'asin1', sku: 'seller-sku', title: 'item-name', price: 'price', status: { from: ['status'], compute: (_r, get) => String(get('status') || 'Active') } }),
  exportProfile('ebay_listings', { channel: { value: 'eBay' }, listing_id: 'Item number', sku: 'Custom label (SKU)', title: 'Title', price: ['Current price', 'Start price'], status: { value: 'active' } }),
]);
export const LISTING_FIELDS = Object.freeze({
  channel: t(['Channel', 'Marketplace', 'Store'], { required: true }),
  listing_id: t(['Listing ID', 'Item ID', 'ASIN', 'Item Number'], { required: true }),
  sku: t(['SKU', 'Seller SKU', 'Custom Label']),
  title: t(['Title', 'Item Name', 'Product Title']),
  gtin: t(['GTIN', 'UPC', 'EAN', 'Barcode']),
  price: t(['Price', 'Current Price'], { type: 'money' }),
  status: t(['Status', 'Listing Status']),
});
export const CATALOG_FIELDS = Object.freeze({ sku: t(['SKU', 'Variant SKU', 'Item SKU'], { required: true }) });
export const LISTING_SETTINGS_SCHEMA = Object.freeze({ type: 'object', additionalProperties: false, properties: { note: { type: 'string' }, title_similarity: { type: 'number', minimum: 0.5, maximum: 1, description: 'Titles this similar (0 to 1) under different SKUs on one channel are listed (default 0.9)' } } });

/** Lower case, punctuation folded: "12oz" and "12 oz" stay different words, "Mug," and "mug" do not. */
const words = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Statuses: fix, review, ok. */
export function findDuplicates(listings, catalog = null, s = {}) {
  const sim = s.title_similarity ?? 0.9; const known = catalog ? new Set(catalog.map((c) => skuKey(c.sku)).filter(Boolean)) : null;
  const rows = sortBy(listings.map((l) => ({ ch: channelKey(l.channel), id: `${channelLabel(channelKey(l.channel))}:${str(l.listing_id)}`, listing_id: str(l.listing_id), sku: skuKey(l.sku), title: str(l.title), gtin: str(l.gtin).replace(/[\s-]/g, ''), price: num(l.price), active: !/inactive|ended|closed|paused/i.test(str(l.status)) })));
  const items = []; const firstBySku = new Map(); const kept = [];
  for (const l of rows) {
    const f = [];
    if (l.active && l.sku) {
      const k = `${l.ch}|${l.sku}`; const first = firstBySku.get(k);
      if (first) f.push(finding('duplicate_sku_listing', null, `${l.sku} is listed twice on ${channelLabel(l.ch)}: ${first.listing_id} and ${l.listing_id}${first.price !== null && l.price !== null && first.price !== l.price ? ` at different prices (${first.price} and ${l.price})` : ''}.`));
      else firstBySku.set(k, l);
      const twin = kept.find((x) => x.ch === l.ch && x.sku !== l.sku && x.title && l.title && tokenSetSimilarity(words(x.title), words(l.title)) >= sim);
      if (twin && !first) f.push(finding('near_duplicate_title', null, `"${l.title}" (${l.sku}) reads like "${twin.title}" (${twin.sku}) on ${channelLabel(l.ch)}.`));
      kept.push(l);
    }
    if (known && l.sku && !known.has(l.sku)) f.push(finding('orphan_listing', null, `${l.listing_id} on ${channelLabel(l.ch)} is for ${l.sku}, which is not in your catalog.`));
    const code = f.map((x) => x.code);
    items.push({ id: l.id, kind: 'listing', channel: channelLabel(l.ch), listing_id: l.listing_id, sku: l.sku, title: l.title, gtin: l.gtin, price: l.price, active: l.active, status: code.includes('duplicate_sku_listing') || code.includes('orphan_listing') ? 'fix' : f.length ? 'review' : 'ok', findings: f });
  }
  const g = new Map(); for (const l of rows) if (l.gtin && l.sku) (g.get(l.gtin) || g.set(l.gtin, new Set()).get(l.gtin)).add(l.sku);
  for (const [gtin, skus] of [...g.entries()].sort()) if (skus.size > 1) items.push({ id: `GTIN:${gtin}`, kind: 'gtin', channel: '', listing_id: '', sku: [...skus].sort().join(' '), title: '', gtin, price: null, active: true, status: 'review', findings: [finding('gtin_shared', null, `GTIN ${gtin} is used by ${[...skus].sort().join(', ')}. One product, one GTIN.`)] });
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`);
  return { listings: sorted.filter((i) => i.kind === 'listing').length, ...byStatus(sorted, ['fix', 'review', 'ok']), by_channel: rollup(sorted.filter((i) => i.kind === 'listing' && i.status !== 'ok'), (i) => i.channel, []).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function cleanupText(items) {
  const rows = items.filter((i) => i.status !== 'ok');
  return { listings: rows.map((i) => i.id), text: ['# Listing clean-up', '', '**For:** [TO CONFIRM the person who manages listings]', '', '| Listing | SKU | Problem | Action |', '| --- | --- | --- | --- |', ...rows.map((i) => `| ${i.id} | ${i.sku} | ${i.findings.map((f) => f.detail).join(' ')} | [CHECK keep / end / merge / relink] |`)].join('\n') };
}
