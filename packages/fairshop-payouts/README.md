# Fairshop Payouts (`fairshop-payouts`)

> Match every order to its payout lines, by channel. Find orders never paid out, paid short or paid twice, refunds not yet deducted and fees above your rate. Never moves money; an inquiry is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it an orders export (Shopify, WooCommerce, BigCommerce or your own CSV) and the payout or settlement lines from Shopify Payments, Stripe, PayPal, Amazon, eBay, Etsy or Walmart. For every order it adds up the payout lines that name it and compares that with the order total less refunds:

- **not paid out**: no payout line, and the order is older than the payout days you set for its channel (`waiting` until then);
- **paid short**: the payouts add up to less than expected; the difference is what to chase;
- **paid twice**: the order's charge is in two payouts (the extra may be taken back later);
- **refund not deducted**: the order was refunded but no payout shows the refund yet;
- **fee above your rate**: fees over the percent you set for that channel;
- **payout lines with no order** (another store, or an order outside the export's dates) and **lines with no order at all** (reserves, holds, chargebacks).

Voided, cancelled and unpaid orders and orders paid by manual, cash, gift card or bank transfer are skipped; both lists are settings.

## How it decides

Order numbers match with or without `#`. Differences up to `tolerance` (default 0.05) are rounding. Payout days and fee caps come from your settings file (`payout_days`, `max_fee_pct`, with a `default`); without them it waits 7 days and does not check fees. Results never depend on the order of the rows.

## Limits

- It reads only the files you give it. It does not log in to a store, marketplace or processor.
- A channel that pays out in one lump per period (no order lines) cannot be matched per order; use its transaction report.
- Payout days and fee rates are yours to set; the agent does not know a channel's current terms.
- Not accounting advice. A person decides what to ask for and sends the inquiry.
