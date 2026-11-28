# Fairshop PO Receiving (`fairshop-po-receiving`)

> Match purchase orders, receipts and supplier invoices: units billed but not received, invoices billed twice, prices above the PO, short and over shipments, late deliveries, and POs past due with nothing received. Never pays or cancels.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it PO lines (PO, vendor, SKU, quantity, cost, promised date), receipts and supplier invoice lines. For each PO line, by PO and SKU:

- **billed above received**, claimed at the invoice price, and **duplicate invoices** (a later invoice repeating the same quantity);
- **price above the PO** beyond `price_tolerance_pct` (default 1%);
- **short** and **over** receipts (over beyond `over_receipt_pct`, default 5%);
- **late** deliveries and **past due** POs with nothing received (after `late_grace_days`, default 3);
- **invoice lines for a PO you never raised**.

<!-- generated:start -->

## A demo run

`npx -y fairshop-po-receiving demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop PO Receiving demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 PO line(s): 3 to claim from suppliers (474), 1 past due with nothing received, 1 to review, 1 matched.
    PO-1|BOWL-2     ordered   50 received   45 billed   50 dispute 30
    PO-1|MUG-1      ordered  100 received  100 billed  200 dispute 400
    PO-2|TOWEL-3    ordered  200 received  220 billed  220 dispute 44
    PO-3|RUG-4      ordered   20 received    0 billed    0 chase   0
    PO-4|VASE-5     ordered   30 received    0 billed    0 ok      0
    PO-9|LAMP-6     ordered    0 received    0 billed   10 review  0

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 PO line(s): 3 to claim from suppliers (474), 1 past due with nothing received, 1 to review, 1 matched.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  supplier claim Northwind Ceramics drafted for 430 with 1 open marker(s) ([TO CONFIRM Northwind Ceramics accounts receivable]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries invoice_pay itself
  status: blocked  decision: block
  reason: Fairshop PO Receiving never pays a supplier.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `receiving_match` | For every PO line: ordered, received and billed, with prices against the PO, dates against the promise, and invoices billed twice. | runs |
| `receiving_explain` | Show every line of one PO with ordered, received, billed and findings. | runs |
| `receiving_write_report` | Write po-receiving.csv and .html (by vendor, every PO line not matched) into out_dir (default fairshop-out/receiving). | runs |
| `receiving_draft_supplier_claim` | Write drafts/supplier_claim-<vendor>.md: every PO line of one vendor with a credit to ask for. | asks first (Auto can be opted in) |
| `receiving_request_send` | After one named human click (even in Auto), record that the reviewed supplier claim draft is approved in supplier_claim-requests.csv. | one named click, even in Auto (`binding_send`) |
| `invoice_pay` | Fairshop PO Receiving never pays a supplier. | refused |
| `po_cancel` | Fairshop PO Receiving never cancels or changes a purchase order with a supplier. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Purchase order lines (`pos`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `po` (required) | text | PO, PO Number, Purchase Order | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `vendor` | text | Vendor, Supplier | Lieferant, Fournisseur, 仕入先, 供应商 |
| `sku` (required) | text | SKU, Item, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `qty_ordered` (required) | number | Qty Ordered, Ordered, Quantity | Menge, Quantité, 数量, 数量 |
| `unit_cost` | amount | Unit Cost, Cost, PO Price | Stückkosten, Coût unitaire, 単価, 单位成本 |
| `promised_date` | date | Promised Date, Expected Date, Due Date, ETA | Liefertermin, Date de livraison prévue, 納期, 承诺送达日期 |

### Receipts (`receipts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `po` (required) | text | PO, PO Number | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `sku` (required) | text | SKU, Item | Artikelnummer, Référence, 品番, 物料编码 |
| `qty_received` (required) | number | Qty Received, Received, Quantity | Erhaltene Menge, Quantité reçue, 入荷数, 收货数量 |
| `received_date` | date | Received Date, Date, Receipt Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |

### Supplier invoice lines (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice, Invoice Number, Bill Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `vendor` | text | Vendor, Supplier | Lieferant, Fournisseur, 仕入先, 供应商 |
| `po` (required) | text | PO, PO Number | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `sku` (required) | text | SKU, Item | Artikelnummer, Référence, 品番, 物料编码 |
| `qty_billed` (required) | number | Qty Billed, Quantity, Billed | Menge, Quantité, 数量, 数量 |
| `unit_price` (required) | amount | Unit Price, Price, Rate | Einzelpreis, Prix unitaire, 単価, 单价 |
| `invoice_date` | date | Invoice Date, Date | Rechnungsdatum, Date de facture, 請求日, 发票日期 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-po-receiving inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-po-receiving demo
npx -y fairshop-po-receiving mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-po-receiving": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-po-receiving",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-po-receiving -- npx -y fairshop-po-receiving mcp --root .`, or install the `fairshop-po-receiving` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-po-receiving approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-po-receiving approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-po-receiving kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-po-receiving tools                 # every tool, its policy and arguments
fairshop-po-receiving sources               # the columns each input is read from
fairshop-po-receiving inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-po-receiving call receiving_match '{"pos":"<pos>","receipts":"<receipts>","invoices":"<invoices>"}'
fairshop-po-receiving eval                  # the private eval cases on the fictional fixtures
fairshop-po-receiving demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Lines match on PO and SKU; a supplier's own item code will not match until you map it.
- It never pays, cancels or changes a PO.
