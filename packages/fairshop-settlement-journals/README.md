# Fairshop Settlement Journals (`fairshop-settlement-journals`)

> Turn marketplace settlements into one summarized, balanced journal entry each, from the account map you confirm, and match each one to its bank deposit. Never posts to your ledger; posting is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it settlement lines (Amazon settlement V2, Walmart reconciliation or your own CSV), an account map from your chart of accounts (description, or "Type/Description", to account; a clearing account for the deposit) and, optionally, your bank deposits. For each settlement it:

- sums every line by account: income is credited, costs and refunds debited, the net goes to the clearing account, so the entry balances;
- puts descriptions with no account in suspense and lists them;
- finds the bank deposit by reference or by amount within `deposit_days` after the last line, and flags a missing or different deposit.

The report's CSV has one row per journal line, ready to import after review.

## Limits

- Accounts are yours; the agent does not choose them. Check the map against your chart of accounts.
- Tax lines are booked where your map puts them; the agent gives no tax treatment.
- It never posts to a ledger. A person posts the reviewed entry.
