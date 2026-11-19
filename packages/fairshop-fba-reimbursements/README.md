# Fairshop FBA Reimbursements (`fairshop-fba-reimbursements`)

> Find what Amazon still owes for FBA inventory: units lost or damaged in the warehouse, refunds whose return never arrived, and reimbursements below your unit value, each with a claim-by date. Never files a case; filing is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the FBA inventory adjustments (or Inventory Ledger) report, and when you have them the Reimbursements report, the customer returns report and your refunds. It works out:

- **lost or damaged units not settled**: per SKU, units lost or damaged in the warehouse, less units found and units already reimbursed (earliest first);
- **refunds with no return**: a refunded order whose units did not come back within the grace days and that no reimbursement names;
- **low reimbursements**: paid per unit more than `low_pct` under the unit value you set.

Each claim gets a claim-by date (event date plus `claim_window_days`), a value from your unit values, and the report adds a calendar of deadlines.

## How it decides

Reason codes are settings (`lost_codes`, `found_codes`, `damaged_codes`; defaults M and 5, F and N, E H K Q 6), and words like "lost", "found" and "damaged" are also read. A unit is left alone for `wait_days` (default 30) while Amazon may still find or pay it. Units past the window are reported as lost, not claimed.

<!-- generated:start -->

## A demo run

