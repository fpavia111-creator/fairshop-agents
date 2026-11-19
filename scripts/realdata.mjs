#!/usr/bin/env node
// Real public data, in its published format, through the agents (final pass, 19 Nov 2026). Nothing private is
// used. Downloads go to _realdata/ (git-ignored); only this script and the results are committed.
//
//   node scripts/realdata.mjs --download     fetch the public files (needs the network)
//   node scripts/realdata.mjs                convert, run the agents, re-count independently, write docs/realdata-2026-11-19.*
//
// Sources
//   1. UCI Machine Learning Repository, "Online Retail" (Chen, 2015; doi:10.24432/C5BW33), CC BY 4.0: every
//      transaction of a real UK online gift shop, Dec 2010 to Dec 2011, as published (Excel). Cancellations
//      (invoice numbers starting with C) are read as returns. Used for fairshop-return-reasons and
//      fairshop-duplicate-listings.
//   2. Shopify's product CSV template and inventory CSV template (help.shopify.com/csv/...), the vendor's own
//      sample files. Used for fairshop-product-data and fairshop-inventory-listings.
//   3. WooCommerce's sample_products.csv (woocommerce/woocommerce on GitHub, GPL-3.0). Used for fairshop-product-data.
//   4. Open Food Facts product database (ODbL 1.0), up to 500 products through its public search API: real barcodes,
//      names and brands. Used for fairshop-product-data's barcode and completeness checks.
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, readRecords, readZip, toCsv } from '../packages/fairshop-core/src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RD = join(ROOT, '_realdata'); const RAW = join(RD, 'raw'); const RUN = join(RD, 'run');
const DATE = '2026-11-19';
const UA = { 'User-Agent': 'fairshop-agents real-data test (open source)' };
const SRC = {
  uci: { name: 'UCI Machine Learning Repository: Online Retail (Chen, 2015)', url: 'https://archive.ics.uci.edu/static/public/352/online+retail.zip', page: 'https://archive.ics.uci.edu/dataset/352/online+retail', licence: 'CC BY 4.0' },
  shopifyProducts: { name: 'Shopify product CSV template', url: 'https://help.shopify.com/csv/product_template.csv', page: 'https://help.shopify.com/en/manual/products/import-export/using-csv', licence: 'Published by Shopify as a sample for its importer; Shopify terms of service' },
  shopifyInventory: { name: 'Shopify inventory CSV template', url: 'https://help.shopify.com/csv/inventory_template.csv', page: 'https://help.shopify.com/en/manual/products/inventory/getting-started-with-inventory/inventory-csv', licence: 'Published by Shopify as a sample for its importer; Shopify terms of service' },
  woo: { name: 'WooCommerce sample_products.csv', url: 'https://raw.githubusercontent.com/woocommerce/woocommerce/trunk/plugins/woocommerce/sample-data/sample_products.csv', page: 'https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/sample-data', licence: 'GPL-3.0 (WooCommerce)' },
  off: { name: 'Open Food Facts product database (products read through its public search API)', url: 'https://world.openfoodfacts.org/cgi/search.pl', page: 'https://world.openfoodfacts.org/data', licence: 'ODbL 1.0 (database), DbCL 1.0 (contents)' },
};
const OFF_PAGES = 5;
const offUrl = (p) => `${SRC.off.url}?${new URLSearchParams({ action: 'process', json: '1', page_size: '100', page: String(p), fields: 'code,product_name,brands,quantity' })}`;

async function get(url, file) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(180000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      if (/\.json$/.test(file)) JSON.parse(buf.toString('utf8'));
      writeFileSync(file, buf); return;
    } catch (e) { if (i === 3) throw new Error(`${url}: ${e.message}`); await new Promise((res) => setTimeout(res, 8000 * i)); }
  }
}

