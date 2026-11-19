# Fairshop Retailer Deductions (`fairshop-retailer-deductions`)

> Check the deductions retailers take from your wholesale remittances: shortages your signed proof of delivery disproves, allowances above what you agreed, deductions taken twice, compliance fines needing evidence, small ones to write off, and ones past the window. Never submits a dispute.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the deductions from retailer remittances, your wholesale invoices, and optionally proof of delivery and your agreed terms. Each deduction is classed (shortage, promo or allowance, compliance fine, damage, pricing, returns) and checked:

- **shortage**: disputed when a signed POD shows every unit delivered; without a POD, get one;
- **allowance above agreed**: more than the percent of the invoice you agreed with that retailer;
- **taken twice**: the same invoice, class and amount on a second remittance;
- **compliance fines** and **pricing** deductions are listed with what to check;
- under `write_off_under` (default 25) is a write-off; past the retailer's window (default 90 days) is closed.

<!-- generated:start -->

## A demo run

`npx -y fairshop-retailer-deductions demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Retailer Deductions demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  8 deduction(s), 1408 taken: 3 to dispute (750), 2 to review, 1 to write off, 1 past the window, 1 as agreed.
    Corner Grocers  INV-103  shortage         80 window_closed 0
    Corner Grocers  INV-102  compliance      150 review        0
    Corner Grocers  INV-102  damage           18 write_off     0
    Corner Grocers  INV-999  pricing          60 review        0
    Example Mart    INV-100  shortage        200 dispute       200
    Example Mart    INV-101  shortage        100 ok            0
    Example Mart    INV-100  promo           400 dispute       150
    Example Mart    INV-100  promo           400 dispute       400

▶ Write the worklist
  status: executed  decision: allow
  Report written: 8 deduction(s), 1408 taken: 3 to dispute (750), 2 to review, 1 to write off, 1 past the window, 1 as agreed.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  deduction dispute Example Mart drafted for 750 with 2 open marker(s) ([TO CONFIRM Example Mart deductions team or vendor portal], [ATTACH signed proof of delivery and the promotion agreement where cited]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries retailer_portal_submit itself
  status: blocked  decision: block
  reason: Fairshop Retailer Deductions never submits a dispute in a retailer portal.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `deductions_audit` | Classify every deduction, check it against the invoice, proof of delivery and your agreed allowances, and give a dispute-by date. | runs |
| `deductions_explain` | Show every deduction taken on one invoice and why it was flagged. | runs |
| `deductions_write_report` | Write retailer-deductions.csv and .html (by retailer, by type, every deduction not agreed) into out_dir (default fairshop-out/deductions). | runs |
| `deductions_draft_deduction_dispute` | Write drafts/deduction_dispute-<retailer>.md listing every deduction of one retailer to dispute, with reasons and dates. | asks first (Auto can be opted in) |
| `deductions_request_send` | After one named human click (even in Auto), record that the reviewed deduction dispute draft is approved in deduction_dispute-requests.csv. | one named click, even in Auto (`binding_send`) |
| `retailer_portal_submit` | Fairshop Retailer Deductions never submits a dispute in a retailer portal. | refused |
| `credit_memo_issue` | Fairshop Retailer Deductions never issues a credit memo or refund. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Retailer deductions (`deductions`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `retailer` (required) | text | Retailer, Customer, Trading Partner | Kunde, Client, 顧客, 客户 |
| `remit_id` | text | Remit ID, Remittance, Check Number, Payment ID | - |
| `invoice_number` (required) | text | Invoice, Invoice Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `po` | text | PO, PO Number | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `deduction_type` (required) | text | Deduction Type, Type, Reason | - |
| `deduction_code` | text | Deduction Code, Reason Code, Code | - |
| `amount` (required) | amount | Amount, Deduction Amount | Betrag, Montant, 金額, 金额 |
| `deduction_date` | date | Deduction Date, Date, Remit Date | - |

### Wholesale invoices (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice, Invoice Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `po` | text | PO, PO Number | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `retailer` | text | Retailer, Customer | Kunde, Client, 顧客, 客户 |
| `amount` | amount | Amount, Invoice Amount, Total | Betrag, Montant, 金額, 金额 |
| `units_shipped` | number | Units Shipped, Units, Quantity | - |
| `ship_date` | date | Ship Date, Date | Versanddatum, Date d'expédition, 出荷日, 发货日期 |

### Proof of delivery (`pods`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice, Invoice Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `units_delivered` | number | Units Delivered, Delivered, Received | - |
| `signed` | yes/no | Signed, Signature | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-retailer-deductions inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-retailer-deductions demo
npx -y fairshop-retailer-deductions mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-retailer-deductions": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-retailer-deductions",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-retailer-deductions -- npx -y fairshop-retailer-deductions mcp --root .`, or install the `fairshop-retailer-deductions` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-retailer-deductions approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-retailer-deductions approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-retailer-deductions kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-retailer-deductions tools                 # every tool, its policy and arguments
fairshop-retailer-deductions sources               # the columns each input is read from
fairshop-retailer-deductions inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-retailer-deductions call deductions_audit '{"deductions":"<deductions>","invoices":"<invoices>"}'
fairshop-retailer-deductions eval                  # the private eval cases on the fictional fixtures
fairshop-retailer-deductions demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Windows and allowances are your settings from your vendor agreements. Not legal advice.
- It never submits a dispute or issues a credit.