`npx -y fairshop-fba-reimbursements demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop FBA Reimbursements demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  11 item(s): 2 to claim (36 estimated), 2 still inside the wait, 2 past the window (80 lost), 1 low reimbursement(s) to review, 4 settled.
    SKU:BAG-04                         window_closed    0       0  
    SKU:CAP-03                         waiting          0       0  
    SKU:MUG-01                         claim            2      24  2026-11-30
    SKU:SOCK-05                        ok               0       0  
    SKU:TEE-02                         ok               0       0  
    ORDER:113-1111111-1111111:MUG-01   claim            1      12  2026-12-24
    ORDER:113-2222222-2222222:TEE-02   ok               0       0  2026-12-29
    ORDER:113-3333333-3333333:CAP-03   waiting          0       0  2027-02-02
    ORDER:113-4444444-4444444:BAG-04   window_closed    0       0  2026-10-14
    ORDER:113-5555555-5555555:MUG-01   ok               0       0  2026-12-15
    REIMB:R-2                          review           0       0  

▶ Write the worklist
  status: executed  decision: allow
  Report written: 11 item(s): 2 to claim (36 estimated), 2 still inside the wait, 2 past the window (80 lost), 1 low reimbursement(s) to review, 4 settled.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  reimbursement case claims drafted for 56 with 3 open marker(s) ([TO CONFIRM Seller Central case, Fulfillment by Amazon > Investigate inventory], [TO CONFIRM merchant token], [ATTACH proof of cost (supplier invoice) for any unit value questioned]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries seller_central_case_submit itself
  status: blocked  decision: block
  reason: Fairshop FBA Reimbursements never logs in to Seller Central or opens a case; a person files the reviewed draft.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `reimburse_audit` | Work out, per SKU and per refunded order, what Amazon still owes: lost or damaged units not found or reimbursed, refunds with no return, low reimbursements. | runs |
| `reimburse_explain` | Show one SKU, refunded order or reimbursement with its units, value, claim-by date and reasons. | runs |
| `reimburse_write_report` | Write fba-reimbursements.csv and .html (every item that is not settled) and claim-deadlines.ics (one event per claim-by date) into out_dir (default fairshop-out/reimburse). | runs |
| `reimburse_draft_reimbursement_case` | Write drafts/reimbursement_case-claims.md listing every claimable SKU and order (and low reimbursements) with units, value and claim-by date. | asks first (Auto can be opted in) |
| `reimburse_request_file` | After one named human click (even in Auto), record that the reviewed reimbursement case draft is approved in reimbursement_case-requests.csv. | one named click, even in Auto (`binding_send`) |
| `seller_central_case_submit` | Fairshop FBA Reimbursements never logs in to Seller Central or opens a case; a person files the reviewed draft. | refused |
| `removal_order_create` | Fairshop FBA Reimbursements never creates removal or disposal orders. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### FBA inventory adjustments (`adjustments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Adjusted Date, adjusted-date | Datum, Date, 日付, 日期 |
| `fnsku` | text | FNSKU, fnsku | - |
| `sku` (required) | text | SKU, Seller SKU, MSKU, sku | Artikelnummer, Référence, 品番, 物料编码 |
| `reason` (required) | text | Reason, Reason Code, Disposition, reason | Grund, Motif, 理由, 原因 |
| `quantity` (required) | number | Quantity, Qty, quantity, Units | Menge, Quantité, 数量, 数量 |
| `transaction_id` | text | Transaction ID, transaction-item-id, Reference ID | Referenz, Référence, 参照番号, 参考号 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | FBA Inventory Adjustments report | adjusted-date, transaction-item-id, fnsku, reason, quantity | no |
| Amazon Seller Central | Inventory Ledger, detailed view | Date, FNSKU, MSIN, Event Type, Reason, Quantity | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### FBA reimbursements (`reimbursements`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` | date | Approval Date, approval-date, Date | Datum, Date, 日付, 日期 |
| `reimbursement_id` (required) | text | Reimbursement ID, reimbursement-id | Referenz, Référence, 参照番号, 参考号 |
| `sku` | text | SKU, sku, Seller SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `reason` | text | Reason, reason | Grund, Motif, 理由, 原因 |
| `quantity` | number | Quantity, Quantity Reimbursed, Units | Menge, Quantité, 数量, 数量 |
| `amount` | amount | Amount, Amount Total, amount-total, Total | Betrag, Montant, 金額, 金额 |
| `order_id` | text | Order ID, amazon-order-id, Order | Bestellnummer, N° de commande, 注文番号, 订单号 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | FBA Reimbursements report | approval-date, reimbursement-id, reason, amount-total | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### FBA customer returns (`returns`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order ID, order-id, Order | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, sku | Artikelnummer, Référence, 品番, 物料编码 |
| `date` | date | Return Date, return-date, Date | Datum, Date, 日付, 日期 |
| `quantity` | number | Quantity, Qty, quantity | Menge, Quantité, 数量, 数量 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | FBA Customer Returns report | return-date, order-id, fnsku, detailed-disposition | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Refunds (`refunds`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order ID, order-id, Order | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, sku | Artikelnummer, Référence, 品番, 物料编码 |
| `refund_date` | date | Refund Date, Date, posted-date | Datum, Date, 日付, 日期 |
| `amount` | amount | Refund Amount, Amount, Refunded | Betrag, Montant, 金額, 金额 |
| `quantity` | number | Quantity, Qty, quantity-purchased | Menge, Quantité, 数量, 数量 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-fba-reimbursements inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-fba-reimbursements demo
npx -y fairshop-fba-reimbursements mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-fba-reimbursements": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-fba-reimbursements",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-fba-reimbursements -- npx -y fairshop-fba-reimbursements mcp --root .`, or install the `fairshop-fba-reimbursements` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-fba-reimbursements approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-fba-reimbursements approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-fba-reimbursements kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-fba-reimbursements tools                 # every tool, its policy and arguments
fairshop-fba-reimbursements sources               # the columns each input is read from
fairshop-fba-reimbursements inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-fba-reimbursements call reimburse_audit '{"adjustments":"<adjustments>"}'
fairshop-fba-reimbursements eval                  # the private eval cases on the fictional fixtures
fairshop-fba-reimbursements demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Windows and codes change: confirm them against your own reports and the program's current rules.
- Values are estimates from your unit values; Amazon decides what it pays.
- It does not log in to Seller Central. A person files the case.
