# Fairshop Marketplace Claims (`fairshop-marketplace-claims`)

> Line up Amazon A-to-z, eBay, Walmart and Etsy claims with your shipment and delivery records: what your tracking can defend, what still needs a signature or photos, what is likely a refund, and what is due when. Never submits a response or refunds; a response is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key. Card chargebacks are a different process; see `soteria-of-refunds` in the Fairbooks family.

## What it checks

Give it the claims or cases export and your shipments (order, carrier, tracking, ship and delivery dates, signature). For each open claim:

- **respond-by date**: from the export, or opened date plus your `respond_days` per channel; claims past it are **overdue**, claims due today or tomorrow are listed first;
- **not received**: delivered before the claim was opened is `defend`; no tracking, or no delivery scan before the claim, is `refund_likely`; delivered without a signature on an order at or over your `signature_over` amount is `weak`;
- **not as described, damaged, wrong item**: `gather_evidence`, with the listing, messages and photos still needed.

Buyer names and e-mail addresses are masked in everything the model sees; the drafts on your disk keep them.

## Limits

- The advice is a reading of your own records, not a prediction of the marketplace's decision.
- Check each respond-by date on the marketplace. The agent does not log in to any marketplace and never refunds.
