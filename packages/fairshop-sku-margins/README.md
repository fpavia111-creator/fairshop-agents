# Fairshop SKU Margins (`fairshop-sku-margins`)

> Work out contribution margin per SKU and channel from sales, fees, shipping labels and unit costs: SKUs that lose money on a channel, SKUs under your margin floor, and SKUs with no cost on file. Never changes a price.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it sales lines (order, channel, SKU, quantity, revenue after discounts, shipping charged, fees), unit costs, and optionally shipping label costs per order. For every SKU on every channel:

- income = revenue + shipping charged; contribution = income − units × unit cost − fees − label costs (split across an order's lines by revenue);
- **losing money**: contribution below zero;
- **under the floor**: margin under `margin_floor_pct` (default 15%);
- **no cost on file**.

## Limits

- Contribution leaves out ads, storage, returns and overheads; it is a first cut, not a profit and loss.
- It never changes a price or a promotion.
