// Product data completeness: pure functions over a product export and the seller's channel rules.
import { exportProfile, round2, str, num, skuKey, channelKey, channelLabel, finding, byFinding, byStatus, sortBy, rollup } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
const cell = (v) => String(v ?? '').trim();
const IMAGES = 'Fairshop image count';

/** The first code in a barcode cell such as "ean:4006381333931; upc:036000291452" or "isbn:978-1-4028-9462-6". */
export function firstBarcode(v) {
  for (const part of cell(v).split(/[;,|]/)) { const c = part.replace(/^\s*[a-z]+\s*:/i, '').replace(/[\s-]/g, ''); if (c) return c; }
  return '';
}

/**
 * Shopify writes a product's own columns (title, description, vendor, type) only on its first row; the
 * variant rows under it leave them blank, and extra rows carry only an image. Fill those columns down by
 * handle, count each product's images, and drop the image-only rows (found on Shopify's own sample file,
 * final pass 19 Nov 2026: every variant row had been reported as missing its title and brand).
 */
export function shopifyProductRows({ handle, sku, price, carry, images }) {
  return (rows) => {
    const first = new Map(); const pics = new Map();
    for (const r of rows) { const h = cell(r[handle]); if (!h) continue; if (!first.has(h)) first.set(h, r); const set = pics.get(h) || pics.set(h, new Set()).get(h); for (const c of images) if (cell(r[c])) set.add(cell(r[c])); }
    const out = [];
    for (const r of rows) {
      const h = cell(r[handle]);
      if (h && !cell(r[sku]) && !cell(r[price])) continue;
      const o = { ...r }; const f = h ? first.get(h) : null;
      if (f) for (const c of carry) if (!cell(o[c]) && cell(f[c])) o[c] = f[c];
      o[IMAGES] = String(h ? pics.get(h).size : images.filter((c) => cell(r[c])).length);
      out.push(o);
    }
    return out;
  };
}

/**
 * WooCommerce exports a variable product as a parent row (no price) and one row per variation (own SKU, price,
 * weight and one image). A variation takes the parent's description and images when its own are blank; the
 * parent and grouped rows are checked through their products, not as products of their own. Virtual and
 * external products do not ship, so no weight is needed (found on WooCommerce's own sample file, 19 Nov 2026).
 */
export function wooProductRows(rows) {
  const byId = new Map(); const bySku = new Map();
  for (const r of rows) { if (cell(r.ID)) byId.set(cell(r.ID), r); if (cell(r.SKU)) bySku.set(cell(r.SKU).toLowerCase(), r); }
  const count = (v) => cell(v).split(',').map((x) => x.trim()).filter(Boolean).length;
  const out = [];
  for (const r of rows) {
    const type = cell(r.Type).toLowerCase();
    if (/\b(variable|grouped)\b/.test(type)) continue;
    const p = cell(r.Parent); const parent = p ? byId.get(p.replace(/^id:/i, '')) || bySku.get(p.toLowerCase()) : null;
    const o = { ...r };
    // WooCommerce uses the parent's weight for a variation that has none.
    if (parent) for (const c of ['Description', 'Short description', 'Brands', 'Categories', 'Weight (lbs)', 'Weight (kg)', 'Weight (oz)', 'Weight (g)']) if (!cell(o[c]) && cell(parent[c])) o[c] = parent[c];
    o[IMAGES] = String(count(o.Images) || (parent ? count(parent.Images) : 0));
    // Virtual products and external ones (sold on another site) do not ship from the store.
    o['Fairshop ships'] = /\b(virtual|external)\b/.test(type) ? 'no' : 'yes';
    if (!cell(o.Description)) o.Description = o['Short description'];
    out.push(o);
  }
  return out;
}

