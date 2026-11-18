# Fairshop Processor Reserves (`fairshop-processor-reserves`)

> Track money that Stripe, PayPal or Shopify Payments is holding: releases overdue, holds above your terms, releases coming up and dispute holds open too long. Never moves money; an inquiry is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it a balance or activity export with reserve holds, releases, disputes and charges, and optionally the reserve terms from your processor's notice (percent and days). For every hold it finds the releases (same reference first, then later releases without one) and works out what is still held:

- **release overdue**: still held more than `grace_days` (default 3) after the release date in the export or the date your terms give;
- **hold above terms**: more than your terms' percent of that day's charges;
- **due soon**: releases inside `upcoming_days` (default 14), also written to a calendar;
- **dispute hold open long**: a dispute hold still open after `dispute_days` (default 75).

## Limits

- Terms are what you put in the terms file; the agent does not know a processor's current terms.
- It reads only your exports and does not log in to a processor. A person sends any inquiry.
