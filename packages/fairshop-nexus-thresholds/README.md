# Fairshop Nexus Thresholds (`fairshop-nexus-thresholds`)

> Track sales and order counts by state against the economic nexus thresholds you confirm: states where your threshold was met and you are not registered (with the date), states approaching, and states with sales but no threshold set. Never registers or files. Not tax advice.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it two calendar years of orders (date, ship-to state, channel, amount) and a settings file you write with your adviser: per state, a sales threshold and/or an order-count threshold, whether either or both must be met, the measuring period (`current_year`, `previous_or_current_year` or `rolling_12`) and whether marketplace sales count; plus the states where you are registered.

For each state it adds up sales and orders over that period and reports:

- **over and not registered**, with the order on which your threshold was met;
- **approaching**: at `warn_pct` (default 80%) of a threshold;
- **no threshold set**: sales into a state your settings do not cover;
- registered and under.

Cancelled and voided orders do not count.

## Limits

- Every threshold and period is your setting; the agent does not know any state's current rules. Confirm them with your adviser.
- Not tax advice. Registration is your decision; the agent never registers or files.
