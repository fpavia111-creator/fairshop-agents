import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { AD_FIELDS, AD_PROFILES, SALE_FIELDS, STOCK_FIELDS, AD_SETTINGS_SCHEMA, checkAds, reviewText } from './ads.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  ads: { type: 'string', description: 'Ad platform export under --root (Amazon Ads, Google Ads, Meta or your own CSV): date, platform, campaign, SKU, spend, clicks, impressions, attributed sales' },
  sales: { type: 'string', description: 'Order lines for the same period under --root (optional): order, date, SKU, revenue' },
  stock: { type: 'string', description: 'Stock under --root (optional): SKU, available' },
  settings: { type: 'string', description: 'Optional settings JSON: target_roas per platform, monthly budgets per campaign, min_spend_no_sales' },
};
const run = (a, ctx) => checkAds(ctx.records(a.ads, 'ads'), a.sales ? ctx.records(a.sales, 'sales') : [], a.stock ? ctx.records(a.stock, 'stock') : null, a.settings ? ctx.readJson(a.settings, 'ad_settings') : {});
const line = (r) => `${r.campaigns} campaign(s), ${r.spend} spent for ${r.attributed} attributed (return ${r.roas}): ${r.fix} to fix (${r.wasted} on no sales or out-of-stock SKUs), ${r.review} to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'ads', label: 'Fairshop Ad Spend',
  description: 'Reads ad platform exports against your orders and stock: campaigns under your target return, spend with no sales, campaigns over budget, ads for out-of-stock SKUs, and platforms crediting more sales than the SKU sold. Drafts a campaign review; a person changes any campaign.',
  files, required: ['ads'],
  sources: { ads: { label: 'Ad platform rows', args: ['ads'], fields: AD_FIELDS, profiles: AD_PROFILES }, sales: { label: 'Order lines', args: ['sales'], fields: SALE_FIELDS }, stock: { label: 'Stock', args: ['stock'], fields: STOCK_FIELDS } },
  configSchemas: { ad_settings: AD_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check ad spend against sales and stock', description: 'Sum spend and attributed sales per campaign, compare the return with your target and budget, and check advertised SKUs against stock and actual sales.' },
  explain: { arg: 'campaign', argDescription: 'Campaign name, platform|campaign id or SKU from ads_audit', title: 'Explain one campaign', description: 'Show one campaign (or SKU) with spend, attributed sales, return and findings.', match: (i, w) => i.campaign.toLowerCase() === w.toLowerCase() || i.id.toLowerCase() === w.toLowerCase() || i.id === `SKU:${w.toUpperCase()}`, text: (i) => `${i.id}: ${i.status}, spend ${i.spend}, attributed ${i.attributed}${i.roas !== null ? `, return ${i.roas}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'ad-spend', title: 'Ad spend against sales', description: 'Write ad-spend.csv and .html (by campaign, every campaign or SKU to look at) into out_dir (default fairshop-out/ads).',
    columns: ['id', 'platform', 'campaign', 'sku', 'spend', 'attributed', 'roas', 'acos_pct', 'actual_sales', 'status', 'findings', 'reasons', 'decision'],
    htmlColumns: ['platform', 'campaign', 'sku', 'spend', 'attributed', 'roas', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'platform', 'campaign', 'sku', 'spend', 'attributed', 'roas', 'acos_pct', 'actual_sales']).map(({ amount, ...x }) => x),
    sections: (r) => [{ title: 'By campaign', rows: r.items.filter((i) => i.kind === 'campaign').map((i) => ({ campaign: i.id, spend: i.spend, attributed: i.attributed, roas: i.roas })), columns: ['campaign', 'spend', 'attributed', 'roas'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Attributed sales are what each platform reports with its own attribution window; platforms count the same order more than once.', 'Targets and budgets are your settings.', LIMITS.advice],
  },
  draft: {
    noun: 'campaign_review', verb: 'approve', category: 'go_live',
    description: 'Write drafts/campaign_review-campaigns.md: every campaign or SKU to look at, with a blank decision. Marked DRAFT. Approving goes through ads_request_approve (one click); a person changes campaigns.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = reviewText(r.items, a); if (!d.campaigns.length) throw new Error('every campaign is fine'); return { id: 'campaigns', text: d.text, amount: r.wasted, extra: { campaigns: d.campaigns } }; },
  },
  refused: [
    { name: 'campaign_pause', category: 'go_live', description: 'Fairshop Ad Spend never pauses, starts or edits a campaign.' },
    { name: 'budget_increase', category: 'move_money', description: 'Fairshop Ad Spend never changes a budget or a bid.' },
  ],
  prompt: { name: 'ad_spend', title: 'Find ad spend that is not paying back', description: 'Walks the host model through an ad spend check.',
    text: 'You are helping a store check ad spend with fairshop-ad-spend. Ads: {{ads}}.\n\nRules: attributed sales are platform claims, not facts. campaign_pause and budget_increase are blocked.\n\n1. Call ads_audit (with sales, stock and settings when available). Lead with spend on no sales or out-of-stock SKUs.\n2. ads_explain for a campaign.\n3. ads_write_report.\n4. Offer ads_draft_campaign_review; ads_request_approve only when asked (one named click).' },
});
