# Fairshop Carrier Adjustments (`fairshop-carrier-adjustments`)

> Check carrier adjustments against the weight and dimensions you entered on each label: disputes your own data supports (with a dispute-by date), adjustments that are right because your product data is wrong, the SKUs that keep causing them, and adjustments past their window. Never files a dispute or pays.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it adjustment lines (UPS billing adjustments, USPS APV, FedEx or your own CSV) and the labels as bought (tracking, SKU, entered weight and box size). For each weight or size adjustment it recomputes the billable weight from your label: the larger of the rounded-up weight and the dimensional weight (length × width × height ÷ your divisor, default 139).

- **disputable**: billed above what your label gives; dispute by the date plus `dispute_window_days` (default 30);
- **your data is low**: the adjustment matches your own box size; repeat SKUs are listed so their data gets fixed;
- **no box size on the label**, **address corrections** and other reasons are listed for review;
- **past the window**: disputable but too late.

<!-- generated:start -->

## A demo run

`npx -y fairshop-carrier-adjustments demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Carrier Adjustments demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 adjustment(s), 41.35 in total: 1 your label data disproves (6.4 to dispute), 3 where your product data is wrong, 2 to review, 1 past the window (5).
    1ZA1       LAMP-1     6.4 dispute       2026-12-01
    1ZA2       BOX-2      4.1 fix_data      
    1ZA3       BOX-2      4.1 fix_data      
    1ZA5       CUP-4        5 window_closed 2026-10-20
    1ZA6       LAMP-1    18.5 review        
    9400B4     MUG-3     3.25 review        
    SKU:BOX-2  BOX-2      8.2 fix_data      

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 adjustment(s), 41.35 in total: 1 your label data disproves (6.4 to dispute), 3 where your product data is wrong, 2 to review, 1 past the window (5).

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  adjustment dispute UPS drafted for 6.4 with 3 open marker(s) ([TO CONFIRM UPS billing disputes], [TO CONFIRM shipper account], [ATTACH photos of the packed box on a scale with a tape measure, if you have them]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries carrier_dispute_submit itself
  status: blocked  decision: block
  reason: Fairshop Carrier Adjustments never files a dispute in a carrier portal.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `adjustments_audit` | Recompute the billable weight from the weight and dimensions on each label and compare it with the adjusted weight; group repeat SKUs. | runs |
| `adjustments_explain` | Show one adjustment (or SKU) and what your label data says. | runs |
| `adjustments_write_report` | Write carrier-adjustments.csv and .html (by SKU, every adjustment) and dispute-deadlines.ics into out_dir (default fairshop-out/adjustments). | runs |
| `adjustments_draft_adjustment_dispute` | Write drafts/adjustment_dispute-<carrier>.md listing every adjustment your label data disproves, inside its window. | asks first (Auto can be opted in) |
| `adjustments_request_file` | After one named human click (even in Auto), record that the reviewed adjustment dispute draft is approved in adjustment_dispute-requests.csv. | one named click, even in Auto (`binding_send`) |
| `carrier_dispute_submit` | Fairshop Carrier Adjustments never files a dispute in a carrier portal. | refused |
| `invoice_pay` | Fairshop Carrier Adjustments never pays a carrier invoice. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Carrier adjustments (`adjustments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `tracking` (required) | text | Tracking, Tracking Number | Sendungsnummer, Numéro de suivi, 追跡番号, 运单号 |
| `date` | date | Date, Adjustment Date, Invoice Date | Datum, Date, 日付, 日期 |
| `carrier` | text | Carrier, Provider | Spediteur, Transporteur, 運送会社, 承运商 |
| `reason` | text | Reason, Adjustment Reason, Charge Description | Grund, Motif, 理由, 原因 |
| `amount` (required) | amount | Amount, Adjustment Amount, Net Amount | Betrag, Montant, 金額, 金额 |
| `billed_weight` | pounds (kg converted) | Billed Weight, Adjusted Weight, Corrected Weight | Frachtpflichtiges Gewicht, Poids taxable, 課金重量, 计费重量 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| UPS Billing Center | Billing data, adjustment lines (CSV with header row) | Tracking Number, Charge Description, Net Amount, Adjustment Reason or Charge Category Detail Code | no |
| USPS (via your shipping platform) | Automated Package Verification adjustments export | Tracking Number, APV Amount or Adjustment Amount, Entered Weight or Declared Weight | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Labels as bought (`labels`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `tracking` (required) | text | Tracking, Tracking Number | Sendungsnummer, Numéro de suivi, 追跡番号, 运单号 |
| `order_id` | text | Order, Order ID, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `sku` | text | SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `entered_weight` | number | Entered Weight, Weight, Declared Weight | Gewicht, Poids, 重量, 重量 |
| `length` | inches (cm converted) | Length, Package Length | Länge, Longueur, 長さ, 长 |
| `width` | inches (cm converted) | Width, Package Width | Breite, Largeur, 幅, 宽 |
| `height` | inches (cm converted) | Height, Package Height | Höhe, Hauteur, 高さ, 高 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-carrier-adjustments inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-carrier-adjustments demo
npx -y fairshop-carrier-adjustments mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-carrier-adjustments": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-carrier-adjustments",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-carrier-adjustments -- npx -y fairshop-carrier-adjustments mcp --root .`, or install the `fairshop-carrier-adjustments` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-carrier-adjustments approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-carrier-adjustments approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-carrier-adjustments kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-carrier-adjustments tools                 # every tool, its policy and arguments
fairshop-carrier-adjustments sources               # the columns each input is read from
fairshop-carrier-adjustments inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-carrier-adjustments call adjustments_audit '{"adjustments":"<adjustments>","labels":"<labels>"}'
fairshop-carrier-adjustments eval                  # the private eval cases on the fictional fixtures
fairshop-carrier-adjustments demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Divisors and windows are your settings from your carrier agreement.
- The agent cannot see the box; photos help a dispute. It never files or pays.
