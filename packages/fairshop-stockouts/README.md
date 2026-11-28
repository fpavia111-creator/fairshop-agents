# Fairshop Stockouts (`fairshop-stockouts`)

> Find days out of stock, orders taken or cancelled while out of stock, an estimate of sales lost, and SKUs that will run out before a reorder could arrive, with a suggested quantity. Never sends a purchase order.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it daily stock snapshots (date, SKU, on hand) and the order lines for the same days. Per SKU:

- **days out of stock**, and an estimate of the units and sales not made (the in-stock daily rate times those days);
- **oversold orders**: taken on a day with nothing on hand, or cancelled with a stock reason;
- **reorder now**: days of cover (on hand ÷ daily rate) under your lead time plus `safety_days`, with a suggested quantity that covers `order_days` more of sales.

<!-- generated:start -->

## A demo run

`npx -y fairshop-stockouts demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Stockouts demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  3 SKU(s): 2 order(s) taken or cancelled while out of stock (30), about 90 not sold on out-of-stock days (estimate), 1 SKU(s) to reorder now, 2 fine.
    R6:ROPE-1      oversold 1 unit(s) 15
    R7:ROPE-1      oversold 1 unit(s) 15
    SKU:HOOK-3     ok       on hand 5, 0/day, cover -
    SKU:KNOT-2     ok       on hand 47, 0.3/day, cover 156.67
    SKU:ROPE-1     reorder  on hand 18, 2/day, cover 9

▶ Write the worklist
  status: executed  decision: allow
  Report written: 3 SKU(s): 2 order(s) taken or cancelled while out of stock (30), about 90 not sold on out-of-stock days (estimate), 1 SKU(s) to reorder now, 2 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  purchase order Example Rope Co (fictional) drafted with 4 open marker(s) ([TO CONFIRM Example Rope Co (fictional) order contact], [TO CONFIRM PO number], [TO CONFIRM cost], [CHECK quantities against open purchase orders and minimum order quantities]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries supplier_po_send itself
  status: blocked  decision: block
  reason: Fairshop Stockouts never sends a purchase order; a person does.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `stockouts_audit` | Per SKU: days out of stock, orders taken or cancelled on those days, sales rate on in-stock days, days of cover and whether to reorder now. | runs |
| `stockouts_explain` | Show one SKU (or order) with its stock days, sales rate and reorder point. | runs |
| `stockouts_write_report` | Write stockouts.csv and .html (SKUs to reorder or review, every oversold order) into out_dir (default fairshop-out/stockouts). | runs |
| `stockouts_draft_purchase_order` | Write drafts/purchase_order-<supplier>.md with the suggested quantity of every SKU to reorder now. | asks first (Auto can be opted in) |
| `stockouts_request_send` | After one named human click (even in Auto), record that the reviewed purchase order draft is approved in purchase_order-requests.csv. | one named click, even in Auto (`binding_send`) |
| `supplier_po_send` | Fairshop Stockouts never sends a purchase order; a person does. | refused |
| `order_cancel` | Fairshop Stockouts never cancels or refunds an order. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Daily stock snapshots (`snapshots`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Snapshot Date, snapshot-date | Datum, Date, 日付, 日期 |
| `sku` (required) | text | SKU, Item SKU, sku | Artikelnummer, Référence, 品番, 物料编码 |
| `on_hand` (required) | number | On Hand, Available, Quantity, Stock | Bestand, Stock, 在庫数, 库存数量 |

### Order lines (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` (required) | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `sku` (required) | text | SKU, Lineitem sku | Artikelnummer, Référence, 品番, 物料编码 |
| `qty` | number | Quantity, Qty, Lineitem quantity | Menge, Quantité, 数量, 数量 |
| `price` | amount | Price, Unit Price, Lineitem price | Preis, Prix, 価格, 价格 |
| `status` | text | Status, Financial Status, Order Status | Status, Statut, ステータス, 状态 |
| `cancel_reason` | text | Cancel Reason, Cancellation Reason | Grund, Motif, 理由, 原因 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-stockouts inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-stockouts demo
npx -y fairshop-stockouts mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-stockouts": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-stockouts",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-stockouts -- npx -y fairshop-stockouts mcp --root .`, or install the `fairshop-stockouts` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-stockouts approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-stockouts approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-stockouts kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-stockouts tools                 # every tool, its policy and arguments
fairshop-stockouts sources               # the columns each input is read from
fairshop-stockouts inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-stockouts call stockouts_audit '{"snapshots":"<snapshots>","orders":"<orders>"}'
fairshop-stockouts eval                  # the private eval cases on the fictional fixtures
fairshop-stockouts demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Lost sales and suggested quantities are estimates from your own history; seasonality and promotions are not modelled.
- Lead times are your settings. It never sends a purchase order or cancels an order.
