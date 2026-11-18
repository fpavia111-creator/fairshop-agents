# Fairshop Product Data (`fairshop-product-data`)

> Check product data before it goes to a channel: missing GTIN, brand, weight, price or images, titles over the limit you set, GTINs with a wrong check digit or shared by two SKUs, zero weights and prices, and thin descriptions. Never changes a listing.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it a product export (Shopify products, an Amazon flat file, WooCommerce or your own CSV), with a channel column when rules differ by channel, and optionally your rules per channel: title limit, required fields, minimum images and description length (defaults: 200 characters; title, GTIN, brand, weight and price required; 1 image; 100 characters).

- **missing fields**, with a completeness percent per row;
- **title over the limit**;
- **GTIN with a wrong check digit or length** (GTIN-8, 12, 13, 14), and **a GTIN shared by two SKUs**;
- **zero weight**, **zero price**, **too few images**, **short description**.

## Limits

- The rules are your settings; channels change theirs. A valid check digit does not mean the GTIN is registered to you.
- It never changes product data or submits a feed.
