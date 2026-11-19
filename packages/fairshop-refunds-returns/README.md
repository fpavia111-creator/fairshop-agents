# Fairshop Refunds Returns (`fairshop-refunds-returns`)

> Match refunds to returns received: money refunded for items that never came back, customers still owed a refund, refunds paid twice or above the price, and full refunds on damaged returns. Never refunds or e-mails; reminders are one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your refunds export, the returns-received log from your warehouse, 3PL or returns app, and optionally the order lines. Matched by order and SKU:

- **refunded, not returned**: units refunded and not received within `grace_days` (default 21) of the first refund; the share of the refund is "at risk";
- **returned, not refunded**: units received and no refund within `refund_due_days` (default 7); the line price is what the customer is owed;
- **refunded twice** (more units refunded than ordered) and **refund above the price**;
- **full refund on a damaged return**: condition words you set (default damaged, used, missing parts, opened).

SKUs you refund without asking for the item back go under `returnless_skus`. Customer e-mails are masked in what the model sees.

<!-- generated:start -->

## A demo run

`npx -y fairshop-refunds-returns demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Refunds and Returns demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  7 order line(s): 1 refunded and not returned (25 at risk), 1 returned and not refunded (45 owed to customers), 3 to review, 1 still inside the window, 1 matched.
    1001:TEE-1   ok       refunded     25 back 1/1  
    1002:TEE-1   chase    refunded     25 back 0/1  refunded_not_returned
    1003:MUG-2   waiting  refunded     18 back 0/1  
    1004:LAMP-3  review   refunded     60 back 1/1  full_refund_damaged
    1005:TEE-1   review   refunded     50 back 1/2  refunded_twice
    1006:MUG-2   review   refunded     40 back 1/1  refund_over_price
    1007:BAG-4   owed     refunded      0 back 1/0  returned_not_refunded

▶ Write the worklist
  status: executed  decision: allow
  Report written: 7 order line(s): 1 refunded and not returned (25 at risk), 1 returned and not refunded (45 owed to customers), 3 to review, 1 still inside the window, 1 matched.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  return reminders customers drafted with 2 open marker(s) ([TO CONFIRM each customer below, from your order system], [TO CONFIRM your customer service address]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries issue_refund itself
  status: blocked  decision: block
  reason: Fairshop Refunds and Returns never refunds or reverses a refund.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `refunds_audit` | Match every refund to the returns log by order and SKU: money refunded for items that never came back, customers owed a refund, refunds paid twice or above the price, full refunds on damaged returns. | runs |
| `refunds_explain` | Show the refunds and returns of one order and why it was flagged. | runs |
| `refunds_write_report` | Write refunds-returns.csv and .html (every order line not matched, by channel) into out_dir (default fairshop-out/refunds). | runs |
| `refunds_draft_return_reminders` | Write drafts/return_reminders-customers.md: one polite reminder text and the list of orders refunded but not returned. | asks first (Auto can be opted in) |
| `refunds_request_send` | After one named human click (even in Auto), record that the reviewed return reminders draft is approved in return_reminders-requests.csv. | one named click, even in Auto (`binding_send`) |
| `issue_refund` | Fairshop Refunds and Returns never refunds or reverses a refund. | refused |
| `customer_email_send` | Fairshop Refunds and Returns never e-mails a customer; a person sends the reviewed reminders. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Refunds (`refunds`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, Lineitem sku, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `refund_date` (required) | date | Refund Date, Refunded At, Date | - |
| `amount` (required) | amount | Refund Amount, Amount, Refunded | Betrag, Montant, 金額, 金额 |
| `qty` | number | Quantity, Qty, Units | Menge, Quantité, 数量, 数量 |
| `channel` | text | Channel, Source, Marketplace | Kanal, Canal, チャネル, 渠道 |
| `customer_email` | text | Customer Email, Email, Buyer Email | - |

### Returns received (`returns`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, RMA Order, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `received_date` (required) | date | Received, Received Date, Receipt Date, Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |
| `qty` | number | Quantity, Qty, Units Received | Menge, Quantité, 数量, 数量 |
| `condition` | text | Condition, Disposition, Grade | - |

### Order lines (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, Lineitem sku | Artikelnummer, Référence, 品番, 物料编码 |
| `qty` | number | Quantity, Qty, Lineitem quantity | Menge, Quantité, 数量, 数量 |
| `price` | amount | Line Total, Price, Lineitem price, Amount | Preis, Prix, 価格, 价格 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-refunds-returns inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-refunds-returns demo
npx -y fairshop-refunds-returns mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-refunds-returns": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-refunds-returns",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-refunds-returns -- npx -y fairshop-refunds-returns mcp --root .`, or install the `fairshop-refunds-returns` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-refunds-returns approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-refunds-returns approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-refunds-returns kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-refunds-returns tools                 # every tool, its policy and arguments
fairshop-refunds-returns sources               # the columns each input is read from
fairshop-refunds-returns inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-refunds-returns call refunds_audit '{"refunds":"<refunds>","returns":"<returns>"}'
fairshop-refunds-returns eval                  # the private eval cases on the fictional fixtures
fairshop-refunds-returns demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- A return logged without an order number or SKU cannot be matched.
- It never refunds and never writes to a customer. A person decides and sends.
