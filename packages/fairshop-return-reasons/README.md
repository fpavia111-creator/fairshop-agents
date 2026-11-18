# Fairshop Return Reasons (`fairshop-return-reasons`)

> Find out why things come back: SKUs returned far more than the rest and the likely fix, and customers who return most of what they buy, with names and e-mails masked. Never blocks a customer or changes a listing.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your returns (order, SKU, reason, quantity, customer) and the order lines for the same period. It groups reasons into listing, size, quality, fulfilment, customer and other (add your own wording under `groups`), then:

- **SKUs returned well above the rest**: at least `sku_min_units` sold (default 10) and a unit return rate at or above `sku_rate_pct` (default 15%), with the top reason and who usually owns the fix;
- **listing mismatch**: two or more "not as described" returns on one SKU;
- **repeat returners**: customers with at least `returner_min_returns` returned orders (default 3) and `returner_rate_pct` of their orders returned (default 50%). E-mail spellings are folded ("Jo.Doe+x@gmail.com" is "jodoe@gmail.com") and the customer id is a one-way code.

## Limits

- Returning is a customer's right. The repeat-returner list is for a person to read; the agent never tags or blocks anyone.
- A reason picked from a menu may not be the real reason. It never changes a listing.
