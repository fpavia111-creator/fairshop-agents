# Fairshop Refunds and Returns (`fairshop-refunds-returns`)

> Match refunds to returns received: money refunded for items that never came back, customers still owed a refund, refunds paid twice or above the price, and full refunds on damaged returns. Never refunds or e-mails; reminders are one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your refunds export, the returns-received log from your warehouse, 3PL or returns app, and optionally the order lines. Matched by order and SKU:

- **refunded, not returned**: units refunded and not received within `grace_days` (default 21) of the first refund; the share of the refund is "at risk";
- **returned, not refunded**: units received and no refund within `refund_due_days` (default 7); the line price is what the customer is owed;
- **refunded twice** (more units refunded than ordered) and **refund above the price**;
- **full refund on a damaged return**: condition words you set (default damaged, used, missing parts, opened).

SKUs you refund without asking for the item back go under `returnless_skus`. Customer e-mails are masked in what the model sees.

## Limits

- A return logged without an order number or SKU cannot be matched.
- It never refunds and never writes to a customer. A person decides and sends.
