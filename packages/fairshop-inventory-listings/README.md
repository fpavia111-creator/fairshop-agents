# Fairshop Inventory Listings (`fairshop-inventory-listings`)

> Compare stock by location with what each channel lists: listings that can oversell, listings at zero while stock sits on the shelf, inactive listings with stock, unknown SKUs, and stock listed nowhere. Never changes a listing.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it stock by location (Shopify inventory, WMS, 3PL or FBA export) and your channel listings (Amazon All Listings, eBay listings or your own CSV). For every listing it works out what its locations can ship: on hand less committed, from the locations that feed its fulfilment type (FBA listings from FBA locations, the rest from every other location, or as you set under `feeds`), less any `buffer` you hold back for that channel.

- **listed above what can ship** (units that could be oversold);
- **listed at zero with stock**, and **inactive with stock** (sales missed);
- **unknown SKU**: listed but not in the stock file;
- **stock listed nowhere**.

## Limits

- Export stock and listings at the same time; orders in between make them disagree.
- It never changes a quantity or a listing.
