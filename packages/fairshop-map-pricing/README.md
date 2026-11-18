# Fairshop MAP Pricing (`fairshop-map-pricing`)

> Check advertised prices against your minimum advertised price (MAP) list: your own listings below MAP first, resellers below it (and repeat ones), exempt sellers and paused dates, and SKUs not on the list. Never changes a price or cuts off a reseller.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it advertised prices (your own channel exports plus any price checks you collected: date, seller, channel, SKU, price, whether the listing is yours) and your MAP policy (minimum per SKU, exempt sellers, paused date ranges). One line per seller and SKU:

- **your own listing below MAP** (fix these first);
- **a reseller below MAP**, and **repeat** when it happened on more than one day;
- **SKU not on your list**.

## Limits

- Prices are as seen on the dates in your file; listings change.
- Not legal advice. It never changes a price, never suspends a reseller; a person sends any notice.
