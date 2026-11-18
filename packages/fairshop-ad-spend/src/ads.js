// Ad spend against sales and stock: pure functions over ad platform exports.
import { exportProfile, round2, str, num, isoDate, skuKey, monthOf, finding, byFinding, byStatus, sortBy } from 'fairshop-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const AD_PROFILES = Object.freeze([
  exportProfile('amazon_ads_sp_campaigns', { date: ['Date', 'Start Date'], platform: { value: 'Amazon Ads' }, campaign: 'Campaign Name', sku: ['Advertised SKU', 'SKU'], spend: 'Spend', clicks: 'Clicks', impressions: 'Impressions', attributed_sales: ['7 Day Total Sales', '14 Day Total Sales'] }),
  exportProfile('google_ads_campaigns', { date: ['Day', 'Date'], platform: { value: 'Google Ads' }, campaign: 'Campaign', spend: 'Cost', clicks: 'Clicks', impressions: ['Impr.', 'Impressions'], attributed_sales: ['Conv. value', 'All conv. value'] }),
  exportProfile('meta_ads_campaigns', { date: ['Reporting starts', 'Day'], platform: { value: 'Meta Ads' }, campaign: 'Campaign name', spend: ['Amount spent (USD)', 'Amount spent'], clicks: ['Link clicks', 'Clicks (all)'], impressions: 'Impressions', attributed_sales: ['Purchases conversion value', 'Website purchases conversion value'] }),
]);
export const AD_FIELDS = Object.freeze({
  date: t(['Date', 'Day', 'Start Date'], { type: 'date' }),
  platform: t(['Platform', 'Channel', 'Network'], { required: true }),
  campaign: t(['Campaign', 'Campaign Name'], { required: true }),
  sku: t(['SKU', 'Advertised SKU', 'Product']),
  spend: t(['Spend', 'Cost', 'Amount Spent'], { type: 'money', required: true }),
  clicks: t(['Clicks'], { type: 'number' }),
  impressions: t(['Impressions', 'Impr.'], { type: 'number' }),
  attributed_sales: t(['Attributed Sales', 'Sales', 'Conversion Value', 'Conv. value'], { type: 'money' }),
});
export const SALE_FIELDS = Object.freeze({ order_id: t(['Order', 'Order ID'], { required: true }), date: t(['Date', 'Order Date'], { type: 'date' }), sku: t(['SKU', 'Lineitem sku'], { required: true }), revenue: t(['Revenue', 'Net Sales', 'Line Total'], { type: 'money', required: true }) });
export const STOCK_FIELDS = Object.freeze({ sku: t(['SKU', 'Item SKU'], { required: true }), available: t(['Available', 'On Hand', 'Quantity'], { type: 'number', required: true }) });
export const AD_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string' },
    target_roas: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Return on ad spend you aim for, per platform, with "default" (default 3)' },
    budgets: { type: 'object', additionalProperties: { type: 'number', minimum: 0 }, description: 'Monthly budget per campaign name' },
    min_spend_no_sales: { type: 'number', minimum: 0, description: 'Spend with no attributed sales from which a campaign is listed (default 50)' },
  },
});

