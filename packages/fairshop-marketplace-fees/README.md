# Fairshop Marketplace Fees (`fairshop-marketplace-fees`)

> Check every marketplace fee line against the fee schedule you confirm. Fees above it, fee types not in it, and rates that moved month to month. Never files a dispute; a request is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it fee lines (Amazon settlement report, Etsy payment account CSV, eBay or Walmart reports, or your own CSV) and a fee schedule you write from the marketplace's fee pages or your agreement: per channel and fee type, a percent of the sale, a fixed amount, a minimum, and percents by category. For each fee line:

- **above the schedule**: the charge is higher than the schedule gives for that sale and category; the difference is what to ask about;
- **not in the schedule**: a fee type you have not listed (a new fee, or one to add);
- **no sale amount**: a percent fee whose line has no sale amount, so it cannot be checked.

It also works out the effective rate per channel, fee type and month and lists every move larger than `rate_change_points` (default 1 point).

## How it decides

Fee wording is mapped to schedule keys ("Commission" and "ReferralFee" are `referral`; add your own under `aliases`). Charges and sales are read as positive whatever their sign. Differences up to `tolerance` (default 0.02) are rounding.

## Limits

- The schedule is yours. The agent does not know what a marketplace charges today.
- A rate move can come from a different mix of categories; it is listed for a person to read, not disputed.
- It does not log in to a marketplace. Not accounting advice; a person sends any request.
