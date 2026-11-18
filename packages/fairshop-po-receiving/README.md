# Fairshop PO Receiving (`fairshop-po-receiving`)

> Match purchase orders, receipts and supplier invoices: units billed but not received, invoices billed twice, prices above the PO, short and over shipments, late deliveries, and POs past due with nothing received. Never pays or cancels.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it PO lines (PO, vendor, SKU, quantity, cost, promised date), receipts and supplier invoice lines. For each PO line, by PO and SKU:

- **billed above received**, claimed at the invoice price, and **duplicate invoices** (a later invoice repeating the same quantity);
- **price above the PO** beyond `price_tolerance_pct` (default 1%);
- **short** and **over** receipts (over beyond `over_receipt_pct`, default 5%);
- **late** deliveries and **past due** POs with nothing received (after `late_grace_days`, default 3);
- **invoice lines for a PO you never raised**.

## Limits

- Lines match on PO and SKU; a supplier's own item code will not match until you map it.
- It never pays, cancels or changes a PO.