if (process.argv.includes('--download')) {
  mkdirSync(RAW, { recursive: true });
  await get(SRC.uci.url, join(RAW, 'online-retail.zip'));
  const z = readZip(readFileSync(join(RAW, 'online-retail.zip')), { only: (n) => /\.xlsx$/i.test(n) });
  for (const [n, b] of z) writeFileSync(join(RAW, 'Online Retail.xlsx'), b), void n;
  await get(SRC.shopifyProducts.url, join(RAW, 'shopify-product_template.csv'));
  await get(SRC.shopifyInventory.url, join(RAW, 'shopify-inventory_template.csv'));
  await get(SRC.woo.url, join(RAW, 'woocommerce-sample_products.csv'));
  // Open Food Facts asks for no more than about 10 searches a minute.
  // A page it refuses (HTTP 503 when busy) is skipped; the results say how many products were read.
  for (let p = 1; p <= OFF_PAGES; p++) {
    if (existsSync(join(RAW, `off-page-${p}.json`))) continue;
    try { await get(offUrl(p), join(RAW, `off-page-${p}.json`)); } catch (e) { console.error(`Open Food Facts page ${p} skipped: ${e.message}`); }
    await new Promise((res) => setTimeout(res, 15000));
  }
  writeFileSync(join(RAW, 'downloaded.json'), JSON.stringify({ date: new Date().toISOString(), sources: SRC, off_pages: [...Array(OFF_PAGES)].map((_, i) => offUrl(i + 1)) }, null, 2));
  console.log(`Downloaded to ${RAW}`);
}
if (!existsSync(join(RAW, 'downloaded.json'))) { console.error('Run with --download first.'); process.exit(1); }
const downloaded = JSON.parse(readFileSync(join(RAW, 'downloaded.json'), 'utf8'));

rmSync(RUN, { recursive: true, force: true }); mkdirSync(RUN, { recursive: true });
async function run(agent, args, { pii = 'off' } = {}) {
  const { manifest } = await import(pathToFileURL(join(ROOT, 'packages', agent, 'src', 'index.js')).href);
  const tool = manifest.tools.find((t) => t.kind === 'read').name;
  const t0 = Date.now();
  const r = await new AgentRuntime(manifest, { root: RUN, audit: false, memory: false, pii }).call(tool, args);
  if (r.status !== 'executed') throw new Error(`${agent}: ${r.status} ${r.error || r.reason || ''}`);
  return { ...r.result, sources: r.sources || r.result.sources, ms: Date.now() - t0 };
}
const codes = (items) => { const m = {}; for (const i of items) for (const f of i.findings || []) m[f.code] = (m[f.code] || 0) + 1; return m; };
const pctOf = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const out = { date: DATE, downloaded: downloaded.date, runs: [] };
const note = (o) => { out.runs.push(o); console.log(`\n== ${o.agent} on ${o.source}\n   ${o.summary}`); for (const l of o.lines || []) console.log(`   ${l}`); };

// ---------------------------------------------------------------- 1. UCI Online Retail ----
const t0 = Date.now();
const uci = readRecords(join(RAW, 'Online Retail.xlsx'));
const readMs = Date.now() - t0;
const sku = (v) => String(v ?? '').trim().toUpperCase();
const sales = uci.filter((r) => !String(r.InvoiceNo).startsWith('C') && Number(r.Quantity) > 0 && Number(r.UnitPrice) > 0);
const cancels = uci.filter((r) => String(r.InvoiceNo).startsWith('C') && Number(r.Quantity) < 0);
const ORDER_COLS = ['order_id', 'sku', 'qty', 'order_date', 'customer_email'];
const RET_COLS = ['order_id', 'sku', 'return_date', 'reason', 'qty', 'customer_email'];
writeFileSync(join(RUN, 'uci-orders.csv'), toCsv(sales.map((r) => ({ order_id: r.InvoiceNo, sku: r.StockCode, qty: r.Quantity, order_date: String(r.InvoiceDate).slice(0, 10), customer_email: r.CustomerID ? `customer-${r.CustomerID}` : '' })), ORDER_COLS));
writeFileSync(join(RUN, 'uci-returns.csv'), toCsv(cancels.map((r) => ({ order_id: r.InvoiceNo, sku: r.StockCode, return_date: String(r.InvoiceDate).slice(0, 10), reason: '', qty: -Number(r.Quantity), customer_email: r.CustomerID ? `customer-${r.CustomerID}` : '' })), RET_COLS));

