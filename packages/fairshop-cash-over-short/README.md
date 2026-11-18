# Fairshop Cash Over Short (`fairshop-cash-over-short`)

> Check register closeouts and bank deposits for physical stores: drawers over or short beyond your tolerance, deposits missing or different from the counted cash, and cashiers with repeated shortages, with names masked. Never touches pay or moves money.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it register closeouts (Square cash drawers, Shopify POS cash sessions or your own CSV: date, store, register, cashier, expected and counted cash, float) and the bank deposits.

- **over or short** beyond `tolerance` (default 2.00);
- **deposit missing**: no deposit of counted cash less float within `deposit_days` (default 2) for that store; **deposit different**: the nearest deposit differs (exact matches are taken first);
- **repeated shortages**: one cashier short `repeat_min` times (default 3).

Cashier names are masked in what the model sees; the report on your disk keeps them for the manager.

## Limits

- A shortage is a fact about a drawer, not a finding about a person.
- It never deducts pay, changes staff access or moves money.
