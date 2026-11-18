# Fairshop Retailer Deductions (`fairshop-retailer-deductions`)

> Check the deductions retailers take from your wholesale remittances: shortages your signed proof of delivery disproves, allowances above what you agreed, deductions taken twice, compliance fines needing evidence, small ones to write off, and ones past the window. Never submits a dispute.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the deductions from retailer remittances, your wholesale invoices, and optionally proof of delivery and your agreed terms. Each deduction is classed (shortage, promo or allowance, compliance fine, damage, pricing, returns) and checked:

- **shortage**: disputed when a signed POD shows every unit delivered; without a POD, get one;
- **allowance above agreed**: more than the percent of the invoice you agreed with that retailer;
- **taken twice**: the same invoice, class and amount on a second remittance;
- **compliance fines** and **pricing** deductions are listed with what to check;
- under `write_off_under` (default 25) is a write-off; past the retailer's window (default 90 days) is closed.

## Limits

- Windows and allowances are your settings from your vendor agreements. Not legal advice.
- It never submits a dispute or issues a credit.
