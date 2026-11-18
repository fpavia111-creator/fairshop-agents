# Fairshop Ad Spend (`fairshop-ad-spend`)

> Read ad platform exports against your orders and stock: campaigns under your target return, spend with no sales, campaigns over budget, ads for out-of-stock SKUs, and platforms crediting more sales than the SKU sold. Never pauses a campaign or changes a budget.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it ad rows from Amazon Ads, Google Ads, Meta or your own CSV, and optionally your order lines, stock and settings (target return per platform, monthly budgets per campaign).

- **return under target** (attributed sales ÷ spend; default target 3);
- **spend with no sales** from `min_spend_no_sales` (default 50);
- **over budget** in a month;
- **ads for out-of-stock SKUs**;
- **attribution above actual sales**: the platforms together credit ads with more of a SKU's sales than your orders show.

## Limits

- Attributed sales are each platform's own claim, with its own window. Read them as claims.
- It never pauses, edits or funds a campaign.