{ // 1a. return reasons: per-SKU return rate and repeat returners, re-counted here without the agent's code.
  const res = await run('fairshop-return-reasons', { orders: 'uci-orders.csv', returns: 'uci-returns.csv' });
  // The same check with the shop's non-product line codes left out (the ignore_skus setting).
  writeFileSync(join(RUN, 'uci-settings.json'), JSON.stringify({ ignore_skus: ['POST', 'DOT', 'C2', 'D', 'M', 'S', 'B', 'BANK CHARGES', 'AMAZONFEE', 'CRUK', 'PADS'] }));
  const res2 = await run('fairshop-return-reasons', { orders: 'uci-orders.csv', returns: 'uci-returns.csv', settings: 'uci-settings.json' });
  const flagged2 = res2.items.filter((i) => i.kind === 'sku' && i.findings.some((f) => f.code === 'sku_high_return_rate')).length;
  // Single orders cancelled in full on the day: an order-entry mistake, not a product coming back.
  const big = cancels.filter((r) => -Number(r.Quantity) >= 10000).map((r) => `${r.StockCode} ${-Number(r.Quantity)} units (${String(r.InvoiceDate).slice(0, 10)})`);
  const sold = new Map(), back = new Map(), ords = new Map(), rets = new Map();
  for (const r of sales) { const k = sku(r.StockCode); sold.set(k, (sold.get(k) || 0) + Math.abs(Number(r.Quantity))); if (r.CustomerID) (ords.get(r.CustomerID) || ords.set(r.CustomerID, new Set()).get(r.CustomerID)).add(String(r.InvoiceNo)); }
  for (const r of cancels) { const k = sku(r.StockCode); back.set(k, (back.get(k) || 0) + Math.abs(Number(r.Quantity))); if (r.CustomerID) (rets.get(r.CustomerID) || rets.set(r.CustomerID, new Set()).get(r.CustomerID)).add(String(r.InvoiceNo)); }
  const mySku = new Set([...new Set([...sold.keys(), ...back.keys()])].filter((k) => (sold.get(k) || 0) >= 10 && pctOf(back.get(k) || 0, sold.get(k) || 0) >= 15));
  const myCust = new Set([...new Set([...ords.keys(), ...rets.keys()])].filter((c) => { const n = (ords.get(c) || new Set()).size, x = (rets.get(c) || new Set()).size; return x >= 3 && n && pctOf(x, n) >= 50; }).map((c) => `customer-${c}`));
  const agSku = new Set(res.items.filter((i) => i.kind === 'sku' && i.findings.some((f) => f.code === 'sku_high_return_rate')).map((i) => i.sku));
  const agCust = new Set(res.items.filter((i) => i.kind === 'customer' && i.findings.some((f) => f.code === 'repeat_returner')).map((i) => i.customer_email));
  const diff = (a, b) => [...a].filter((x) => !b.has(x));
  const disagree = diff(mySku, agSku).length + diff(agSku, mySku).length + diff(myCust, agCust).length + diff(agCust, myCust).length;
  // Codes that are not products: postage, carriage, discounts, manual adjustments, fees, samples, bad debt.
  const NON_PRODUCT = /^(POST|DOT|C2|D|M|S|B|BANK CHARGES|AMAZONFEE|CRUK|PADS|ADJUST\d*|GIFT_\d+_\d+)$/;
  const flaggedNonProduct = [...agSku].filter((k) => NON_PRODUCT.test(k));
  const top = res.items.filter((i) => i.kind === 'sku' && agSku.has(i.sku)).sort((a, b) => b.units_returned - a.units_returned).slice(0, 8);
  note({ agent: 'fairshop-return-reasons', source: SRC.uci.name, url: SRC.uci.page, licence: SRC.uci.licence, rows: uci.length,
    summary: `${uci.length.toLocaleString('en-US')} published rows read from the Excel file in ${(readMs / 1000).toFixed(1)} s; ${sales.length.toLocaleString('en-US')} sale lines and ${cancels.length.toLocaleString('en-US')} cancellation lines (read as returns). Check ran in ${(res.ms / 1000).toFixed(1)} s: ${agSku.size} of ${res.skus} SKUs above a 15% return rate with 10+ units sold, ${agCust.size} customers who cancelled 3+ orders and half or more of their orders. Independent re-count: ${disagree} disagreement(s). With ignore_skus set to the shop's ${11} non-product codes: ${flagged2} SKUs.`,
    findings: codes(res.items), disagreements: disagree, flagged_skus: agSku.size, flagged_skus_with_ignore: flagged2, flagged_customers: agCust.size, flagged_non_product: flaggedNonProduct, single_order_mistakes: big,
    lines: [`flagged codes that are not products (postage, manual, discount, fees): ${flaggedNonProduct.join(', ') || 'none'}`, `cancellations of 10,000 units or more in one line: ${big.join('; ')}`, ...top.map((i) => `${i.sku}: ${i.units_returned} of ${i.units_sold} (${i.return_rate_pct}%)`)] });
}

