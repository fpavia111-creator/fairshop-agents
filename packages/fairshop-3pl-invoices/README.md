# Fairshop 3PL Invoices (`fairshop-3pl-invoices`)

> Audit a 3PL invoice line by line against your rate card and your own counts: rates above the card, orders billed twice, picks for orders that never shipped, more units received or pallets stored than you counted, and charges not on the card. Never pays.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the invoice detail (charge type, reference, quantity, rate, amount), your rate card from the 3PL agreement, and when you have them: the orders the 3PL shipped (with units), your receipts by ASN or PO, and your own pallet counts.

- **pick and pack**: first unit plus additional units at your card's rates; **billed twice** for one order; **order not shipped**;
- **receiving**: units billed above your receipts, and rate above the card;
- **storage**: pallets billed above your count, and rate above the card;
- **other charges** at the card rate, and **charges not on the card** to ask about.

<!-- generated:start -->

## A demo run

`npx -y fairshop-3pl-invoices demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop 3PL Invoices demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  9 invoice line(s), 456.3 billed: 5 to dispute (52), 1 to ask about, 3 as your card gives.
    Packaging mailer     1001         0.3     0.3 ok
    Pick and pack        1001         2.5     2.5 ok
    Pick and pack        1002         3.5     3.5 ok
    Pick and pack        1002         3.5       - dispute
    Pick and pack        1003           4       3 dispute
    Pick and pack        1099         2.5       - dispute
    Receiving            ASN-5        125     125 dispute
    Special project fee                75       - review
    Storage              2026-10      240     240 dispute

▶ Write the worklist
  status: executed  decision: allow
  Report written: 9 invoice line(s), 456.3 billed: 5 to dispute (52), 1 to ask about, 3 as your card gives.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  invoice dispute Example Fulfillment (fictional) drafted for 52 with 1 open marker(s) ([TO CONFIRM Example Fulfillment (fictional) account manager]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries invoice_pay itself
  status: blocked  decision: block
  reason: Fairshop 3PL Invoices never pays an invoice.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `fulfillment_audit` | Check every invoice line against your rate card and your own counts; returns what to dispute and what to ask about, by fee type. | runs |
| `fulfillment_explain` | Show every invoice line for one reference and why it was flagged. | runs |
| `fulfillment_write_report` | Write 3pl-invoice.csv and .html (by fee type, every line to dispute or ask about) into out_dir (default fairshop-out/fulfillment). | runs |
| `fulfillment_draft_invoice_dispute` | Write drafts/invoice_dispute-<provider>.md listing every line to credit or explain. | asks first (Auto can be opted in) |
| `fulfillment_request_send` | After one named human click (even in Auto), record that the reviewed invoice dispute draft is approved in invoice_dispute-requests.csv. | one named click, even in Auto (`binding_send`) |
| `invoice_pay` | Fairshop 3PL Invoices never pays an invoice. | refused |
| `portal_dispute_submit` | Fairshop 3PL Invoices never files a dispute in a 3PL portal. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### 3PL invoice lines (`invoice`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` | text | Invoice Number, Invoice | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `date` | date | Date, Invoice Date | Datum, Date, 日付, 日期 |
| `charge_type` (required) | text | Charge Type, Fee Type, Activity, Description | Leistungsbeschreibung, Libellé de la prestation, 請求項目, 费用名称 |
| `reference` | text | Reference, Order, Order Number, ASN, Period | Referenz, Référence, 参照番号, 参考号 |
| `qty` | number | Quantity, Qty, Units | Menge, Quantité, 数量, 数量 |
| `rate` | amount | Rate, Unit Price, Unit Rate | Frachtrate, Tarif, 料率, 运价 |
| `amount` (required) | amount | Amount, Extended Amount, Total | Betrag, Montant, 金額, 金额 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| 3PL (generic) | Invoice detail export, one row per charge | Invoice Number, Charge Type or Fee Type or Activity, Quantity or Units, Amount or Extended Amount | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Shipped orders (`shipped`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `units` | number | Units, Quantity, Items | Menge, Quantité, 数量, 数量 |

### Receipts (`receipts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `reference` (required) | text | ASN, Reference, PO | Referenz, Référence, 参照番号, 参考号 |
| `units_received` (required) | number | Units Received, Received, Quantity | Erhaltene Menge, Quantité reçue, 入荷数, 收货数量 |

### Pallet counts (`pallets`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `period` (required) | text | Period, Month | - |
| `pallets` (required) | number | Pallets, Pallet Count, Counted Pallets | Paletten, Palettes, パレット数, 托盘数 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-3pl-invoices inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-3pl-invoices demo
npx -y fairshop-3pl-invoices mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-3pl-invoices": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-3pl-invoices",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-3pl-invoices -- npx -y fairshop-3pl-invoices mcp --root .`, or install the `fairshop-3pl-invoices` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-3pl-invoices approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-3pl-invoices approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-3pl-invoices kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-3pl-invoices tools                 # every tool, its policy and arguments
fairshop-3pl-invoices sources               # the columns each input is read from
fairshop-3pl-invoices inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-3pl-invoices call fulfillment_audit '{"invoice":"<invoice>","ratecard":"<ratecard>"}'
fairshop-3pl-invoices eval                  # the private eval cases on the fictional fixtures
fairshop-3pl-invoices demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Minimums, surcharges and special projects are only checked when they are on your rate card.
- It never pays or files anything with the 3PL.
