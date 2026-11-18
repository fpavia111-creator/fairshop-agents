# Fairshop Subscriptions (`fairshop-subscriptions`)

> Find subscriptions slipping away through failed payments: not retried, retries used up, cards about to expire, active plans with no payment, and churn split into voluntary and payment failure. Never charges a card or cancels a plan.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the subscriptions export (Recharge, Stripe Billing, Shopify subscriptions or your own CSV) and the payment attempts. For every subscription:

- **failed and not retried**: the last attempt failed and nothing was tried for `retry_gap_days` (default 3);
- **retries used up**: `max_retries` failures (default 3) since the last success, or an unpaid status;
- **billing gap**: active, but no successful payment for `grace_days` (default 35);
- **card expiring**: the card on file expires by the month of the next billing date.

It totals monthly recurring revenue and the share at risk, and splits cancellations by month into voluntary and payment failure (a cancel reason about payment, or a failed payment in the 30 days before). Customer e-mails are masked in what the model sees.

## Limits

- Your billing app may retry on its own schedule; set the gaps to match it.
- It never charges, retries, pauses or cancels anything. A person sends the messages.
