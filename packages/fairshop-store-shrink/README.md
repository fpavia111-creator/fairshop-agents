# Fairshop Store Shrink (`fairshop-store-shrink`)

> Measure shrink by store and category from your inventory adjustments and sales: stores above your target, stores where most loss has no explained reason, and SKUs written off again and again. Never posts an adjustment or touches staff records.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it inventory adjustments (Square inventory history or your own CSV: store, SKU, category, quantity change, unit cost, reason, who counted) and net sales by store and category for the same period. Adjustments are valued at cost; found units count back.

- **above target**: shrink over `target_pct` of sales (default 1.5%);
- **unexplained losses**: more than `unexplained_pct` (default 50%) of a store's losses have reasons like "unknown" or "count correction";
- **repeat SKUs**: one SKU written off `repeat_min` times (default 3) in one store.

The report splits shrink by store, by category and by reason. Who counted is masked in what the model sees.

<!-- generated:start -->

## A demo run

`npx -y fairshop-store-shrink demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Store Shrink demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  2 store(s): shrink 110 on 10500 in sales (1%); 2 store(s) or SKU(s) to review, 1 fine.
    SKU:Downtown|LIPBALM-2 shrink     75     -% review
    STORE:Downtown         shrink     89   1.5% review
    STORE:Uptown           shrink     21   0.5% ok

▶ Write the worklist
  status: executed  decision: allow
  Report written: 2 store(s): shrink 110 on 10500 in sales (1%); 2 store(s) or SKU(s) to review, 1 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  shrink review stores drafted for 110 with 3 open marker(s) ([TO CONFIRM loss-prevention or operations lead], [TO CONFIRM your name], [CHECK recount / move / process]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries inventory_adjust_post itself
  status: blocked  decision: block
  reason: Fairshop Store Shrink never posts or reverses an inventory adjustment.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `shrink_measure` | Value every adjustment at cost, put each store's shrink against its sales, and split it by category and reason. | runs |
| `shrink_explain` | Show one store (or SKU) with shrink, percent of sales and findings. | runs |
| `shrink_write_report` | Write store-shrink.csv and .html (by store, by category, by reason, every store or SKU to review) into out_dir (default fairshop-out/shrink). | runs |
| `shrink_draft_shrink_review` | Write drafts/shrink_review-stores.md: every store and SKU to review, with a blank next step. | asks first (Auto can be opted in) |
| `shrink_request_send` | After one named human click (even in Auto), record that the reviewed shrink review draft is approved in shrink_review-requests.csv. | one named click, even in Auto (`binding_send`) |
| `inventory_adjust_post` | Fairshop Store Shrink never posts or reverses an inventory adjustment. | refused |
| `employee_record_update` | Fairshop Store Shrink never writes to a staff record or changes access. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Inventory adjustments (`adjustments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` | date | Date, Adjusted At | Datum, Date, 日付, 日期 |
| `store` (required) | text | Store, Location, Site | Filiale, Magasin, 店舗, 门店 |
| `sku` (required) | text | SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `category` | text | Category, Department | Kategorie, Catégorie, 経費科目, 费用类别 |
| `qty` (required) | number | Quantity, Adjustment, Qty Change | Menge, Quantité, 数量, 数量 |
| `unit_cost` | amount | Unit Cost, Cost | Stückkosten, Coût unitaire, 単価, 单位成本 |
| `reason` | text | Reason, Adjustment Reason | Grund, Motif, 理由, 原因 |
| `counted_by` | text | Counted By, Employee, User | Gezählt von, Compté par, 棚卸担当者, 盘点人 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Square | Inventory > History export (CSV) | Date, Item, SKU, Location, Adjustment or Quantity, Reason | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Net sales (`sales`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `store` (required) | text | Store, Location | Filiale, Magasin, 店舗, 门店 |
| `category` | text | Category, Department | Kategorie, Catégorie, 経費科目, 费用类别 |
| `net_sales` (required) | amount | Net Sales, Sales, Revenue | Brutto, Brut, 総額, 总额 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-store-shrink inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-store-shrink demo
npx -y fairshop-store-shrink mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-store-shrink": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-store-shrink",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-store-shrink -- npx -y fairshop-store-shrink mcp --root .`, or install the `fairshop-store-shrink` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-store-shrink approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-store-shrink approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-store-shrink kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-store-shrink tools                 # every tool, its policy and arguments
fairshop-store-shrink sources               # the columns each input is read from
fairshop-store-shrink inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-store-shrink call shrink_measure '{"adjustments":"<adjustments>","sales":"<sales>"}'
fairshop-store-shrink eval                  # the private eval cases on the fictional fixtures
fairshop-store-shrink demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Shrink is only as good as the reasons and costs in your adjustments. Nothing here is a finding about a person.
- It never posts an adjustment or writes to a staff record.