const weightOf = (cols) => ({ from: cols, compute: (_r, get) => { for (const c of cols) { const v = cell(get(c)); if (v) return v; } return ''; } });
export const PRODUCT_PROFILES = Object.freeze([
  exportProfile('shopify_products', { sku: 'Variant SKU', channel: { value: 'Shopify' }, title: 'Title', description: 'Body (HTML)', gtin: { from: ['Variant Barcode'], compute: (_r, get) => firstBarcode(get('Variant Barcode')) }, brand: 'Vendor', weight: 'Variant Grams', image_count: { from: ['Image Src'], compute: (r) => r[IMAGES] }, price: 'Variant Price', category: ['Product Category', 'Type'], requires_shipping: ['Variant Requires Shipping'] },
    { note: 'Shopify products export, classic layout: weight in grams; title, description, vendor and type are filled down from the first row of each handle; images counted per product.', prepare: shopifyProductRows({ handle: 'Handle', sku: 'Variant SKU', price: 'Variant Price', carry: ['Title', 'Body (HTML)', 'Vendor', 'Type', 'Product Category'], images: ['Image Src', 'Variant Image'] }) }),
  exportProfile('shopify_products_2025', { sku: 'SKU', channel: { value: 'Shopify' }, title: 'Title', description: 'Description', gtin: { from: ['Variant Barcodes'], compute: (_r, get) => firstBarcode(get('Variant Barcodes')) }, brand: 'Vendor', weight: 'Weight value (grams)', image_count: { from: ['Product image URL'], compute: (r) => r[IMAGES] }, price: 'Price', category: ['Product category', 'Type'], requires_shipping: ['Requires shipping'] },
    { note: 'Shopify products export, current layout: weight in grams; the first code in "Variant Barcodes" is checked; title, description, vendor and type are filled down by URL handle; images counted per product.', prepare: shopifyProductRows({ handle: 'URL handle', sku: 'SKU', price: 'Price', carry: ['Title', 'Description', 'Vendor', 'Type', 'Product category'], images: ['Product image URL', 'Variant image URL'] }) }),
  exportProfile('woocommerce_products', { sku: 'SKU', channel: { value: 'WooCommerce' }, title: 'Name', description: 'Description', gtin: ['GTIN, UPC, EAN, or ISBN', 'GTIN'], brand: ['Brands'], weight: weightOf(['Weight (lbs)', 'Weight (kg)', 'Weight (oz)', 'Weight (g)']), image_count: { from: ['Images'], compute: (r) => r[IMAGES] }, price: 'Regular price', category: ['Categories'], requires_shipping: { from: ['Type'], compute: (r) => r['Fairshop ships'] } },
    { note: 'WooCommerce product export: weight in your store\'s unit (the column header names it); a variable product is checked through its variations; virtual products need no weight.', prepare: wooProductRows }),
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
  requires_shipping: t(['Requires Shipping', 'Variant Requires Shipping', 'Shipping Required', 'Ships'], { type: 'bool' }),
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
  const gsorted = new Map([...gtins.entries()].map(([g, set]) => [g, [...set].sort()]));
  const items = [];
  for (const r of sortBy(rows.map((r) => ({ ...r, id: `${channelLabel(channelKey(r.channel)) || 'all'}:${skuKey(r.sku)}` })))) {
    const ch = channelKey(r.channel); const rule = ruleFor(ch); const sku = skuKey(r.sku); const f = [];
    const present = (k) => (k === 'weight' || k === 'price' || k === 'image_count' ? num(r[k]) !== null : !!str(r[k]));
    // A product that does not ship (digital, virtual, a service) needs no weight.
    const ships = !/^(no|n|false|0)$/i.test(str(r.requires_shipping));
    const missing = rule.required.filter((k) => (ships || k !== 'weight') && !present(k)); if (missing.length) f.push(finding('missing_fields', null, `${sku}: ${missing.join(', ')} missing.`));
    const title = str(r.title); if (title && title.length > rule.title_max) f.push(finding('title_too_long', null, `${sku}: title is ${title.length} characters; your limit for ${channelLabel(ch) || 'this channel'} is ${rule.title_max}.`));
    const g = str(r.gtin).replace(/[\s-]/g, '');
    if (g && !gtinValid(g)) f.push(finding('gtin_invalid', null, `${sku}: GTIN ${g} has a wrong check digit or length.`));
    const gl = g ? gsorted.get(g) || [] : [];
    if (gl.length > 1 && gl[0] !== sku) { const others = []; for (const x of gl) { if (x !== sku) others.push(x); if (others.length > 5) break; } f.push(finding('gtin_shared', null, `${sku}: GTIN ${g} is also used by ${gl.length - 1} other SKU(s): ${others.slice(0, 5).join(', ')}${gl.length - 1 > 5 ? ', …' : ''}.`)); }
    if (ships && present('weight') && num(r.weight) <= 0) f.push(finding('weight_zero', null, `${sku}: weight is ${r.weight}.`));
    if (present('price') && num(r.price) <= 0) f.push(finding('price_zero', null, `${sku}: price is ${r.price}.`));
    if (num(r.image_count) !== null && num(r.image_count) < rule.min_images) f.push(finding('images_below_min', null, `${sku}: ${num(r.image_count)} image(s); your minimum is ${rule.min_images}.`));
    const desc = str(r.description).replace(/<[^>]*>/g, ''); if (desc && desc.length < rule.min_description) f.push(finding('description_short', null, `${sku}: description is ${desc.length} characters; your minimum is ${rule.min_description}.`));
    const need = rule.required.filter((k) => ships || k !== 'weight'); const filled = need.filter(present).length;
    items.push({ id: r.id, channel: channelLabel(ch) || '', sku, title, gtin: g, completeness_pct: need.length ? Math.round((filled / need.length) * 100) : 100, problems: f.length, status: f.length ? 'fix' : 'ok', findings: f });
  }
  const sorted = sortBy(items);
  return { products: sorted.length, ...byStatus(sorted, ['fix', 'ok']), average_completeness_pct: sorted.length ? round2(sorted.reduce((a, i) => a + i.completeness_pct, 0) / sorted.length) : null, by_channel: rollup(sorted, (i) => i.channel || 'all', ['problems']).map(({ key, ...v }) => ({ channel: key, ...v })), by_finding: byFinding(sorted), items: sorted };
}

export function fixListText(items) {
  const rows = items.filter((i) => i.status === 'fix');
  return { skus: rows.map((i) => i.id), text: ['# Product data fix list', '', '**For:** [TO CONFIRM the person who maintains product data]', '', '| Channel | SKU | Problem | Fix |', '| --- | --- | --- | --- |', ...rows.flatMap((i) => i.findings.map((f) => `| ${i.channel} | ${i.sku} | ${f.detail} | [CHECK new value] |`))].join('\n') };
}
