// Writes sales/final-pass.json (node scripts/final-pass.mjs) in the shape FINAL-PASS-REQUEST.md gives. Numbers from docs/accuracy-2026-11-19.json,
// docs/model-view-2026-11-19.json and docs/realdata-2026-11-19.json; formats from the agents' manifests.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const acc = JSON.parse(readFileSync('docs/accuracy-2026-11-19.json', 'utf8')).family;
const mv = JSON.parse(readFileSync('docs/model-view-2026-11-19.json', 'utf8'));
const canaries = mv.reduce((t, o) => t + o.canaries, 0); const leaks = mv.reduce((t, o) => t + o.leaked.length, 0);
const withPii = mv.filter((o) => o.masked.length).length;

const formats = new Map();
for (const n of readdirSync('packages').filter((x) => /^fairshop-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(`packages/${n}/src/index.js`).href);
  for (const s of Object.values(manifest.sources || {})) for (const p of s.profiles || []) {
    if (formats.has(p.id)) continue;
    formats.set(p.id, [p.system, p.label, p.basis === 'sample' ? 'tested on a public sample' : 'written from documentation']);
  }
}
const order = (a, b) => (a[2] === b[2] ? (a[0] + a[1] < b[0] + b[1] ? -1 : 1) : a[2] === 'tested on a public sample' ? -1 : 1);