/** Statuses: fix, review, ok. */
export function checkAds(ads, sales = [], stock = null, s = {}) {
  const target = s.target_roas || {}; const budgets = s.budgets || {}; const minNo = s.min_spend_no_sales ?? 50;
  const avail = stock ? new Map(stock.map((x) => [skuKey(x.sku), num(x.available) || 0])) : null;
  const camp = new Map(); const attrBySku = new Map();
  for (const a of ads) {
    const k = `${str(a.platform)}|${str(a.campaign)}`; const c = camp.get(k) || { id: k, platform: str(a.platform), campaign: str(a.campaign), skus: new Set(), spend: 0, clicks: 0, impressions: 0, attributed: 0, months: new Map() };
    const sp = round2(num(a.spend) || 0); const at = round2(num(a.attributed_sales) || 0); const sku = skuKey(a.sku);
    c.spend = round2(c.spend + sp); c.attributed = round2(c.attributed + at); c.clicks += num(a.clicks) || 0; c.impressions += num(a.impressions) || 0; if (sku) c.skus.add(sku);
    const m = monthOf(a.date) || 'unknown'; c.months.set(m, round2((c.months.get(m) || 0) + sp)); camp.set(k, c);
    if (sku) attrBySku.set(sku, round2((attrBySku.get(sku) || 0) + at));
  }
  const items = [];
  for (const c of [...camp.values()]) {
    const roas = c.spend ? round2(c.attributed / c.spend) : null; const tgt = target[c.platform] ?? target.default ?? 3; const f = []; let status = 'ok';
    const oos = avail ? [...c.skus].filter((k) => avail.has(k) && avail.get(k) <= 0) : [];
    if (oos.length) { f.push(finding('spend_on_out_of_stock', c.spend, `${c.campaign} advertises ${oos.join(', ')}, which your stock file shows as out of stock.`)); status = 'fix'; }
    if (!c.attributed && c.spend >= minNo) { f.push(finding('spend_no_sales', f.length ? null : c.spend, `${c.campaign} on ${c.platform} spent ${c.spend} with no attributed sales.`)); status = 'fix'; }
    else if (roas !== null && c.attributed && roas < tgt) { f.push(finding('roas_below_target', null, `${c.campaign} on ${c.platform} returned ${roas} per 1 spent; your target is ${tgt}.`)); if (status === 'ok') status = 'review'; }
    const b = budgets[c.campaign];
    if (b !== undefined) for (const [m, sp] of [...c.months.entries()].sort()) if (sp > b) { f.push(finding('over_budget', sp - b, `${c.campaign} spent ${sp} in ${m}; the budget is ${b}.`)); if (status === 'ok') status = 'review'; }
    items.push({ id: c.id, kind: 'campaign', platform: c.platform, campaign: c.campaign, sku: [...c.skus].sort().join(' '), spend: c.spend, attributed: c.attributed, roas, acos_pct: c.attributed ? round2((c.spend / c.attributed) * 100) : null, actual_sales: null, status, findings: f });
  }
  const sold = new Map(); for (const r of sales) { const k = skuKey(r.sku); sold.set(k, round2((sold.get(k) || 0) + (num(r.revenue) || 0))); }
  if (sales.length) for (const [sku, at] of [...attrBySku.entries()].sort()) { const act = sold.get(sku) || 0; if (at > act + 0.01) items.push({ id: `SKU:${sku}`, kind: 'sku', platform: '', campaign: '', sku, spend: 0, attributed: at, roas: null, acos_pct: null, actual_sales: act, status: 'review', findings: [finding('attribution_exceeds_sales', at - act, `Platforms credit ads with ${at} of ${sku} sales; your orders show ${act}. Ads cannot all be right; compare before raising budgets.`)] }); }
  const sorted = sortBy(items, (i) => `${i.kind}|${i.id}`); const cs = sorted.filter((i) => i.kind === 'campaign');
  const spend = round2(cs.reduce((a, i) => a + i.spend, 0)); const attributed = round2(cs.reduce((a, i) => a + i.attributed, 0));
  return { campaigns: cs.length, spend, attributed, roas: spend ? round2(attributed / spend) : null, wasted: round2(cs.filter((i) => i.status === 'fix').reduce((a, i) => a + i.spend, 0)), ...byStatus(sorted, ['fix', 'review', 'ok']), by_platform: [...new Set(cs.map((i) => i.platform))].sort().map((p) => { const x = cs.filter((i) => i.platform === p); const sp = round2(x.reduce((a, i) => a + i.spend, 0)); const at = round2(x.reduce((a, i) => a + i.attributed, 0)); return { platform: p, campaigns: x.length, spend: sp, attributed: at, roas: sp ? round2(at / sp) : null }; }), by_finding: byFinding(sorted), items: sorted };
}

export function reviewText(items, { from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  return { campaigns: rows.map((i) => i.id), text: ['# Campaign review', '', '**To:** [TO CONFIRM the person who runs ads]', `**From:** ${from || '[TO CONFIRM your name]'}`, '', '| Campaign | Spend | Attributed | Return | Finding | Decision |', '| --- | --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.id} | ${i.spend} | ${i.attributed} | ${i.roas ?? ''} | ${i.findings.map((f) => f.detail).join(' ')} | [CHECK keep / cut / pause] |`)].join('\n') };
}
