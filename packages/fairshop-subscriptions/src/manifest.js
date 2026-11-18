import { readFileSync } from 'node:fs';
import { shopAgent, worklistRows, AS_OF, LIMITS } from 'fairshop-core';
import { SUB_FIELDS, SUB_PROFILES, PAYMENT_FIELDS, SUB_SETTINGS_SCHEMA, checkSubscriptions, dunningText } from './subscriptions.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const files = {
  subscriptions: { type: 'string', description: 'Subscriptions export under --root (Recharge, Stripe Billing, Shopify or your own CSV): id, customer e-mail, status, plan, price, start, cancel date and reason, next billing, card expiry' },
  payments: { type: 'string', description: 'Payment attempts under --root: subscription id, date, amount, status (succeeded or failed), failure reason' },
  settings: { type: 'string', description: 'Optional settings JSON: retry_gap_days, max_retries, grace_days' },
  as_of: AS_OF,
};
const run = (a, ctx) => checkSubscriptions(ctx.records(a.subscriptions, 'subscriptions'), ctx.records(a.payments, 'payments'), a.settings ? ctx.readJson(a.settings, 'subscription_settings') : {}, { asOf: a.as_of });
const line = (r) => `${r.subscriptions} subscription(s), MRR ${r.mrr} (${r.mrr_at_risk} at risk): ${r.chase} failed and not retried, ${r.at_risk} with retries used up, ${r.review} active with no recent payment, ${r.heads_up} card(s) expiring, ${r.ok} fine, ${r.churned} cancelled.`;

export const manifest = shopAgent({
  pkg, prefix: 'subscriptions', label: 'Fairshop Subscriptions',
  description: 'Reads subscription and payment exports for failed payments not retried, retries used up, cards about to expire, active plans with no payment, and churn split into voluntary and payment failure. Drafts payment-update messages; a person sends them.',
  files, required: ['subscriptions', 'payments'],
  sources: { subscriptions: { label: 'Subscriptions', args: ['subscriptions'], fields: SUB_FIELDS, profiles: SUB_PROFILES }, payments: { label: 'Payment attempts', args: ['payments'], fields: PAYMENT_FIELDS } },
  configSchemas: { subscription_settings: SUB_SETTINGS_SCHEMA },
  run, line,
  check: { title: 'Check subscriptions and failed payments', description: 'Line up every subscription with its payment attempts: failed and not retried, retries used up, billing gaps, expiring cards, and churn by month.' },
  explain: { arg: 'subscription_id', argDescription: 'Subscription id from subscriptions_audit', title: 'Explain one subscription', description: 'Show one subscription with its last payment, failures and findings.', text: (i) => `${i.id} (${i.plan}, ${i.price}): ${i.status}, last paid ${i.last_success || 'never'}, ${i.failures} failure(s) since. ${i.findings.map((f) => f.detail).join(' ')}` },
  report: {
    base: 'subscriptions', title: (r) => `Subscriptions and failed payments as of ${r.as_of}`, description: 'Write subscriptions.csv and .html (churn by month, every subscription to act on) into out_dir (default fairshop-out/subscriptions).',
    columns: ['id', 'plan', 'sub_status', 'last_success', 'failures', 'next_billing', 'status', 'price', 'findings', 'reasons', 'decision'],
    htmlColumns: ['id', 'plan', 'sub_status', 'last_success', 'failures', 'next_billing', 'status', 'price', 'reasons'],
    rows: (r) => worklistRows(r.items.filter((i) => !['ok', 'churned'].includes(i.status)), ['id', 'plan', 'sub_status', 'last_success', 'failures', 'next_billing'], 'price'),
    sections: (r) => [{ title: 'By month', rows: r.churn_by_month, columns: ['month', 'voluntary', 'payment_failure', 'mrr_lost'] }, { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] }],
    limits: [LIMITS.files, 'Retry timing is your settings; your billing app may retry on its own schedule.', 'Customer e-mails are masked in what the model sees.', LIMITS.advice],
  },
  draft: {
    noun: 'payment_update_requests', verb: 'send', category: 'binding_send',
    description: 'Write drafts/payment_update_requests-subscribers.md: one message text and the subscriptions it goes to. Marked DRAFT. Sending goes through subscriptions_request_send (one click); a person sends them.',
    build: (a, ctx, r) => { const d = dunningText(r.items); if (!d.subscriptions.length) throw new Error('no subscription needs a payment update'); return { id: 'subscribers', text: d.text, amount: r.mrr_at_risk, extra: { subscriptions: d.subscriptions } }; },
  },
  refused: [
    { name: 'charge_card', category: 'move_money', description: 'Fairshop Subscriptions never charges or retries a card.' },
    { name: 'subscription_cancel', category: 'go_live', description: 'Fairshop Subscriptions never pauses, cancels or changes a subscription.' },
  ],
  prompt: { name: 'subscription_payments', title: 'Save subscriptions with failed payments', description: 'Walks the host model through failed payments.',
    text: 'You are helping a subscription business with failed payments, using fairshop-subscriptions. Subscriptions: {{subscriptions}}. Payments: {{payments}}.\n\nRules: subscribers are masked. charge_card and subscription_cancel are blocked.\n\n1. Call subscriptions_audit. Lead with MRR at risk.\n2. subscriptions_explain for one.\n3. subscriptions_write_report.\n4. Offer subscriptions_draft_payment_update_requests; subscriptions_request_send only when asked (one named click).' },
});
