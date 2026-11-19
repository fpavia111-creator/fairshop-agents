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

<!-- generated:start -->

## A demo run

`npx -y fairshop-coupon-abuse demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Coupon Abuse demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  14 order(s) used a code, 217.2 in discounts: 7 outside the code rules (93.7), 1 with a code you never listed, 6 fine.
    2002  2026-10-02 WELCOME10     4.5 abuse  new_customer_repeat
    2003  2026-10-03 WELCOME10     3.5 ok     
    2004  2026-10-04 WELCOME10     3.2 abuse  new_customer_repeat, same_address_many_accounts
    2005  2026-10-05 WELCOME10       2 abuse  below_minimum
    2006  2026-10-06 VIP50          50 ok     
    2007  2026-10-07 VIP50          50 abuse  over_limit
    2008  2026-09-10 FALL20         10 ok     
    2009  2026-09-11 FALL20         12 ok     
    2010  2026-09-12 FALL20         11 ok     
    2011  2026-09-13 FALL20         10 abuse  over_limit
    2012  2026-11-02 FALL20          9 abuse  expired
    2013  2026-10-20 STAFF30        15 abuse  staff_code_outside
    2014  2026-10-21 STAFF30        12 ok     
    2015  2026-10-22 SPRING99       25 review unknown_code

▶ Write the worklist
  status: executed  decision: allow
  Report written: 14 order(s) used a code, 217.2 in discounts: 7 outside the code rules (93.7), 1 with a code you never listed, 6 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  code review codes drafted for 93.7 with 2 open marker(s) ([TO CONFIRM marketing or e-commerce lead], [CHECK keep / limit / end]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries discount_code_disable itself
  status: blocked  decision: block
  reason: Fairshop Coupon Abuse never disables or edits a code in a store.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `coupons_audit` | Check every order with a discount code against the code rules and earlier orders from the same e-mail or address. | runs |
| `coupons_explain` | Show one order (or every order of one code) and the rule it broke. | runs |
| `coupons_write_report` | Write discount-codes.csv and .html (by code, every order outside the rules) into out_dir (default fairshop-out/coupons). | runs |
| `coupons_draft_code_review` | Write drafts/code_review-codes.md listing every code used outside its rules, with uses, discount and a blank decision. | asks first (Auto can be opted in) |
| `coupons_request_approve` | After one named human click (even in Auto), record that the reviewed code review draft is approved in code_review-requests.csv. | one named click, even in Auto (`go_live`) |
| `discount_code_disable` | Fairshop Coupon Abuse never disables or edits a code in a store. | refused |
| `order_cancel` | Fairshop Coupon Abuse never cancels or charges an order. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Orders with discounts (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` (required) | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `customer_email` | text | Customer Email, Email | - |
| `ship_address` | text | Ship Address, Shipping Address1, Shipping Address, Address | - |
| `ship_zip` | text | Ship Zip, Shipping Zip, Postal Code, Zip | PLZ Empfänger, Code postal destination, 届け先郵便番号, 目的地邮编 |
| `discount_code` | text | Discount Code, Coupon, Promo Code, Code | Rabattcode, Code promo, クーポンコード, 优惠码 |
| `discount_amount` | amount | Discount Amount, Discount, Coupon Amount | Rabatt, Remise, 割引, 折扣 |
| `subtotal` | amount | Subtotal, Items Total, Merchandise Total | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shopify | Orders > Export (CSV), discount columns | Name, Discount Code, Discount Amount, Email | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Discount codes (`codes`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `discount_code` (required) | text | Code, Discount Code, Coupon | Rabattcode, Code promo, クーポンコード, 优惠码 |
| `type` | text | Type, Code Type, Kind | Typ, Type, 種類, 类型 |
| `max_uses` | number | Max Uses, Usage Limit, Limit | - |
| `starts` | date | Starts, Start Date, Valid From | - |
| `ends` | date | Ends, End Date, Valid To, Expires | - |
| `min_order` | amount | Minimum Order, Min Order, Minimum Subtotal | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-coupon-abuse inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-coupon-abuse demo
npx -y fairshop-coupon-abuse mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-coupon-abuse": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-coupon-abuse",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-coupon-abuse -- npx -y fairshop-coupon-abuse mcp --root .`, or install the `fairshop-coupon-abuse` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-coupon-abuse approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-coupon-abuse approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-coupon-abuse kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-coupon-abuse tools                 # every tool, its policy and arguments
fairshop-coupon-abuse sources               # the columns each input is read from
fairshop-coupon-abuse inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-coupon-abuse call coupons_audit '{"orders":"<orders>","codes":"<codes>"}'
fairshop-coupon-abuse eval                  # the private eval cases on the fictional fixtures
fairshop-coupon-abuse demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- A shared address (an office, a dorm) can look like one shopper. Read before acting; nobody is accused by the agent.
- It never edits or disables a code and never cancels an order.
