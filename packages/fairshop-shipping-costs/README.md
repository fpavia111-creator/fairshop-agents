# Fairshop Shipping Costs (`fairshop-shipping-costs`)

> Compare what each order charged for shipping with the labels bought for it: labels costing more than was charged, free shipping under your threshold, two labels on one order, voided labels not refunded, and labels with no order. Never buys or voids a label.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your orders (shipping charged, subtotal) and the labels you bought (ShipStation, Shippo, Pirate Ship or your own CSV), and optionally your free-shipping threshold.

- **label above what was charged** by more than `loss_tolerance` (default 1.00);
- **free shipping under your threshold**;
- **two live labels on one order** (claim the extra if it never shipped);
- **voided label not refunded** after `void_refund_days` (default 30);
- **label with no order**.

## Limits

- Carrier adjustments billed after the label are not in a label export; see `fairshop-carrier-adjustments`.
- It never buys, voids or refunds a label, and never changes your shipping rules.
