import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { PRODUCT_FIELDS, PRODUCT_PROFILES, CATALOG_SETTINGS_SCHEMA, checkCatalog, fixListText } from './catalog.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  products: { type: 'string', description: 'Product export under --root (Shopify products, Amazon flat file, WooCommerce or your own CSV): SKU, channel, title, description, GTIN, brand, weight, image count, price, HS code, origin' },
  settings: { type: 'string', description: 'Optional settings JSON: per channel the title limit, required fields, minimum images and description length you work to' },
};
const run = (a, ctx) => checkCatalog(ctx.records(a.products, 'products'), a.settings ? ctx.readJson(a.settings, 'catalog_settings') : {});
const line = (r) => `${r.products} product row(s): ${r.fix} to fix, ${r.ok} complete; average completeness ${r.average_completeness_pct}%.`;

export const manifest = shopAgent({
  pkg, prefix: 'catalog', label: 'Fairshop Product Data',
  description: 'Checks product data before it goes to a channel: missing GTIN, brand, weight, price or images, titles over the limit you set, GTINs with a wrong check digit or shared by two SKUs, zero weights and prices, and thin descriptions. Drafts the fix list; a person changes listings.',
  files, required: ['products'],
  sources: { products: { label: 'Product data', args: ['products'], fields: PRODUCT_FIELDS, profiles: PRODUCT_PROFILES } },
  configSchemas: { catalog_settings: CATALOG_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check product data completeness', description: 'Check every product row against the rules you set per channel and the GTIN check digit; returns what to fix and completeness per row.' },
  explain: { arg: 'sku', argDescription: 'SKU or row id from catalog_audit', title: 'Explain one product', description: 'Show every problem found on one product.', match: (i, w) => i.sku === w.toUpperCase() || i.id.toUpperCase() === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}, ${i.completeness_pct}% complete. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'product-data', title: 'Product data completeness', description: 'Write product-data.csv and .html (by channel, every product to fix) into out_dir (default fairshop-out/catalog).',
    columns: ['id', 'channel', 'sku', 'title', 'gtin', 'completeness_pct', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['channel', 'sku', 'completeness_pct', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'channel', 'sku', 'title', 'gtin', 'completeness_pct']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'problems'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, count: v.count })), columns: ['code', 'count'] }],
    limits: [LIMITS.files, 'Title limits and required fields are your settings; channels change their rules.', 'A valid check digit does not mean the GTIN is registered to you.', LIMITS.advice],
  },
  draft: {
    noun: 'fix_list', verb: 'approve', category: 'go_live',
    description: 'Write drafts/fix_list-products.md: one line per problem with a blank fix. Marked DRAFT. Approving goes through catalog_request_approve (one click); a person changes the product data.',
    build: (a, ctx, r) => { const d = fixListText(r.items); if (!d.skus.length) throw new Error('every product row is complete'); return { id: 'products', text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'listing_update', category: 'go_live', description: 'Fairshop Product Data never changes a product or listing.' },
    { name: 'feed_submit', category: 'go_live', description: 'Fairshop Product Data never submits a feed to a channel.' },
  ],
  prompt: { name: 'product_data', title: 'Check product data before listing', description: 'Walks the host model through product data checks.',
    text: 'You are helping a seller fix product data with fairshop-product-data. Products: {{products}}.\n\nRules: limits are the seller\'s settings. listing_update and feed_submit are blocked.\n\n1. Call catalog_audit (with settings when available). Lead with missing GTINs and invalid ones.\n2. catalog_explain for a SKU.\n3. catalog_write_report.\n4. Offer catalog_draft_fix_list; catalog_request_approve only when asked (one named click).' },
});
