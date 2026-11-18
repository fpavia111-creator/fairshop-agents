# Fairshop Gift Cards (`fairshop-gift-cards`)

> Work out gift card and store credit liability from your card and activity exports, by age, and find the cards to look at: balances that do not match their activity, cards spent past their value, large manual issues, use before issue, and dormant cards. Never changes a card.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the gift card (or store credit) export and the card activity. Every balance is rebuilt from the issue value, loads, adjustments and redemptions, and compared with the balance the export reports:

- **balance mismatch** and **overdrawn** cards;
- **manual issue with no order** above `manual_review_over` (default 100);
- **used before its issue date**;
- **dormant**: a balance and no activity for `dormancy_days` (default 365). What applies to dormant balances depends on where you sell and is a question for your adviser.

The liability is the sum of positive balances, by age from issue (default buckets 90, 180, 365 days). Promotional cards are left out unless `promo_is_liability` is true. The draft entry books the difference between that liability and your ledger balance.

## Limits

- It reads your exports only. It never changes, expires or disables a card. Not accounting or legal advice.
