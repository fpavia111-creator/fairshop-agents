# Fairshop Stockouts (`fairshop-stockouts`)

> Find days out of stock, orders taken or cancelled while out of stock, an estimate of sales lost, and SKUs that will run out before a reorder could arrive, with a suggested quantity. Never sends a purchase order.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it daily stock snapshots (date, SKU, on hand) and the order lines for the same days. Per SKU:

- **days out of stock**, and an estimate of the units and sales not made (the in-stock daily rate times those days);
- **oversold orders**: taken on a day with nothing on hand, or cancelled with a stock reason;
- **reorder now**: days of cover (on hand ÷ daily rate) under your lead time plus `safety_days`, with a suggested quantity that covers `order_days` more of sales.

## Limits

- Lost sales and suggested quantities are estimates from your own history; seasonality and promotions are not modelled.
- Lead times are your settings. It never sends a purchase order or cancels an order.
