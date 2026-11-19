# Fairshop Payouts (`fairshop-payouts`)

> Match every order to its payout lines, by channel. Find orders never paid out, paid short or paid twice, refunds not yet deducted and fees above your rate. Never moves money; an inquiry is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it an orders export (Shopify, WooCommerce, BigCommerce or your own CSV) and the payout or settlement lines from Shopify Payments, Stripe, PayPal, Amazon, eBay, Etsy or Walmart. For every order it adds up the payout lines that name it and compares that with the order total less refunds:

- **not paid out**: no payout line, and the order is older than the payout days you set for its channel (`waiting` until then);
- **paid short**: the payouts add up to less than expected; the difference is what to chase;
- **paid twice**: the order's charge is in two payouts (the extra may be taken back later);
- **refund not deducted**: the order was refunded but no payout shows the refund yet;
- **fee above your rate**: fees over the percent you set for that channel;
- **payout lines with no order** (another store, or an order outside the export's dates) and **lines with no order at all** (reserves, holds, chargebacks).

Voided, cancelled and unpaid orders and orders paid by manual, cash, gift card or bank transfer are skipped; both lists are settings.

## How it decides

Order numbers match with or without `#`. Differences up to `tolerance` (default 0.05) are rounding. Payout days and fee caps come from your settings file (`payout_days`, `max_fee_pct`, with a `default`); without them it waits 7 days and does not check fees. Results never depend on the order of the rows.

<!-- generated:start -->

## A demo run

`npx -y fairshop-payouts demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Payouts demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  13 order(s) on 3 channel(s): 3 to chase (191.49 not paid out or short), 1 still inside the payout window, 5 to review, 4 paid in full, 2 skipped.
    112-0000001-0000001    Amazon   ok             0  
    112-0000002-0000002    Amazon   chase          2  paid_short
    112-0000003-0000003    Amazon   chase      99.99  not_paid_out
    E-3001                 Etsy     review         0  fee_above_rate
    E-3002                 Etsy     ok             0  
    #1001                  Shopify  ok             0  
    #1002                  Shopify  chase       89.5  not_paid_out
    #1003                  Shopify  waiting        0  
    #1004                  Shopify  ok             0  
    #1005                  Shopify  review         0  refund_not_deducted
    #1006                  Shopify  review         0  paid_twice
    #1007                  Shopify  skipped        0  
    #1008                  Shopify  skipped        0  
    9999                   Shopify  review         0  no_matching_order
    P-2003:reserve:-100    Shopify  review         0  payout_adjustment

▶ Write the worklist
  status: executed  decision: allow
  Report written: 13 order(s) on 3 channel(s): 3 to chase (191.49 not paid out or short), 1 still inside the payout window, 5 to review, 4 paid in full, 2 skipped.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  payout inquiry Amazon drafted for 101.99 with 2 open marker(s) ([TO CONFIRM Amazon seller support or payments contact], [TO CONFIRM store or seller id]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries balance_withdraw itself
  status: blocked  decision: block
  reason: Fairshop Payouts never moves money out of a payment or marketplace balance.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `payouts_audit` | Match every order to its payout lines by channel. | runs |
| `payouts_explain` | Show one order: expected, received, fees, the payouts it appears in and why it was flagged. | runs |
| `payouts_write_report` | Write payouts.csv (one row per order or payout line, with a blank decision column) and payouts.html (by channel, by finding, every row) into out_dir (default fairshop-out/payouts). | runs |
| `payouts_draft_payout_inquiry` | Write drafts/payout_inquiry-<channel>.md listing every order on one channel that was not paid out or was paid short, with the amount missing. | asks first (Auto can be opted in) |
| `payouts_request_send` | After one named human click (even in Auto), record that the reviewed payout inquiry draft is approved in payout_inquiry-requests.csv. | one named click, even in Auto (`binding_send`) |
| `balance_withdraw` | Fairshop Payouts never moves money out of a payment or marketplace balance. | refused |
| `support_case_submit` | Fairshop Payouts never opens a case or messages a marketplace or processor; a person sends the reviewed inquiry. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Orders (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number, Order #, Name, order-id | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `channel` | text | Channel, Sales Channel, Source, Marketplace, Store | Kanal, Canal, チャネル, 渠道 |
| `order_date` | date | Order Date, Created at, Date, purchase-date, Paid at, Sale Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `total` | amount | Total, Order Total, Grand Total, Order Total Amount, Total Amount, Order Value | Betrag, Montant, 金額, 金额 |
| `refunded` | amount | Refunded, Refunded Amount, Total Refunded, Refund Amount | Erstattet, Remboursé, 返金額, 退款金额 |
| `status` | text | Status, Financial Status, Payment Status, Order Status | Status, Statut, ステータス, 状态 |
| `gateway` | text | Gateway, Payment Method, Payment Gateway, Processor | Zahlungsart, Mode de paiement, 支払方法, 付款方式 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shopify | Orders > Export (CSV) | Name, Financial Status, Lineitem name | no |
| WooCommerce | Orders export (CSV) | Order Number, Order Status, Order Total Amount | no |
| BigCommerce | Orders > Export (default template) | Order ID, Order Status, Order Total (inc tax) | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Payout and settlement lines (`payouts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `payout_id` | text | Payout ID, Payout, settlement-id, Settlement ID, Transfer ID, Deposit ID | Auszahlungs-ID, N° de versement, 入金ID, 回款编号 |
| `payout_date` | date | Payout Date, Deposit Date, deposit-date, Available On, Settlement Date | Auszahlungsdatum, Date de versement, 入金日, 回款日期 |
| `order_id` | text | Order, Order ID, order-id, Order Number, Order #, Invoice Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `type` | text | Type, Transaction Type, transaction-type, Reporting Category | Typ, Type, 種類, 类型 |
| `gross` | amount | Gross, Amount, Gross Amount, Charge Amount | Brutto, Brut, 総額, 总额 |
| `fee` | amount | Fee, Fees, Fee Amount, Processing Fee | Gebühr, Frais, 手数料, 手续费 |
| `net` | amount | Net, Net Amount, Net Total | Netto, Net, 純額, 净额 |
| `channel` | text | Channel, Processor, Marketplace, Source | Kanal, Canal, チャネル, 渠道 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shopify Payments | Payouts > Export transactions (CSV) | Payout Date, Order, Fee, Net | no |
| Stripe | Balance > Balance transactions export (CSV) | Available On (UTC) or Available On, Source, Fee, Net | no |
| PayPal | Activity > Download (CSV) | Gross, Fee, Net, Transaction ID | no |
| Amazon Seller Central | Payments > Date range report (transaction view) | settlement id, order id, product sales, selling fees, fba fees, total | no |
| eBay Seller Hub | Payments > Reports > Transaction report (CSV) | Transaction creation date, Type, Order number, Net amount | no |
| Etsy | Payment account > Download CSV | Date, Type, Title, Info, Fees & Taxes, Net | no |
| Walmart Seller Center | Payments > Reconciliation report | Period Start Date, Transaction Type, Customer Order #, Amount Type, Amount | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-payouts inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-payouts": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-payouts",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-payouts -- npx -y fairshop-payouts mcp --root .`, or install the `fairshop-payouts` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-payouts approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-payouts approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-payouts kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-payouts tools                 # every tool, its policy and arguments
fairshop-payouts sources               # the columns each input is read from
fairshop-payouts inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-payouts call payouts_audit '{"orders":"<orders>","payouts":"<payouts>"}'
fairshop-payouts eval                  # the private eval cases on the fictional fixtures
fairshop-payouts demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- It reads only the files you give it. It does not log in to a store, marketplace or processor.
- A channel that pays out in one lump per period (no order lines) cannot be matched per order; use its transaction report.
- Payout days and fee rates are yours to set; the agent does not know a channel's current terms.
- Not accounting advice. A person decides what to ask for and sends the inquiry.
