# Fairshop Store Shrink (`fairshop-store-shrink`)

> Measure shrink by store and category from your inventory adjustments and sales: stores above your target, stores where most loss has no explained reason, and SKUs written off again and again. Never posts an adjustment or touches staff records.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it inventory adjustments (Square inventory history or your own CSV: store, SKU, category, quantity change, unit cost, reason, who counted) and net sales by store and category for the same period. Adjustments are valued at cost; found units count back.

- **above target**: shrink over `target_pct` of sales (default 1.5%);
- **unexplained losses**: more than `unexplained_pct` (default 50%) of a store's losses have reasons like "unknown" or "count correction";
- **repeat SKUs**: one SKU written off `repeat_min` times (default 3) in one store.

The report splits shrink by store, by category and by reason. Who counted is masked in what the model sees.

## Limits

- Shrink is only as good as the reasons and costs in your adjustments. Nothing here is a finding about a person.
- It never posts an adjustment or writes to a staff record.
