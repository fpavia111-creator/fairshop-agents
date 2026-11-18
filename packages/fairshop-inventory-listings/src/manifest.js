import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { STOCK_FIELDS, STOCK_PROFILES, LISTING_FIELDS, LISTING_PROFILES, INVENTORY_SETTINGS_SCHEMA, compareListings, updatesText } from './inventory.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  stock: { type: 'string', description: 'Stock by location under --root (Shopify inventory, WMS, 3PL or FBA export): SKU, location, on hand, committed' },
  listings: { type: 'string', description: 'Channel listings under --root (Amazon All Listings, eBay listings or your own CSV): channel, SKU, listing id, listed quantity, status, fulfilment' },
  settings: { type: 'string', description: 'Optional settings JSON: which locations feed fba and merchant listings, units held back per channel' },
};
const run = (a, ctx) => compareListings(ctx.records(a.stock, 'stock'), ctx.records(a.listings, 'listings'), a.settings ? ctx.readJson(a.settings, 'inventory_settings') : {});
const line = (r) => `${r.listings} listing(s): ${r.fix} to correct (${r.oversell_units} unit(s) could be oversold), ${r.review} to review (${r.stranded_units} unit(s) in stock with no listing), ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'inventory', label: 'Fairshop Inventory Listings',
  description: 'Compares stock by location (warehouse, 3PL, FBA) with the quantity listed on each channel: listings above what their locations can ship, listings at zero while stock sits on the shelf, inactive listings with stock, listings for unknown SKUs and stock listed nowhere. Drafts quantity corrections; a person changes listings.',
  files, required: ['stock', 'listings'],
  sources: { stock: { label: 'Stock by location', args: ['stock'], fields: STOCK_FIELDS, profiles: STOCK_PROFILES }, listings: { label: 'Channel listings', args: ['listings'], fields: LISTING_FIELDS, profiles: LISTING_PROFILES } },
  configSchemas: { inventory_settings: INVENTORY_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Compare stock with channel listings', description: 'For every listing, work out what its locations can ship (less committed units and any buffer) and compare it with the listed quantity; list stock with no listing.' },
  explain: { arg: 'sku', argDescription: 'SKU or listing id from inventory_audit', title: 'Explain one SKU', description: 'Show every listing and the stock of one SKU.', match: (i, w) => i.sku === w.toUpperCase() || i.id.toUpperCase() === w.toUpperCase() || i.listing_id.toUpperCase() === w.toUpperCase(), text: (i) => `${i.id}: ${i.status}, listed ${i.listed}, can ship ${i.can_ship}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'inventory-listings', title: 'Stock on hand against channel listings', description: 'Write inventory-listings.csv and .html (by channel, every listing to correct or review, stock listed nowhere) into out_dir (default fairshop-out/inventory).',
    columns: ['id', 'channel', 'sku', 'listing_id', 'fulfillment', 'listed', 'can_ship', 'suggested', 'status', 'oversell_units', 'findings', 'reasons', 'decision'],
    htmlColumns: ['channel', 'sku', 'listing_id', 'listed', 'can_ship', 'suggested', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'channel', 'sku', 'listing_id', 'fulfillment', 'listed', 'can_ship', 'suggested'], 'oversell_units'),
    sections: (r) => [{ title: 'By channel', rows: r.by_channel, columns: ['channel', 'count', 'listed', 'can_ship', 'oversell_units'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] }],
    limits: [LIMITS.files, 'Files exported at different times disagree by the orders in between; export stock and listings together.', LIMITS.advice],
  },
  draft: {
    noun: 'quantity_corrections', verb: 'approve', category: 'go_live',
    description: 'Write drafts/quantity_corrections-listings.md: every listing to correct with the quantity its locations can ship. Marked DRAFT. Approving goes through inventory_request_approve (one click); a person changes the listings.',
    build: (a, ctx, r) => { const d = updatesText(r.items); if (!d.listings.length) throw new Error('no listing needs a quantity correction'); return { id: 'listings', text: d.text, extra: { listings: d.listings } }; },
  },
  refused: [
    { name: 'listing_quantity_push', category: 'go_live', description: 'Fairshop Inventory Listings never changes a quantity on a channel.' },
    { name: 'inventory_transfer_create', category: 'go_live', description: 'Fairshop Inventory Listings never creates transfers or shipments between locations.' },
  ],
  prompt: { name: 'inventory_vs_listings', title: 'Find listings that can oversell', description: 'Walks the host model through stock against listings.',
    text: 'You are helping a multichannel seller compare stock with listings, using fairshop-inventory-listings. Stock: {{stock}}. Listings: {{listings}}.\n\nRules: listing_quantity_push and inventory_transfer_create are blocked.\n\n1. Call inventory_audit. Lead with listings that could oversell.\n2. inventory_explain for a SKU.\n3. inventory_write_report.\n4. Offer inventory_draft_quantity_corrections; inventory_request_approve only when asked (one named click).' },
});
