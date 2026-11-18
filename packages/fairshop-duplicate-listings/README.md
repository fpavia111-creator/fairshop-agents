# Fairshop Duplicate Listings (`fairshop-duplicate-listings`)

> Find duplicate and orphan listings across channels: the same SKU listed twice on one channel (and at different prices), look-alike titles under different SKUs, one GTIN shared by several SKUs, and listings for SKUs not in your catalog. Never ends or merges a listing.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your listings from every channel (channel, listing id, SKU, title, GTIN, price, status) and optionally your catalog of SKUs.

- **same SKU twice on one channel** (active listings only), with the prices when they differ;
- **look-alike titles** under different SKUs on one channel (shared words at or above `title_similarity`, default 0.9);
- **one GTIN on several SKUs**;
- **orphan listings**: SKUs not in your catalog.

## Limits

- Variants (sizes, colours) can look alike on purpose; read before acting.
- It never ends, merges or relinks a listing.
