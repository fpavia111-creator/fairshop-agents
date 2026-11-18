# Fairshop Sales Tax (`fairshop-sales-tax`)

> Compare the sales tax collected on every order with what your own confirmed settings give, by state: under- and over-collection, tax collected where you are not registered, exempt orders with no certificate, and marketplace orders. Never files or pays. Not tax advice.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your orders (ship-to state, channel, taxable subtotal, shipping, tax collected, exemption) and a settings file you confirm with your adviser: the states where you are registered with the combined rate you charge and whether shipping is taxed, the channels and states where a marketplace collects for you, and the exemption certificates you hold.

- **marketplace**: the channel collects in that state per your settings; left out of your figures;
- **under-collected** and **over-collected** against your rate and shipping rule;
- **collected where not registered**;
- **exempt with no certificate**.

Totals by state feed a worksheet for the person who prepares the return.

## Limits

- Everything about rates and rules comes from your settings; the agent does not know any state's current rules and uses one combined rate per state (no local rates).
- Not tax advice. It never files a return or pays a tax authority.
