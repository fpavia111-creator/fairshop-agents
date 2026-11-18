import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { PRICE_FIELDS, MAP_POLICY_SCHEMA, checkMap, noticeText } from './map.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  prices: { type: 'string', description: 'Advertised prices under --root (your own channel exports and any price checks you collected): date, seller, channel, SKU, price, own (yes/no)' },
  policy: { type: 'string', description: 'MAP policy JSON: minimum advertised price per SKU, exempt sellers, paused date ranges' },
};
const run = (a, ctx) => checkMap(ctx.records(a.prices, 'prices'), ctx.readJson(a.policy, 'map_policy'));
const line = (r) => `${r.observations} price(s) from ${r.sellers} seller(s): ${r.own} of your own listing(s) below MAP, ${r.notice} reseller listing(s) below MAP, ${r.review} SKU(s) not on your list, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'map', label: 'Fairshop MAP Pricing',
  description: 'Checks advertised prices from your own channels and from resellers against your minimum advertised price list: your own listings below MAP first, resellers below it (and repeat ones), exempt sellers and paused dates, and SKUs not on the list. Drafts a notice per reseller; a person sends it.',
  files, required: ['prices', 'policy'],
  sources: { prices: { label: 'Advertised prices', args: ['prices'], fields: PRICE_FIELDS } },
  configSchemas: { map_policy: MAP_POLICY_SCHEMA },
  run, line,
  check: { title: 'Check advertised prices against MAP', description: 'Group prices by seller and SKU and compare each with your minimum advertised price, minding exempt sellers and paused dates.' },
  explain: { arg: 'seller', argDescription: 'Seller name or seller|SKU id from map_audit', title: 'Explain one seller', description: 'Show every SKU of one seller with its lowest price and MAP.', match: (i, w) => i.seller.toLowerCase() === w.toLowerCase() || i.id.toLowerCase() === w.toLowerCase(), text: (i) => `${i.id}: ${i.status}, lowest ${i.lowest}, MAP ${i.map ?? 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'map-pricing', title: 'Advertised prices against MAP', description: 'Write map-pricing.csv and .html (by seller, every listing below MAP) into out_dir (default fairshop-out/map).',
    columns: ['id', 'seller', 'sku', 'own', 'map', 'lowest', 'observations', 'last_seen', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['seller', 'sku', 'map', 'lowest', 'last_seen', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'seller', 'sku', 'own', 'map', 'lowest', 'observations', 'last_seen']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By seller', rows: r.by_seller, columns: ['seller', 'skus', 'below_map'] }],
    limits: [LIMITS.files, 'Prices are the ones in your files, on the dates they were seen; a listing may have changed since.', 'Not legal advice. What you may ask of a reseller depends on your policy and agreements.'],
  },
  draft: {
    noun: 'map_notice', verb: 'send', category: 'binding_send',
    description: 'Write drafts/map_notice-<seller>.md listing the SKUs one reseller advertised below MAP. Marked DRAFT. Sending goes through map_request_send (one click); a person sends it.',
    required: ['seller'], args: { seller: { type: 'string', description: 'Reseller to write to, as named in the prices file' }, from: { type: 'string', description: 'Your name and brand' } },
    build: (a, ctx, r) => { const d = noticeText(r.items, a); if (!d.skus.length) throw new Error(`no listing of "${String(a.seller).slice(0, 40)}" is below MAP`); return { id: a.seller, text: d.text, extra: { skus: d.skus } }; },
  },
  refused: [
    { name: 'own_price_update', category: 'go_live', description: 'Fairshop MAP Pricing never changes your prices.' },
    { name: 'reseller_account_suspend', category: 'revoke_access', description: 'Fairshop MAP Pricing never suspends or cuts off a reseller.' },
  ],
  prompt: { name: 'map_pricing', title: 'Check advertised prices against MAP', description: 'Walks the host model through a MAP check.',
    text: 'You are helping a brand check advertised prices with fairshop-map-pricing. Prices: {{prices}}. Policy: {{policy}}.\n\nRules: no legal claims about resellers. own_price_update and reseller_account_suspend are blocked.\n\n1. Call map_audit. Lead with your own listings below MAP, then repeat resellers.\n2. map_explain for a seller.\n3. map_write_report.\n4. Offer map_draft_map_notice per reseller; map_request_send only when asked (one named click).' },
});
