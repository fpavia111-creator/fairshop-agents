# Fairshop Return Reasons (`fairshop-return-reasons`)

> Find out why things come back: SKUs returned far more than the rest and the likely fix, and customers who return most of what they buy, with names and e-mails masked. Never blocks a customer or changes a listing.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your returns (order, SKU, reason, quantity, customer) and the order lines for the same period. It groups reasons into listing, size, quality, fulfilment, customer and other (add your own wording under `groups`), then:

- **SKUs returned well above the rest**: at least `sku_min_units` sold (default 10) and a unit return rate at or above `sku_rate_pct` (default 15%), with the top reason and who usually owns the fix;
- **listing mismatch**: two or more "not as described" returns on one SKU;
- **repeat returners**: customers with at least `returner_min_returns` returned orders (default 3) and `returner_rate_pct` of their orders returned (default 50%). E-mail spellings are folded ("Jo.Doe+x@gmail.com" is "jodoe@gmail.com") and the customer id is a one-way code.

List line codes that are not products (postage, discounts, fees, manual adjustments) under `ignore_skus`; they are left out of every count. On a real shop's published data (UCI Online Retail, 541,909 rows) the codes `M` and `BANK CHARGES` were otherwise listed among the most returned "products".

<!-- generated:start -->

## A demo run

`npx -y fairshop-return-reasons demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Return Reasons demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  8 of 35 unit(s) returned (22.9%). 1 SKU(s) returned well above the rest, 1 customer(s) returning most of what they buy. Top reason: listing.
    CUST-3acb6aaf73  sold   1 returned  1   100% ok
    CUST-ba44e1d1b4  sold   1 returned  1   100% ok
    CUST-bf7796d189  sold   1 returned  0     0% ok
    CUST-debe15abbf  sold   4 returned  3    75% review
    CUST-f26c8404cd  sold   1 returned  1   100% ok
    SKU:DRESS-1      sold  10 returned  4    40% review
    SKU:MUG-3        sold   5 returned  2    40% ok
    SKU:SHOE-2       sold  20 returned  2    10% ok

▶ Write the worklist
  status: executed  decision: allow
  Report written: 8 of 35 unit(s) returned (22.9%). 1 SKU(s) returned well above the rest, 1 customer(s) returning most of what they buy. Top reason: listing.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  listing review skus drafted with 2 open marker(s) ([TO CONFIRM merchandising lead], [CHECK proposed change]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries customer_block itself
  status: blocked  decision: block
  reason: Fairshop Return Reasons never blocks, flags or tags a customer in a store.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `returns_analyse` | Group returns by reason, work out the return rate of every SKU and every customer, and list SKUs and customers well above your thresholds with the likely owner of the fix. | runs |
| `returns_explain` | Show the sales, returns, reasons and findings of one SKU or customer. | runs |
| `returns_write_report` | Write return-reasons.csv and .html (reasons, flagged SKUs and customers) into out_dir (default fairshop-out/returns). | runs |
| `returns_draft_listing_review` | Write drafts/listing_review-skus.md listing every SKU returned well above the rest, its top reason and owner, with a blank change per SKU. | asks first (Auto can be opted in) |
| `returns_request_approve` | After one named human click (even in Auto), record that the reviewed listing review draft is approved in listing_review-requests.csv. | one named click, even in Auto (`go_live`) |
| `customer_block` | Fairshop Return Reasons never blocks, flags or tags a customer in a store. | refused |
| `listing_update` | Fairshop Return Reasons never changes a product page. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Returns (`returns`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` (required) | text | SKU, Item SKU, Lineitem sku | Artikelnummer, Référence, 品番, 物料编码 |
| `return_date` | date | Return Date, Returned At, Date | Datum, Date, 日付, 日期 |
| `reason` | text | Reason, Return Reason, Customer Reason | Grund, Motif, 理由, 原因 |
| `qty` | number | Quantity, Qty, Units | Menge, Quantité, 数量, 数量 |
| `customer_email` | text | Customer Email, Email, Buyer Email | E-Mail, E-mail, メールアドレス, 邮箱 |
| `customer_name` | text | Customer Name, Customer, Buyer Name | Kunde, Client, 顧客, 客户 |

### Order lines (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` (required) | text | SKU, Lineitem sku | Artikelnummer, Référence, 品番, 物料编码 |
| `qty` | number | Quantity, Qty, Lineitem quantity | Menge, Quantité, 数量, 数量 |
| `order_date` | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `customer_email` | text | Customer Email, Email | E-Mail, E-mail, メールアドレス, 邮箱 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-return-reasons inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-return-reasons demo
npx -y fairshop-return-reasons mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-return-reasons": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-return-reasons",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-return-reasons -- npx -y fairshop-return-reasons mcp --root .`, or install the `fairshop-return-reasons` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-return-reasons approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-return-reasons approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-return-reasons kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-return-reasons tools                 # every tool, its policy and arguments
fairshop-return-reasons sources               # the columns each input is read from
fairshop-return-reasons inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-return-reasons call returns_analyse '{"returns":"<returns>","orders":"<orders>"}'
fairshop-return-reasons eval                  # the private eval cases on the fictional fixtures
fairshop-return-reasons demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Returning is a customer's right. The repeat-returner list is for a person to read; the agent never tags or blocks anyone.
- A reason picked from a menu may not be the real reason. It never changes a listing.
