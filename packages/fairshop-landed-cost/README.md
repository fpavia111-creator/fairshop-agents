# Fairshop Landed Cost (`fairshop-landed-cost`)

> Spread freight, duty, broker and other import costs over each shipment's SKUs to get a landed unit cost, compare it with the cost in your store, and find shipments with no costs and costs with no shipment. Never changes a cost.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it shipment lines (shipment, SKU, quantity, unit cost, unit weight), the import costs per shipment (freight, duty, broker, insurance, drayage) and optionally the unit costs recorded in your store or books.

- each cost is spread over its shipment's lines by weight, value or units (default: freight and drayage by weight, the rest by value; set your own under `basis`); with no weights it falls back to value and says so;
- the landed unit cost per SKU, weighted across shipments;
- **recorded cost off** by more than `variance_pct` (default 5%), with the value at stake;
- **shipments with no costs**, and **costs for a shipment not in the lines**.

<!-- generated:start -->

## A demo run

`npx -y fairshop-landed-cost demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Landed Cost demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  2 shipment(s), 3 SKU(s): 1840 in import costs spread, 300 with no shipment; 3 to review, 2 fine.
    SHIP:SH-2        unit     - landed     - recorded     - review
    SHIP:SH-3        unit     - landed     - recorded     - review
    SKU:BOWL-2       unit     6 landed  7.72 recorded   6.5 review
    SKU:MUG-1        unit     4 landed  4.98 recorded  4.98 ok
    SKU:TOWEL-3      unit     3 landed     3 recorded     3 ok

▶ Write the worklist
  status: executed  decision: allow
  Report written: 2 shipment(s), 3 SKU(s): 1840 in import costs spread, 300 with no shipment; 3 to review, 2 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  cost updates skus drafted with 2 open marker(s) ([TO CONFIRM the person who keeps item costs], [CHECK 7.72 or a blended cost with stock on hand]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries store_cost_update itself
  status: blocked  decision: block
  reason: Fairshop Landed Cost never changes a cost in a store or ledger.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `landed_calculate` | Spread each shipment's import costs over its lines and work out a landed unit cost per SKU, weighted across shipments. | runs |
| `landed_explain` | Show the purchase cost, the import costs spread onto one SKU and its landed unit cost. | runs |
| `landed_write_report` | Write landed-cost.csv (every SKU with its landed unit cost) and .html (by shipment, every SKU) into out_dir (default fairshop-out/landed). | runs |
| `landed_draft_cost_updates` | Write drafts/cost_updates-skus.md: every SKU whose recorded cost is off the landed cost, with the landed figure. | asks first (Auto can be opted in) |
| `landed_request_approve` | After one named human click (even in Auto), record that the reviewed cost updates draft is approved in cost_updates-requests.csv. | one named click, even in Auto (`go_live`) |
| `store_cost_update` | Fairshop Landed Cost never changes a cost in a store or ledger. | refused |
| `inventory_revalue_post` | Fairshop Landed Cost never posts an inventory revaluation. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Shipment lines (`lines`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `shipment_id` (required) | text | Shipment, Shipment ID, Container, Entry | Sendungs-ID, N° d'expédition, 出荷番号, 发货单号 |
| `po` | text | PO, PO Number | Bestellnummer, Bon de commande, 発注番号, 采购订单号 |
| `sku` (required) | text | SKU, Item | Artikelnummer, Référence, 品番, 物料编码 |
| `qty` (required) | number | Quantity, Qty, Units | Menge, Quantité, 数量, 数量 |
| `unit_cost` (required) | amount | Unit Cost, FOB, Price | Stückkosten, Coût unitaire, 単価, 单位成本 |
| `unit_weight` | number | Unit Weight, Weight per Unit | - |

### Import costs (`costs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `shipment_id` (required) | text | Shipment, Shipment ID, Container, Entry | Sendungs-ID, N° d'expédition, 出荷番号, 发货单号 |
| `cost_type` (required) | text | Cost Type, Type, Charge | - |
| `amount` (required) | amount | Amount, Cost, Total | Betrag, Montant, 金額, 金额 |

### Recorded costs (`recorded`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Variant SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `recorded_cost` (required) | amount | Recorded Cost, Cost per item, Unit Cost, Cost | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-landed-cost inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-landed-cost demo
npx -y fairshop-landed-cost mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-landed-cost": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-landed-cost",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-landed-cost -- npx -y fairshop-landed-cost mcp --root .`, or install the `fairshop-landed-cost` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-landed-cost approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-landed-cost approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-landed-cost kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-landed-cost tools                 # every tool, its policy and arguments
fairshop-landed-cost sources               # the columns each input is read from
fairshop-landed-cost inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-landed-cost call landed_calculate '{"lines":"<lines>","costs":"<costs>"}'
fairshop-landed-cost eval                  # the private eval cases on the fictional fixtures
fairshop-landed-cost demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Duty is spread from the amounts in your costs file, not computed from tariff rates. Not customs or accounting advice.
- It never changes a cost or posts a revaluation.
