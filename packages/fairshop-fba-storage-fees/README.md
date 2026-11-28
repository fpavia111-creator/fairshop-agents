# Fairshop FBA Storage Fees (`fairshop-fba-storage-fees`)

> Check FBA storage fees against the rates you confirm, and act before inventory lots cross into the next aged-inventory bracket. Never creates removal orders; the plan is one human click.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the monthly storage fee report, optionally your inventory lots (SKU, received date, units on hand), and a settings file with the storage rates per cubic foot by size tier and season and the aged-inventory brackets, written from the current fee page and confirmed by you.

- **storage fee above your rate**: average units × volume × rate gives less than the charge;
- **lot about to cross a bracket**: a lot reaches the next bracket within `warn_days` (default 30); you get the date and the extra monthly cost;
- **lot already in a bracket**: the estimated monthly surcharge;
- **storage above margin**: storage plus surcharge per unit is more than the SKU margin you set.

## How it decides

"Oversize", "large", "bulky" and "extra" tiers read as oversize; everything else as standard. October to December use the `oct-dec` rate. Lot ages count from the received date to `as_of`.

<!-- generated:start -->

## A demo run

`npx -y fairshop-fba-storage-fees demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop FBA Storage Fees demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  11 item(s): 1 storage fee(s) above your rates (6 over), 1 lot(s) to act on before the next aged bracket, 4 to review (about 109 a month in aged surcharges), 5 fine.
    FEE:BOX-4:2026-10      ok           24      24  
    FEE:CUP-3:2026-10      dispute      30      24  storage_over_rate
    FEE:LAMP-1:2026-09     ok           39      39  
    FEE:LAMP-1:2026-10     ok          120     120  
    FEE:RUG-2:2026-10      ok           60      60  
    LOT:BOX-4:2025-10-01   review        0       -  aged_in_bracket
    LOT:LAMP-1:2026-06-01  act           0       - 2026-11-29 aged_bracket_soon
    LOT:LAMP-1:2026-10-01  ok            0       -  
    LOT:RUG-2:2026-05-01   review        0       -  aged_in_bracket
    SKU:BOX-4              review       24       -  storage_exceeds_margin
    SKU:RUG-2              review       60       -  storage_exceeds_margin

▶ Write the worklist
  status: executed  decision: allow
  Report written: 11 item(s): 1 storage fee(s) above your rates (6 over), 1 lot(s) to act on before the next aged bracket, 4 to review (about 109 a month in aged surcharges), 5 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  aged inventory plan lots drafted with 2 open marker(s) ([TO CONFIRM the person who approves removals and promotions], [CHECK sell / move / remove]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries removal_order_create itself
  status: blocked  decision: block
  reason: Fairshop FBA Storage Fees never creates removal, disposal or liquidation orders.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `storage_audit` | Check every monthly storage fee against your rates, age every inventory lot against your aged-inventory brackets, and compare storage per unit with each SKU margin. | runs |
| `storage_explain` | Show the storage fees, lots and margin check of one SKU. | runs |
| `storage_write_report` | Write fba-storage.csv and .html (every fee line above your rates, every lot to act on or review, every SKU over its margin) into out_dir (default fairshop-out/storage). | runs |
| `storage_draft_aged_inventory_plan` | Write drafts/aged_inventory_plan-lots.md listing every lot to act on or review, with units, act-by date and monthly surcharge, and a blank decision per lot. | asks first (Auto can be opted in) |
| `storage_request_approve` | After one named human click (even in Auto), record that the reviewed aged inventory plan draft is approved in aged_inventory_plan-requests.csv. | one named click, even in Auto (`go_live`) |
| `removal_order_create` | Fairshop FBA Storage Fees never creates removal, disposal or liquidation orders. | refused |
| `storage_fee_case_submit` | Fairshop FBA Storage Fees never opens a case about fees; a person does. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Monthly storage fees (`storage`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `month` (required) | text | Month, Month of Charge, month_of_charge | - |
| `sku` (required) | text | SKU, Seller SKU, sku | Artikelnummer, Référence, 品番, 物料编码 |
| `size_tier` | text | Size Tier, Product Size Tier, product_size_tier | - |
| `avg_qty` | number | Average Quantity On Hand, Avg Qty, Average Units | - |
| `unit_volume` | number | Item Volume, Unit Volume, Cubic Feet per Unit, item_volume | - |
| `fee` (required) | amount | Storage Fee, Estimated Monthly Storage Fee, Fee | Gebühr, Frais, 手数料, 手续费 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | Monthly Storage Fees report | asin, fnsku, month_of_charge, estimated_monthly_storage_fee | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Inventory lots (`lots`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, sku, Seller SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `received_date` (required) | date | Received Date, Receipt Date, Inventory Date, Date | Eingangsdatum, Date de réception, 受領日, 收到日期 |
| `qty` (required) | number | Quantity, Qty, Units, Available | Menge, Quantité, 数量, 数量 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-fba-storage-fees inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-fba-storage-fees demo
npx -y fairshop-fba-storage-fees mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-fba-storage-fees": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-fba-storage-fees",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-fba-storage-fees -- npx -y fairshop-fba-storage-fees mcp --root .`, or install the `fairshop-fba-storage-fees` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-fba-storage-fees approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-fba-storage-fees approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-fba-storage-fees kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-fba-storage-fees tools                 # every tool, its policy and arguments
fairshop-fba-storage-fees sources               # the columns each input is read from
fairshop-fba-storage-fees inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-fba-storage-fees call storage_audit '{"storage":"<storage>","settings":"<settings>"}'
fairshop-fba-storage-fees eval                  # the private eval cases on the fictional fixtures
fairshop-fba-storage-fees demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Rates and brackets are your settings; the agent does not know current fees.
- Surcharges are estimates from the volume in your storage report.
- It does not create removal orders or change listings. A person decides.