{ // 1b. duplicate listings: the shop's catalogue, one listing per stock code with its most used description.
  const desc = new Map(); const price = new Map();
  for (const r of sales) { const k = sku(r.StockCode); const d = String(r.Description ?? '').trim(); if (!d) continue; const m = desc.get(k) || desc.set(k, new Map()).get(k); m.set(d, (m.get(d) || 0) + 1); if (!price.has(k)) price.set(k, r.UnitPrice); }
  const listings = [...desc.entries()].map(([k, m]) => ({ channel: 'Web shop', listing_id: k, sku: k, title: [...m.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0], gtin: '', price: price.get(k), status: 'active' }));
  writeFileSync(join(RUN, 'uci-listings.csv'), toCsv(listings, ['channel', 'listing_id', 'sku', 'title', 'gtin', 'price', 'status']));
  writeFileSync(join(RUN, 'uci-catalog.csv'), toCsv(listings.map((l) => ({ sku: l.sku })), ['sku']));
  const res = await run('fairshop-duplicate-listings', { listings: 'uci-listings.csv', catalog: 'uci-catalog.csv' });
  // Independent re-check: every pair of titles with word-set similarity of 0.9 or more, by brute force.
  const tok = (t) => new Set(String(t).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  const T = listings.map((l) => ({ id: `Web shop:${l.listing_id}`, sku: l.sku, title: l.title, w: tok(l.title) }));
  const pairs = [];
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i].w, b = T[j].w; let inter = 0; for (const x of a) if (b.has(x)) inter++;
    const jac = inter / (a.size + b.size - inter); if (jac >= 0.9) pairs.push([T[i], T[j]]);
  }
  // The agent flags the second listing of each pair (the first stays the reference), so compare by SKU.
  const inPair = new Set(pairs.flat().map((x) => x.sku));
  const flagged = res.items.filter((i) => i.findings.some((f) => f.code === 'near_duplicate_title'));
  const flaggedSkus = new Set(flagged.map((i) => i.sku));
  const notInPair = flagged.filter((i) => !inPair.has(i.sku)).length;
  const pairNotFlagged = pairs.filter(([a, b]) => !flaggedSkus.has(a.sku) && !flaggedSkus.has(b.sku)).length;
  note({ agent: 'fairshop-duplicate-listings', source: SRC.uci.name, url: SRC.uci.page, licence: SRC.uci.licence, rows: listings.length,
    summary: `${listings.length.toLocaleString('en-US')} listings (one per stock code). ${flagged.length} near-duplicate title(s) flagged in ${(res.ms / 1000).toFixed(1)} s; an independent brute-force comparison of all ${(T.length * (T.length - 1) / 2).toLocaleString('en-US')} pairs found ${pairs.length} pair(s) at 0.9 or more: ${notInPair + pairNotFlagged} disagreement(s).`,
    findings: codes(res.items), disagreements: notInPair + pairNotFlagged, pairs: pairs.map(([a, b]) => [`${a.sku}: ${a.title}`, `${b.sku}: ${b.title}`]),
    lines: pairs.slice(0, 40).map(([a, b]) => `${a.sku} "${a.title}"  ~  ${b.sku} "${b.title}"`) });
}

