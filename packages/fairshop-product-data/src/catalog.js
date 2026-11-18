// Product data completeness: pure functions over a product export and the seller's channel rules.
import { exportProfile, round2, str, num, skuKey, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PRODUCT_PROFILES = Object.freeze([
  exportProfile('shopify_products', { sku: 'Variant SKU', channel: { value: 'Shopify' }, title: 'Title', description: 'Body (HTML)', gtin: 'Variant Barcode', brand: 'Vendor', weight: 'Variant Grams', image_count: { from: ['Image Src'], compute: (_r, get) => (String(get('Image Src') || '').trim() ? 1 : 0) }, price: 'Variant Price', category: ['Product Category', 'Type'] }, { note: 'Shopify products export: weight is read in grams, one image counted per row with an image.' }),
]);
export const PRODUCT_FIELDS = Object.freeze({
  sku: t(['SKU', 'Variant SKU', 'Seller SKU', 'Item SKU'], { required: true }),
  channel: t(['Channel', 'Marketplace', 'Store']),
  title: t(['Title', 'Product Title', 'Item Name', 'Name']),
  description: t(['Description', 'Body', 'Product Description']),
  gtin: t(['GTIN', 'UPC', 'EAN', 'Barcode', 'Product ID']),
  brand: t(['Brand', 'Vendor', 'Manufacturer']),
  weight: t(['Weight', 'Item Weight', 'Shipping Weight'], { type: 'number', unit: false }),
  image_count: t(['Images', 'Image Count', 'Number of Images'], { type: 'number' }),
  price: t(['Price', 'List Price', 'Variant Price'], { type: 'money' }),
  hs_code: t(['HS Code', 'Harmonized Code', 'HTS Code']),
  country_of_origin: t(['Country of Origin', 'Origin Country', 'Made In']),
  category: t(['Category', 'Product Type', 'Type']),
});
const RULE = { type: 'object', additionalProperties: false, properties: { title_max: { type: 'integer', minimum: 1 }, required: { type: 'array', items: { type: 'string' } }, min_images: { type: 'integer', minimum: 0 }, min_description: { type: 'integer', minimum: 0 } } };
export const CATALOG_SETTINGS_SCHEMA = Object.freeze({ type: 'object', additionalProperties: false, properties: { note: { type: 'string' }, channels: { type: 'object', additionalProperties: RULE, description: 'Per channel (and "default"): title_max, required fields, min_images, min_description characters, from the channel\'s own rules as you read them' } } });

const DEFAULT = { title_max: 200, required: ['title', 'gtin', 'brand', 'weight', 'price'], min_images: 1, min_description: 100 };
/** True when a GTIN-8, 12, 13 or 14 has a valid check digit. */
export function gtinValid(v) {
  const d = str(v).replace(/[\s-]/g, ''); if (!/^\d+$/.test(d) || ![8, 12, 13, 14].includes(d.length)) return false;
  let sum = 0; for (let i = d.length - 2, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += Number(d[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(d.at(-1));
}

/** Statuses: fix, ok. */
export function checkCatalog(rows, s = {}) {
  const rules = Object.fromEntries(Object.entries(s.channels || {}).map(([k, v]) => [k === 'default' ? 'default' : channelKey(k), v]));
  const ruleFor = (ch) => ({ ...DEFAULT, ...(rules.default || {}), ...(rules[ch] || {}) });
  const gtins = new Map(); for (const r of rows) { const g = str(r.gtin).replace(/[\s-]/g, ''); if (g) (gtins.get(g) || gtins.set(g, new Set()).get(g)).add(skuKey(r.sku)); }
  const items = [];
  for (const r of sortBy(rows.map((r) => ({ ...r, id: `${channelLabel(channelKey(r.channel)) || 'all'}:${skuKey(r.sku)}` })))) {
    const ch = channelKey(r.channel); const rule = ruleFor(ch); const sku = skuKey(r.sku); const f = [];
    const present = (k) => (k === 'weight' || k === 'price' || k === 'image_count' ? num(r[k]) !== null : !!str(r[k]));
    const missing = rule.required.filter((k) => !present(k)); if (missing.length) f.push(finding('missing_fields', null, `${sku}: ${missing.join(', ')} missing.`));
    const title = str(r.title); if (title && title.length > rule.title_max) f.push(finding('title_too_long', null, `${sku}: title is ${title.length} characters; your limit for ${channelLabel(ch) || 'this channel'} is ${rule.title_max}.`));
    const g = str(r.gtin).replace(/[\s-]/g, '');
    if (g && !gtinValid(g)) f.push(finding('gtin_invalid', null, `${sku}: GTIN ${g} has a wrong check digit or length.`));
    if (g && (gtins.get(g) || new Set()).size > 1 && [...gtins.get(g)].sort()[0] !== sku) f.push(finding('gtin_shared', null, `${sku}: GTIN ${g} is also used by ${[...gtins.get(g)].filter((x) => x !== sku).sort().join(', ')}.`));
    if (present('weight') && num(r.weight) <= 0) f.push(finding('weight_zero', null, `${sku}: weight is ${r.weight}.`));
    if (present('price') && num(r.price) <= 0) f.push(finding('price_zero', null, `${sku}: price is ${r.price}.`));
    if (num(r.image_count) !== null && num(r.image_count) < rule.min_images) f.push(finding('images_below_min', null, `${sku}: ${num(r.image_count)} image(s); your minimum is ${rule.min_images}.`));
    const desc = str(r.description).replace(/<[^>]*>/g, ''); if (desc && desc.length < rule.min_description) f.push(finding('description_short', null, `${sku}: description is ${desc.length} characters; your minimum is ${rule.min_description}.`));
    const filled = rule.required.filter(present).length;
    items.push({ id: r.id, channel: channelLabel(ch) || '', sku, title, gtin: g, completeness_pct: Math.round((filled / rule.required.length) * 100), problems: f.length, status: f.length ? 'fix' : 'ok', findings: f });
  }
  const sorted = sortBy(items);
  return { products: sorted.length, ...byStatus(sorted, ['fix', 'ok']), average_completeness_pct: sorted.length ? round2(sorted.reduce((a, i) => a + i.completeness_pct, 0) / sorted.length) : null, by_channel: rollup(sorted, (i) => i.channel || 'all', ['problems']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function fixListText(items) {
  const rows = items.filter((i) => i.status === 'fix');
  return { skus: rows.map((i) => i.id), text: ['# Product data fix list', '', '**For:** [TO CONFIRM the person who maintains product data]', '', '| Channel | SKU | Problem | Fix |', '| --- | --- | --- | --- |', ...rows.flatMap((i) => i.findings.map((f) => `| ${i.channel} | ${i.sku} | ${f.detail} | [CHECK new value] |`))].join('\n') };
}
