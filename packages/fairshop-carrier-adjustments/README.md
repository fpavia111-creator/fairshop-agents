# Fairshop Carrier Adjustments (`fairshop-carrier-adjustments`)

> Check carrier adjustments against the weight and dimensions you entered on each label: disputes your own data supports (with a dispute-by date), adjustments that are right because your product data is wrong, the SKUs that keep causing them, and adjustments past their window. Never files a dispute or pays.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it adjustment lines (UPS billing adjustments, USPS APV, FedEx or your own CSV) and the labels as bought (tracking, SKU, entered weight and box size). For each weight or size adjustment it recomputes the billable weight from your label: the larger of the rounded-up weight and the dimensional weight (length × width × height ÷ your divisor, default 139).

- **disputable**: billed above what your label gives; dispute by the date plus `dispute_window_days` (default 30);
- **your data is low**: the adjustment matches your own box size; repeat SKUs are listed so their data gets fixed;
- **no box size on the label**, **address corrections** and other reasons are listed for review;
- **past the window**: disputable but too late.

## Limits

- Divisors and windows are your settings from your carrier agreement.
- The agent cannot see the box; photos help a dispute. It never files or pays.
