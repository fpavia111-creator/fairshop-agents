# Fairshop FBA Reimbursements (`fairshop-fba-reimbursements`)

> Find what Amazon still owes for FBA inventory: units lost or damaged in the warehouse, refunds whose return never arrived, and reimbursements below your unit value, each with a claim-by date. Never files a case; filing is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the FBA inventory adjustments (or Inventory Ledger) report, and when you have them the Reimbursements report, the customer returns report and your refunds. It works out:

- **lost or damaged units not settled**: per SKU, units lost or damaged in the warehouse, less units found and units already reimbursed (earliest first);
- **refunds with no return**: a refunded order whose units did not come back within the grace days and that no reimbursement names;
- **low reimbursements**: paid per unit more than `low_pct` under the unit value you set.

Each claim gets a claim-by date (event date plus `claim_window_days`), a value from your unit values, and the report adds a calendar of deadlines.

## How it decides

Reason codes are settings (`lost_codes`, `found_codes`, `damaged_codes`; defaults M and 5, F and N, E H K Q 6), and words like "lost", "found" and "damaged" are also read. A unit is left alone for `wait_days` (default 30) while Amazon may still find or pay it. Units past the window are reported as lost, not claimed.

## Limits

- Windows and codes change: confirm them against your own reports and the program's current rules.
- Values are estimates from your unit values; Amazon decides what it pays.
- It does not log in to Seller Central. A person files the case.
