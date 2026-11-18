import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { LISTING_FIELDS, LISTING_PROFILES, CATALOG_FIELDS, LISTING_SETTINGS_SCHEMA, findDuplicates, cleanupText } from './listings.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  listings: { type: 'string', description: 'Listings from every channel under --root: channel, listing id, SKU, title, GTIN, price, status' },
  catalog: { type: 'string', description: 'Your catalog under --root (optional): one SKU per row' },
  settings: { type: 'string', description: 'Optional settings JSON: title_similarity' },
};
const run = (a, ctx) => findDuplicates(ctx.records(a.listings, 'listings'), a.catalog ? ctx.records(a.catalog, 'catalog') : null, a.settings ? ctx.readJson(a.settings, 'listing_settings') : {});
const line = (r) => `${r.listings} listing(s): ${r.fix} to clean up (duplicates and orphans), ${r.review} to review (look-alike titles, shared GTINs), ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'listings', label: 'Fairshop Duplicate Listings',
  description: 'Finds duplicate and orphan listings across channels: the same SKU listed twice on one channel (and at different prices), look-alike titles under different SKUs, one GTIN shared by several SKUs, and listings for SKUs not in your catalog. Drafts a clean-up list; a person ends or merges listings.',
  files, required: ['listings'],
  sources: { listings: { label: 'Listings', args: ['listings'], fields: LISTING_FIELDS, profiles: LISTING_PROFILES }, catalog: { label: 'Catalog SKUs', args: ['catalog'], fields: CATALOG_FIELDS } },
  configSchemas: { listing_settings: LISTING_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Find duplicate and orphan listings', description: 'Check every active listing for a second listing of the same SKU on its channel, look-alike titles, shared GTINs and SKUs missing from your catalog.' },
  explain: { arg: 'listing', argDescription: 'Listing id, SKU or GTIN item id from listings_audit', title: 'Explain one listing', description: 'Show one listing (or SKU) and why it was flagged.', match: (i, w) => i.listing_id.toUpperCase() === w.toUpperCase() || i.id.toUpperCase() === w.toUpperCase() || i.sku === w.toUpperCase(), text: (i) => `${i.id} (${i.sku}): ${i.status}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'duplicate-listings', title: 'Duplicate and orphan listings', description: 'Write duplicate-listings.csv and .html (by channel, every listing to clean up or review) into out_dir (default fairshop-out/listings).',
    columns: ['id', 'channel', 'listing_id', 'sku', 'title', 'gtin', 'price', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['channel', 'listing_id', 'sku', 'title', 'price', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'channel', 'listing_id', 'sku', 'title', 'gtin', 'price']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, count: v.count })), columns: ['code', 'count'] }],
    limits: [LIMITS.files, 'Look-alike titles are matched by shared words; variants (sizes, colours) can look alike on purpose.', LIMITS.advice],
  },
  draft: {
    noun: 'cleanup_list', verb: 'approve', category: 'go_live',
    description: 'Write drafts/cleanup_list-listings.md: every listing to clean up or review with a blank action. Marked DRAFT. Approving goes through listings_request_approve (one click); a person ends, merges or relinks listings.',
    build: (a, ctx, r) => { const d = cleanupText(r.items); if (!d.listings.length) throw new Error('no listing needs cleaning up'); return { id: 'listings', text: d.text, extra: { listings: d.listings } }; },
  },
  refused: [
    { name: 'listing_end', category: 'go_live', description: 'Fairshop Duplicate Listings never ends a listing.' },
    { name: 'listing_merge', category: 'go_live', description: 'Fairshop Duplicate Listings never merges or relinks listings.' },
  ],
  prompt: { name: 'duplicate_listings', title: 'Find duplicate and orphan listings', description: 'Walks the host model through a listing clean-up.',
    text: 'You are helping a seller clean up listings with fairshop-duplicate-listings. Listings: {{listings}}.\n\nRules: listing_end and listing_merge are blocked.\n\n1. Call listings_audit (with the catalog when available). Lead with duplicates priced differently.\n2. listings_explain for a listing.\n3. listings_write_report.\n4. Offer listings_draft_cleanup_list; listings_request_approve only when asked (one named click).' },
});
