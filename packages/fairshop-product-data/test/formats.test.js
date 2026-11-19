// Real store layouts (final pass, 19 Nov 2026): found by running the agent on Shopify's and WooCommerce's own
// published sample files. Small fictional files in the same layouts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AgentRuntime } from 'fairshop-core';
import { manifest, firstBarcode } from '../src/index.js';

async function check(csv) {
  const root = mkdtempSync(join(tmpdir(), 'fmt-')); writeFileSync(join(root, 'p.csv'), csv);
  const r = await new AgentRuntime(manifest, { root, audit: false, memory: false, pii: 'off' }).call('catalog_audit', { products: 'p.csv' });
  assert.equal(r.status, 'executed');
  return { items: Object.fromEntries(r.result.items.map((i) => [i.sku, i.findings.map((f) => f.detail || f.code).join(' | ')])), sources: r.result.sources || [] };
}
const desc = 'A sturdy example product described at enough length to pass the default minimum of one hundred characters.';

test('barcode cells: the first code, without its "ean:" or "isbn:" label or hyphens', () => {
  assert.equal(firstBarcode('ean:9520000000011; upc:012345678905'), '9520000000011');
  assert.equal(firstBarcode('isbn:978-1-4028-9462-6'), '9781402894626');
  assert.equal(firstBarcode(' 9520000000028 '), '9520000000028');
  assert.equal(firstBarcode(''), '');
});

test('Shopify classic layout: product columns are filled down by handle, image-only rows are not products', async () => {
  const { items } = await check([
    'Handle,Title,Body (HTML),Vendor,Type,Variant SKU,Variant Grams,Variant Price,Variant Barcode,Variant Requires Shipping,Image Src',
    `example-mug,Example Mug,"${desc}",Example Pottery,Mugs,MUG-S,300,18.00,9520000000011,TRUE,https://img.example.test/a.jpg`,
    'example-mug,,,,,MUG-L,400,20.00,9520000000028,TRUE,',
    'example-mug,,,,,,,,,,https://img.example.test/b.jpg',
  ].join('\n'));
  assert.deepEqual(Object.keys(items).sort(), ['MUG-L', 'MUG-S']);
  assert.equal(items['MUG-L'], '', 'the variant row takes the title, description and vendor of its product');
});

test('Shopify current layout ("URL handle", "Variant Barcodes"): digital products need no weight', async () => {
  const { items } = await check([
    'Title,URL handle,Description,Vendor,Type,SKU,Variant Barcodes,Price,Weight value (grams),Requires shipping,Product image URL,Variant image URL',
    `Example Tee,example-tee,"${desc}",Example Threads,Shirts,TEE-S,ean:9520000000035; upc:012345678905,19.99,150,TRUE,https://img.example.test/t.jpg,`,
    'Example Tee,example-tee,,,,TEE-M,9520000000042,19.99,170,TRUE,,',
    `Example Guide,example-guide,"${desc}",Example Threads,Books,GUIDE-PDF,isbn:978-1-4028-9462-6,9.99,,FALSE,https://img.example.test/g.jpg,`,
  ].join('\n'));
  assert.equal(items['TEE-S'], ''); assert.equal(items['TEE-M'], '');
  assert.equal(items['GUIDE-PDF'], '', 'no weight is asked of a product that does not ship');
});

test('WooCommerce layout: variations take the parent\'s description, images and weight; the parent row is not a product', async () => {
  const { items } = await check([
    'ID,Type,SKU,Name,Description,Short description,Weight (lbs),Regular price,Images,Parent,GTIN,Brands',
    `10,variable,EX-HOODIE,Example Hoodie,"${desc}",,1.5,,"https://img.example.test/h1.jpg, https://img.example.test/h2.jpg",,,Example Threads`,
    '11,variation,EX-HOODIE-RED,Example Hoodie - Red,,,,45,,EX-HOODIE,9520000000059,Example Threads',
    `12,"simple, downloadable, virtual",EX-ALBUM,Example Album,"${desc}",,,15,https://img.example.test/a.jpg,,9520000000066,Example Threads`,
    `13,external,EX-PENNANT,Example Pennant,"${desc}",,,11.05,https://img.example.test/p.jpg,,9520000000073,Example Threads`,
  ].join('\n'));
  assert.deepEqual(Object.keys(items).sort(), ['EX-ALBUM', 'EX-HOODIE-RED', 'EX-PENNANT']);
  assert.equal(items['EX-HOODIE-RED'], ''); assert.equal(items['EX-ALBUM'], ''); assert.equal(items['EX-PENNANT'], '');
});

test('an 8-digit UPC-E code passes when its expanded UPC-A does (final pass, real barcodes)', async () => {
  const { gtinValid, upcEToA } = await import('../src/index.js');
  assert.equal(upcEToA('01234565'), '012345000065'); assert.ok(gtinValid('01234565'));
  assert.ok(!gtinValid('06153153'), 'fails as EAN-8 and as UPC-E');
});
