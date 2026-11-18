import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, LIMITS } from 'fairshop-core';
import { ORDER_FIELDS, ORDER_PROFILES, CODE_FIELDS, COUPON_SETTINGS_SCHEMA, checkCoupons, reviewText } from './coupons.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  orders: { type: 'string', description: 'Orders export under --root: order, date, customer e-mail, shipping address and ZIP, discount code, discount amount, subtotal' },
  codes: { type: 'string', description: 'Your discount codes under --root: code, type (single_use, limited, new_customer, employee, public), max uses, start, end, minimum order' },
  settings: { type: 'string', description: 'Optional settings JSON: employee_domains for staff codes' },
};
const run = (a, ctx) => checkCoupons(ctx.records(a.orders, 'orders'), ctx.records(a.codes, 'codes'), a.settings ? ctx.readJson(a.settings, 'coupon_settings') : {});
const line = (r) => `${r.orders_with_code} order(s) used a code, ${r.discount_total} in discounts: ${r.abuse} outside the code rules (${r.at_stake}), ${r.review} with a code you never listed, ${r.ok} fine.`;

export const manifest = shopAgent({
  pkg, prefix: 'coupons', label: 'Fairshop Coupon Abuse',
  description: 'Checks every order that used a discount code against your code rules: limits, dates, minimum order, new-customer codes used by returning shoppers (by e-mail or address), staff codes used outside staff and codes you never issued. Drafts a code review; a person decides about any code or order.',
  files, required: ['orders', 'codes'],
  sources: { orders: { label: 'Orders with discounts', args: ['orders'], fields: ORDER_FIELDS, profiles: ORDER_PROFILES }, codes: { label: 'Discount codes', args: ['codes'], fields: CODE_FIELDS } },
  configSchemas: { coupon_settings: COUPON_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check discount code use', description: 'Check every order with a discount code against the code rules and earlier orders from the same e-mail or address.' },
  explain: { arg: 'order_id', argDescription: 'Order number or discount code from coupons_audit', title: 'Explain an order or a code', description: 'Show one order (or every order of one code) and the rule it broke.', match: (i, w) => i.id === w.replace(/^#/, '') || i.discount_code === w.toUpperCase(), text: (i) => `${i.id} (${i.order_date}, ${i.discount_code}, ${i.discount_amount}): ${i.status}. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'discount-codes', title: 'Discount code use', description: 'Write discount-codes.csv and .html (by code, every order outside the rules) into out_dir (default fairshop-out/coupons).',
    columns: ['id', 'order_date', 'discount_code', 'discount_amount', 'subtotal', 'status', 'at_stake', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'order_date', 'discount_code', 'discount_amount', 'subtotal', 'status', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => i.status !== 'ok'), ['id', 'order_date', 'discount_code', 'discount_amount', 'subtotal'], 'at_stake'),
    sections: (r) => [{ title: 'By code', rows: r.by_code, columns: ['code', 'uses', 'discount', 'flagged', 'at_stake'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Repeat shoppers are matched by e-mail (spellings folded) and shipping address; a shared address (a dorm, an office) can look like one shopper.', 'Customer e-mails and addresses are masked in what the model sees.', LIMITS.advice],
  },
  draft: {
    noun: 'code_review', verb: 'approve', category: 'go_live',
    description: 'Write drafts/code_review-codes.md listing every code used outside its rules, with uses, discount and a blank decision. Approving goes through coupons_request_approve (one click); a person changes any code.',
    args: { from: { type: 'string', description: 'Your name' } },
    build: (a, ctx, r) => { const d = reviewText(r, a); if (!d.codes.length) throw new Error('every code was used inside its rules'); return { id: 'codes', text: d.text, amount: r.at_stake, extra: { codes: d.codes } }; },
  },
  refused: [
    { name: 'discount_code_disable', category: 'go_live', description: 'Fairshop Coupon Abuse never disables or edits a code in a store.' },
    { name: 'order_cancel', category: 'move_money', description: 'Fairshop Coupon Abuse never cancels or charges an order.' },
  ],
  prompt: { name: 'coupon_abuse', title: 'Check discount codes against their rules', description: 'Walks the host model through a code check.',
    text: 'You are helping a store owner check discount code use with fairshop-coupon-abuse. Orders: {{orders}}. Codes: {{codes}}.\n\nRules: customers are masked; never ask who they are, and do not accuse anyone. discount_code_disable and order_cancel are blocked.\n\n1. Call coupons_audit. Lead with the codes losing the most.\n2. coupons_explain for an order or code.\n3. coupons_write_report.\n4. Offer coupons_draft_code_review; coupons_request_approve only when asked (one named click).' },
});
