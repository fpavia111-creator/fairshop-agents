import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { COMMISSION_FIELDS, COMMISSION_PROFILES, ORDER_FIELDS, AFFILIATE_TERMS_SCHEMA, checkCommissions, reversalText } from './affiliates.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  commissions: { type: 'string', description: 'Affiliate network statement under --root (Impact, ShareASale, Awin style or your own CSV): action id, affiliate, order, date, sale amount, commission, status' },
  orders: { type: 'string', description: 'Orders under --root: order, total, status, refunded amount, customer e-mail' },
  terms: { type: 'string', description: 'Optional program terms JSON: default_rate_pct, rates per affiliate' },
};
const run = (a, ctx) => checkCommissions(ctx.records(a.commissions, 'commissions'), ctx.records(a.orders, 'orders'), a.terms ? ctx.readJson(a.terms, 'affiliate_terms') : {});
const line = (r) => `${r.actions} commission(s), ${r.commission} in total: ${r.reverse} to reverse before payout and ${r.clawback} already paid (${r.to_recover} to recover), ${r.review} to review, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'affiliates', label: 'Fairshop Affiliate Commissions',
  description: 'Checks affiliate commission statements against your orders and program terms: commission on refunded or cancelled orders, orders not found, rates above your terms, sale amounts above the order, the same order paid twice, and own-link purchases. Drafts the reversal request; a person sends it.',
  files, required: ['commissions', 'orders'],
  sources: { commissions: { label: 'Affiliate commissions', args: ['commissions'], fields: COMMISSION_FIELDS, profiles: COMMISSION_PROFILES }, orders: { label: 'Orders', args: ['orders'], fields: ORDER_FIELDS } },
  configSchemas: { affiliate_terms: AFFILIATE_TERMS_SCHEMA },
  run, line,
  check: { title: 'Check affiliate commissions', description: 'Check every commission against its order and your terms; returns what to reverse before payout, what to claw back and totals by affiliate.' },
  explain: { arg: 'action_id', argDescription: 'Action id or order id from affiliates_audit', title: 'Explain one commission', description: 'Show one commission and why it should be adjusted.', match: (i, w) => i.id.toLowerCase() === w.toLowerCase() || i.order_id === w.replace(/^#/, ''), text: (i) => `${i.id} (${i.affiliate}, order ${i.order_id}): ${i.status}, commission ${i.commission}${i.recover ? `, adjust by ${i.recover}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'affiliate-commissions', title: 'Affiliate commissions', description: 'Write affiliate-commissions.csv and .html (by affiliate, every commission to adjust) into out_dir (default fairshop-out/affiliates).',
    columns: ['id', 'affiliate', 'order_id', 'order_date', 'sale_amount', 'commission', 'commission_status', 'status', 'recover', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'affiliate', 'order_id', 'commission', 'commission_status', 'status', 'recover', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'affiliate', 'order_id', 'order_date', 'sale_amount', 'commission', 'commission_status'], 'recover'),
    sections: (r) => [{ title: 'By affiliate', rows: r.by_affiliate, columns: ['affiliate', 'count', 'commission', 'recover'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Rates come from your terms file; the network\'s own terms and locking dates decide what can still be reversed.', LIMITS.advice],
  },
  draft: {
    noun: 'reversal_request', verb: 'send', category: 'binding_send',
    description: 'Write drafts/reversal_request-<network>.md listing every commission to reverse or claw back, with the amount and reason. Marked DRAFT. Sending goes through affiliates_request_send (one click); a person submits it.',
    args: { network: { type: 'string', description: 'Affiliate network name, for the To line' }, from: { type: 'string', description: 'Your name and program' } },
    build: (a, ctx, r) => { const d = reversalText(r.items, a); if (!d.actions.length) throw new Error('no commission to reverse or claw back'); return { id: a.network || 'network', text: d.text, amount: d.total, extra: { actions: d.actions } }; },
  },
  refused: [
    { name: 'affiliate_payout_approve', category: 'move_money', description: 'Fairshop Affiliate Commissions never approves or pays commissions.' },
    { name: 'network_reversal_submit', category: 'binding_send', description: 'Fairshop Affiliate Commissions never submits reversals on a network; a person does.' },
  ],
  prompt: { name: 'affiliate_commissions', title: 'Check affiliate commissions before payout', description: 'Walks the host model through a commission check.',
    text: 'You are helping a merchant check affiliate commissions with fairshop-affiliate-commissions. Statement: {{commissions}}. Orders: {{orders}}.\n\nRules: affiliate payouts and network submissions are blocked; affiliate names (AFF-…) and e-mails are masked.\n\n1. Call affiliates_audit (with terms when available). Lead with what to reverse before the next payout.\n2. affiliates_explain for an action or order.\n3. affiliates_write_report.\n4. Offer affiliates_draft_reversal_request; affiliates_request_send only when asked (one named click).' },
});
