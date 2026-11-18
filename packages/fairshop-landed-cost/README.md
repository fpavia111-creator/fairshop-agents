# Fairshop Landed Cost (`fairshop-landed-cost`)

> Spread freight, duty, broker and other import costs over each shipment's SKUs to get a landed unit cost, compare it with the cost in your store, and find shipments with no costs and costs with no shipment. Never changes a cost.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it shipment lines (shipment, SKU, quantity, unit cost, unit weight), the import costs per shipment (freight, duty, broker, insurance, drayage) and optionally the unit costs recorded in your store or books.

- each cost is spread over its shipment's lines by weight, value or units (default: freight and drayage by weight, the rest by value; set your own under `basis`); with no weights it falls back to value and says so;
- the landed unit cost per SKU, weighted across shipments;
- **recorded cost off** by more than `variance_pct` (default 5%), with the value at stake;
- **shipments with no costs**, and **costs for a shipment not in the lines**.

## Limits

- Duty is spread from the amounts in your costs file, not computed from tariff rates. Not customs or accounting advice.
- It never changes a cost or posts a revaluation.
