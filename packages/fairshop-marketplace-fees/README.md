# Fairshop Marketplace Fees (`fairshop-marketplace-fees`)

> Check every marketplace fee line against the fee schedule you confirm. Fees above it, fee types not in it, and rates that moved month to month. Never files a dispute; a request is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it fee lines (Amazon settlement report, Etsy payment account CSV, eBay or Walmart reports, or your own CSV) and a fee schedule you write from the marketplace's fee pages or your agreement: per channel and fee type, a percent of the sale, a fixed amount, a minimum, and percents by category. For each fee line:

- **above the schedule**: the charge is higher than the schedule gives for that sale and category; the difference is what to ask about;
- **not in the schedule**: a fee type you have not listed (a new fee, or one to add);
- **no sale amount**: a percent fee whose line has no sale amount, so it cannot be checked.

It also works out the effective rate per channel, fee type and month and lists every move larger than `rate_change_points` (default 1 point).

## How it decides

Fee wording is mapped to schedule keys ("Commission" and "ReferralFee" are `referral`; add your own under `aliases`). Charges and sales are read as positive whatever their sign. Differences up to `tolerance` (default 0.02) are rounding.

<!-- generated:start -->

## A demo run

`npx -y fairshop-marketplace-fees demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Marketplace Fees demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  14 fee line(s), 56.77 in fees: 3 above your schedule (2.68 over), 2 to review, 9 as expected; 2 month-to-month rate change(s).
    A-1001   Amazon  Commission                    4.5    4.5 ok
    A-1002   Amazon  Commission                      3      3 ok
    A-1003   Amazon  Commission                      6    4.5 dispute
    A-1004   Amazon  Commission                      8      8 ok
    A-1005   Amazon  FBAPerUnitFulfillmentFee     3.22   3.22 ok
    A-1006   Amazon  FBAPerUnitFulfillmentFee      4.1   3.22 dispute
    A-1007   Amazon  Commission                    0.3    0.3 ok
    A-1008   Amazon  Inbound placement fee          12      - review
    B-3001   eBay    Final Value Fee               5.7    5.7 ok
    B-3002   eBay    Final Value Fee                 6      - review
    E-2001   Etsy    Listing fee                   0.2    0.2 ok
    E-2001   Etsy    Transaction fee               1.3    1.3 ok
    E-2002   Etsy    Processing fee               0.85   0.85 ok
    E-2003   Etsy    Transaction fee               1.6    1.3 dispute

▶ Write the worklist
  status: executed  decision: allow
  Report written: 14 fee line(s), 56.77 in fees: 3 above your schedule (2.68 over), 2 to review, 9 as expected; 2 month-to-month rate change(s).

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  fee review Amazon drafted for 2.38 with 3 open marker(s) ([TO CONFIRM Amazon seller support], [TO CONFIRM seller id], [CHECK the fee schedule version and category for each line before sending]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries fee_dispute_submit itself
  status: blocked  decision: block
  reason: Fairshop Marketplace Fees never opens a case with a marketplace; a person sends the reviewed request.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `fees_audit` | Check every fee line against your fee schedule. | runs |
| `fees_explain` | Show every fee line of one order with the expected fee and why it was flagged. | runs |
| `fees_write_report` | Write marketplace-fees.csv (flagged fee lines with a blank decision column) and marketplace-fees.html (by fee type, rate changes by month, every flagged line) into out_dir (default fairshop-out/fees). | runs |
| `fees_draft_fee_review` | Write drafts/fee_review-<channel>.md listing every fee line of one channel above your schedule, with charged, expected and the difference. | asks first (Auto can be opted in) |
| `fees_request_send` | After one named human click (even in Auto), record that the reviewed fee review draft is approved in fee_review-requests.csv. | one named click, even in Auto (`binding_send`) |
| `fee_dispute_submit` | Fairshop Marketplace Fees never opens a case with a marketplace; a person sends the reviewed request. | refused |
| `listing_price_update` | Fairshop Marketplace Fees never changes a price or listing to make up for a fee. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Marketplace fee lines (`fees`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` | text | Order, Order ID, order-id, Order Number, Order # | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `channel` | text | Channel, Marketplace, Platform | Kanal, Canal, チャネル, 渠道 |
| `date` | date | Date, Posted Date, posted-date, Transaction Date, Fee Date | Datum, Date, 日付, 日期 |
| `fee_type` (required) | text | Fee Type, Fee, Fee Description, amount-description, Description, Charge Type | Gebührenart, Type de frais, 手数料種別, 费用类型 |
| `fee` (required) | amount | Fee Amount, Amount, Fees, Charge | Gebühr, Frais, 手数料, 手续费 |
| `sale_amount` | amount | Sale Amount, Item Price, Principal, Product Sales, Order Amount, Sale Price | - |
| `category` | text | Category, Product Category, Fee Category | Kategorie, Catégorie, 経費科目, 费用类别 |
| `sku` | text | SKU, Seller SKU, sku | Artikelnummer, Référence, 品番, 物料编码 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | Settlement report, flat file V2 | settlement-id, amount-type, amount-description, amount | no |
| Etsy | Payment account > Download CSV | Date, Type, Title, Info, Fees & Taxes, Net | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-marketplace-fees inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-marketplace-fees demo
npx -y fairshop-marketplace-fees mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-marketplace-fees": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-marketplace-fees",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-marketplace-fees -- npx -y fairshop-marketplace-fees mcp --root .`, or install the `fairshop-marketplace-fees` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-marketplace-fees approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-marketplace-fees approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-marketplace-fees kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-marketplace-fees tools                 # every tool, its policy and arguments
fairshop-marketplace-fees sources               # the columns each input is read from
fairshop-marketplace-fees inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-marketplace-fees call fees_audit '{"fees":"<fees>","schedule":"<schedule>"}'
fairshop-marketplace-fees eval                  # the private eval cases on the fictional fixtures
fairshop-marketplace-fees demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The schedule is yours. The agent does not know what a marketplace charges today.
- A rate move can come from a different mix of categories; it is listed for a person to read, not disputed.
- It does not log in to a marketplace. Not accounting advice; a person sends any request.
