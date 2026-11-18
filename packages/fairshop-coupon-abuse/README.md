# Fairshop Coupon Abuse (`fairshop-coupon-abuse`)

> Check every order that used a discount code against your code rules: limits, dates, minimums, new-customer codes used by returning shoppers, staff codes outside staff, and codes you never issued. Never disables a code or cancels an order.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your orders (with discount code, amount, subtotal, customer e-mail and shipping address) and your list of codes (type, limit, dates, minimum order). In date order:

- **over the limit**: single-use codes used twice, limited codes past their limit (uses counted only inside the code's dates);
- **outside the dates** and **under the minimum order**;
- **new-customer code used by a returning shopper**: the same e-mail (spellings folded: dots and "+tags" at Gmail) or the same shipping address ordered before; several e-mails at one address are listed too;
- **staff code used outside staff**: the e-mail is not on your `employee_domains`;
- **unknown code**: not in your list (issued by hand, or found on a coupon site).

Each order's discount is counted once, on its first finding. E-mails and addresses are masked in what the model sees.

## Limits

- A shared address (an office, a dorm) can look like one shopper. Read before acting; nobody is accused by the agent.
- It never edits or disables a code and never cancels an order.
