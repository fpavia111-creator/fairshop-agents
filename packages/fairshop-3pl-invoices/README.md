# Fairshop 3PL Invoices (`fairshop-3pl-invoices`)

> Audit a 3PL invoice line by line against your rate card and your own counts: rates above the card, orders billed twice, picks for orders that never shipped, more units received or pallets stored than you counted, and charges not on the card. Never pays.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the invoice detail (charge type, reference, quantity, rate, amount), your rate card from the 3PL agreement, and when you have them: the orders the 3PL shipped (with units), your receipts by ASN or PO, and your own pallet counts.

- **pick and pack**: first unit plus additional units at your card's rates; **billed twice** for one order; **order not shipped**;
- **receiving**: units billed above your receipts, and rate above the card;
- **storage**: pallets billed above your count, and rate above the card;
- **other charges** at the card rate, and **charges not on the card** to ask about.

## Limits

- Minimums, surcharges and special projects are only checked when they are on your rate card.
- It never pays or files anything with the 3PL.