// ---------------------------------------------------------------- 2-3. vendor sample files ----
for (const [key, file] of [['shopifyProducts', 'shopify-product_template.csv'], ['woo', 'woocommerce-sample_products.csv']]) {
  cpSync(join(RAW, file), join(RUN, file));
  const res = await run('fairshop-product-data', { products: file });
  const src = (res.sources || [])[0] || {};
  note({ agent: 'fairshop-product-data', source: SRC[key].name, url: SRC[key].page, licence: SRC[key].licence, rows: res.products,
    summary: `${res.products} product row(s) read as ${src.system || ''} "${src.export || 'an unrecognised layout'}"; findings: ${Object.entries(codes(res.items)).map(([c, n]) => `${c} ${n}`).join(', ') || 'none'}.`,
    findings: codes(res.items), layout: src.export ? `${src.system} ${src.export}` : null,
    lines: res.items.filter((i) => i.findings.length).map((i) => `${i.sku}: ${i.findings.map((f) => f.detail).join(' ')}`) });
}
{
  cpSync(join(RAW, 'shopify-inventory_template.csv'), join(RUN, 'shopify-inventory_template.csv'));
  writeFileSync(join(RUN, 'listings-none.csv'), 'channel,sku,listing_id,listed_qty,status,fulfillment\n');
  const res = await run('fairshop-inventory-listings', { stock: 'shopify-inventory_template.csv', listings: 'listings-none.csv' });
  note({ agent: 'fairshop-inventory-listings', source: SRC.shopifyInventory.name, url: SRC.shopifyInventory.page, licence: SRC.shopifyInventory.licence, rows: 2,
    summary: `Stock rows read; findings: ${Object.entries(codes(res.items)).map(([c, n]) => `${c} ${n}`).join(', ')} (no listings file, so every item in stock is reported as not listed).`,
    findings: codes(res.items), lines: res.items.map((i) => `${i.id}: ${i.findings.map((f) => f.detail).join(' ')}`) });
}

// ---------------------------------------------------------------- 4. Open Food Facts ----
{
  const prods = []; for (let p = 1; p <= OFF_PAGES; p++) { const f = join(RAW, `off-page-${p}.json`); if (existsSync(f)) prods.push(...JSON.parse(readFileSync(f, 'utf8')).products); }
  const rows = prods.map((p) => ({ sku: `OFF-${p.code}`, channel: 'Web shop', title: p.product_name || '', gtin: p.code || '', brand: p.brands || '', price: '1.00', image_count: '1', description: '' }));
  writeFileSync(join(RUN, 'off-products.csv'), toCsv(rows, ['sku', 'channel', 'title', 'gtin', 'brand', 'price', 'image_count', 'description']));
  writeFileSync(join(RUN, 'off-settings.json'), JSON.stringify({ channels: { default: { required: ['title', 'gtin', 'brand'], min_images: 0, min_description: 0 } } }));
  const res = await run('fairshop-product-data', { products: 'off-products.csv', settings: 'off-settings.json' });
  // Independent check digit, written here again (GS1 mod 10 over GTIN-8, 12, 13, 14).
  const valid = (c) => { const d = String(c).replace(/[\s-]/g, ''); if (!/^\d+$/.test(d) || ![8, 12, 13, 14].includes(d.length)) return false; const ds = d.split('').map(Number); const chk = ds.pop(); let s = 0; ds.reverse().forEach((x, i) => { s += x * (i % 2 === 0 ? 3 : 1); }); return (10 - (s % 10)) % 10 === chk; };
  const mine = new Set(rows.filter((r) => r.gtin && !valid(r.gtin)).map((r) => r.sku.toUpperCase()));
  const theirs = new Set(res.items.filter((i) => i.findings.some((f) => f.code === 'gtin_invalid')).map((i) => i.sku));
  const disagree = [...mine].filter((x) => !theirs.has(x)).length + [...theirs].filter((x) => !mine.has(x)).length;
  const lens = {}; for (const r of rows) { const l = String(r.gtin).length; lens[l] = (lens[l] || 0) + 1; }
  const bad = res.items.filter((i) => i.findings.some((f) => f.code === 'gtin_invalid')).map((i) => i.gtin);
  note({ agent: 'fairshop-product-data', source: SRC.off.name, url: SRC.off.page, licence: SRC.off.licence, rows: rows.length,
    summary: `${rows.length} real products (barcode lengths: ${Object.entries(lens).map(([l, n]) => `${l} digits ${n}`).join(', ')}). ${theirs.size} barcode(s) failed the GS1 check digit or length, ${res.items.filter((i) => i.findings.some((f) => f.code === 'missing_fields')).length} product(s) lack a name or brand. Independent check-digit re-count: ${disagree} disagreement(s).`,
    findings: codes(res.items), disagreements: disagree, lines: [`barcodes that fail: ${bad.slice(0, 20).join(', ')}${bad.length > 20 ? ', …' : ''}`] });
}

mkdirSync(join(ROOT, 'docs'), { recursive: true });
writeFileSync(join(ROOT, 'docs', `realdata-${DATE}.json`), JSON.stringify(out, null, 2) + '\n');
console.log(`\nWrote docs/realdata-${DATE}.json (the write-up is in docs/realdata-${DATE}.md)`);