const out = {
  product: 'Fairshop',
  repo: 'https://github.com/fpavia111-creator/fairshop-agents',
  try_it: ['git clone https://github.com/fpavia111-creator/fairshop-agents', 'cd fairshop-agents', 'npm install', 'node packages/fairshop-payouts/bin/fairshop-payouts.js demo'],
  accuracy: {
    agents: acc.agents, planted_found: acc.planted_found, planted_total: acc.planted_total, clean_rows: acc.clean_rows, clean_false_positives: acc.clean_false_positives, mutation_cases: acc.mutation_cases, mutation_caught: acc.mutation_caught,
    note: `On fictional test data, 19 Nov 2026. The clean set covers ${acc.clean_agents} of the ${acc.agents} agents: marketplace claims and carrier adjustments give every open claim or adjustment a finding that says how to answer it, so a file of them never has zero findings. ${acc.near_misses} planted near-misses (inside a window, under a threshold, exempt) gave no finding. This pass found and fixed one wrong finding on fictional data (an FBA unit lost in the warehouse was reported as damaged) and six kinds of wrong finding on the vendors' own sample files (product and inventory layouts).`,
  },
  real_data: [
    ['UCI Machine Learning Repository: Online Retail (a real UK online gift shop, Dec 2010 to Dec 2011)', 'https://archive.ics.uci.edu/dataset/352/online+retail', '2026-11-19', 'CC BY 4.0', 'fairshop-return-reasons on all 541,909 published rows, read from the published Excel file in 20 seconds (cancellations stand in for returns): 127 stock codes returned at 15% or more and 183 customers who cancelled most of their orders; 0 disagreements with an independent re-count. Two of the 127 were not products (manual adjustments, bank charges), so an ignore_skus setting was added.'],
    ['UCI Machine Learning Repository: Online Retail (same file, the shop\'s catalogue)', 'https://archive.ics.uci.edu/dataset/352/online+retail', '2026-11-19', 'CC BY 4.0', 'fairshop-duplicate-listings on 3,812 real product titles: 32 listings whose title cannot be told apart from another stock code\'s; 0 disagreements with a brute-force comparison of all 7.3 million pairs. Read by hand, most look like colour or size variants whose titles leave the variant out.'],
    ['Shopify product CSV template and inventory CSV template (Shopify\'s own sample files)', 'https://help.shopify.com/en/manual/products/import-export/using-csv', '2026-11-19', 'Published by Shopify as samples for its importer', 'fairshop-product-data and fairshop-inventory-listings. Found four problems, now fixed: the current product layout was not recognised, variant rows were reported as missing their title and brand (Shopify writes those on the first row only), digital products were asked for a weight, and a stock row with no SKU was reported as a SKU named "". After the fixes, every finding was checked by hand: 0 wrong.'],
    ['WooCommerce sample_products.csv', 'https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/sample-data', '2026-11-19', 'GPL-3.0', 'fairshop-product-data on 25 sample products. Every row had been reported as missing its price and weight (WooCommerce names them differently and keeps them on variations); a WooCommerce layout was added. Now the only findings are the barcode and brand columns this export does not have: 0 wrong.'],
    ['Open Food Facts product database (400 products through its public search API)', 'https://world.openfoodfacts.org/data', '2026-11-19', 'ODbL 1.0 (database), DbCL 1.0 (contents)', 'fairshop-product-data on 400 real barcodes: 2 fail the GS1 check digit and 17 products lack a name or brand; 0 disagreements with an independent check-digit re-count. Support for 8-digit UPC-E codes was added on the way.'],
  ],
  formats: [...formats.values()].sort(order),
  human_review: [
    ['Payouts check', 'A bookkeeper confirms each unpaid, short or doubled payout against the marketplace or processor statement and sends any inquiry; a person reviews and posts each settlement journal entry.'],
    ['Marketplace money back', 'A person checks each FBA claim, storage fee and fee dispute against Seller Central before filing it, and writes and submits every claim response; nothing is filed or answered by the agents.'],
    ['Returns and promotions', 'Customer service decides each refund, chase and reminder; a manager decides what to do about a discount code or a repeat returner; finance confirms gift card liability and every affiliate reversal before payout.'],
    ['Sales tax pack', 'Your tax adviser confirms the rates, registrations and thresholds in the settings and decides every filing and registration; the agents only compare and draft a worksheet.'],
    ['Inventory and listings', 'A merchandiser decides each listing, price, reorder and ad change in the channel itself; the agents never change a listing, price, budget or purchase order.'],
    ['Shipping and purchasing', 'Someone in operations disputes carrier, 3PL and retailer charges in each portal, approves supplier invoices and updates product costs; drafts are sent only by a person.'],
    ['Store cash and shrink', 'A store manager talks through each drawer shortage and missing deposit with the staff involved and decides on any recount; shrink figures are for the manager, not for staff records.'],
    ['Whole shop', 'Every finding in every pack goes to a named person, who looks and acts; the agents only read files and write reports and drafts.'],
    ['Multi-brand business', 'Each brand or account owner reviews their own findings, and settings (fees, tax, thresholds) are confirmed separately for each one.'],
    ['Partner rollout', 'The firm\'s staff review each client\'s findings and confirm each client\'s settings with that client before acting on anything.'],
  ],
  common_problems: [
    'Orders never paid out or paid short by a marketplace (an Amazon order paid 2.00 short in the demo week).',
    'Fees above your schedule: a 20% referral charged on a home item, a fulfilment fee 0.88 above the fixed amount.',
    'FBA units lost in the warehouse and never reimbursed, and refunds whose return never came back, each with a claim-by date.',
    'Refunds paid twice or above the price, and items received back that were never refunded.',
    'Affiliate commission paid on refunded orders, or at a rate above your terms.',
    'Listings that can oversell what the warehouse can ship, and stock sitting on a shelf with no live listing.',
    'Shipping labels costing more than the customer was charged, and voided labels never refunded.',
    'Retailer deductions your signed proof of delivery disproves, and promo allowances above what was agreed.',
  ],
  reaches_the_model: `When an assistant calls a tool, its model sees the result: totals, findings, amounts, quantities, dates, rates, SKUs, order, listing and tracking numbers and finding codes in clear, and text such as product titles, campaign names, seller names, and return and cancel reasons exactly as they were typed. Shopper names and e-mails become stable pseudonyms such as CUS-3f9a2c1b, staff names STAFF-…, affiliate names AFF-…, street addresses [ADDRESS], phone numbers [PHONE] and card numbers [CARD] (checked in the ${withPii} agents that read personal data with ${canaries} planted fictional values: ${leaks} leaks). Free text is sent as typed unless it contains a name already read from a personal column. The report and draft files written on your computer keep the real values. Results go to whatever model your assistant uses; for shopper or staff data, use a model covered by your own agreements or a local model.`,
  rules_maintained: 'Every rule that changes with a marketplace, carrier, processor or state is a setting, not code: fee schedules, FBA storage rates and aged-inventory brackets, sales tax rates and registrations, nexus thresholds, reserve terms, MAP lists, affiliate and 3PL rates, payout timing and claim windows. Most ship with no real value at all (the demo values are fictional); a few have a built-in default that mirrors a vendor rule as of November 2026 (FBA claim windows, the dimensional weight divisor, carrier dispute and label refund windows), listed with where each lives in docs/rules-2026-11-19.md. Your own values go in each agent\'s settings file, and every result names the settings files it used. You change the file yourself, or support updates it when a vendor or state announces a change.',
};
writeFileSync('sales/final-pass.json', JSON.stringify(out, null, 2) + '\n');
console.log(`formats ${out.formats.length} (${out.formats.filter((f) => f[2] === 'tested on a public sample').length} on a public sample); accuracy ${JSON.stringify(out.accuracy).slice(0, 160)}`);
