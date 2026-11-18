# Fairshop Affiliate Commissions (`fairshop-affiliate-commissions`)

> Check every affiliate commission against your orders and program terms before the next payout: refunded or cancelled orders, orders that do not exist, rates above your terms, the same order paid twice, and own-link purchases. Never approves a payout.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the network's commission statement (Impact, ShareASale, Awin style or your own CSV), your orders, and optionally your program terms (default rate and rates per affiliate). For each commission:

- **order not found**; **order refunded or cancelled** (no commission due), or partly refunded (commission on what was kept);
- **rate above your terms**, and **sale amount above the order** as the statement reports it;
- **duplicate**: an order that already earned commission (the earliest action keeps it);
- **own-link purchase**: the affiliate's e-mail placed the order (for a person to read against your terms).

Commissions still pending are "reverse"; ones the statement shows as paid are "clawback". E-mails are masked in what the model sees.

## Limits

- The network's own terms and lock dates decide what can still be reversed.
- It never approves, pays or submits anything on a network.
