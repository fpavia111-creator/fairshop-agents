# Fairshop SKU Margins (`fairshop-sku-margins`)

> Work out contribution margin per SKU and channel from sales, fees, shipping labels and unit costs: SKUs that lose money on a channel, SKUs under your margin floor, and SKUs with no cost on file. Never changes a price.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it sales lines (order, channel, SKU, quantity, revenue after discounts, shipping charged, fees), unit costs, and optionally shipping label costs per order. For every SKU on every channel:

- income = revenue + shipping charged; contribution = income − units × unit cost − fees − label costs (split across an order's lines by revenue);
- **losing money**: contribution below zero;
- **under the floor**: margin under `margin_floor_pct` (default 15%);
- **no cost on file**.

<!-- generated:start -->

## A demo run

`npx -y fairshop-sku-margins demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop SKU Margins demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  5 SKU and channel pair(s), revenue 130, contribution 35.3: 1 losing money, 2 under your floor or with no cost, 2 fine.
    Amazon|BOWL-2    income     15 contribution    2.5  16.7% review
    Shopify|BOWL-2   income     30 contribution   -1.2    -4% fix
    Amazon|MUG-1     income     20 contribution    9.5  47.5% ok
    Shopify|MUG-1    income     45 contribution   24.5  54.4% ok
    Etsy|VASE-3      income     31 contribution      -     -% review

▶ Write the worklist
  status: executed  decision: allow
  Report written: 5 SKU and channel pair(s), revenue 130, contribution 35.3: 1 losing money, 2 under your floor or with no cost, 2 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  pricing review skus drafted with 2 open marker(s) ([TO CONFIRM the person who sets prices], [CHECK raise price / cut cost / change shipping / stop selling here]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries price_update itself
  status: blocked  decision: block
  reason: Fairshop SKU Margins never changes a price.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `margins_margins` | Income (revenue plus shipping charged) less unit cost, fees and shipping labels for every SKU on every channel, with the margin percent. | runs |
| `margins_explain` | Show the income, costs and margin of one SKU on every channel. | runs |
| `margins_write_report` | Write sku-margins.csv (every SKU and channel) and .html (by channel, every pair) into out_dir (default fairshop-out/margins). | runs |
| `margins_draft_pricing_review` | Write drafts/pricing_review-skus.md: every SKU and channel losing money, under the floor or without a cost, with a blank option. | asks first (Auto can be opted in) |
| `margins_request_approve` | After one named human click (even in Auto), record that the reviewed pricing review draft is approved in pricing_review-requests.csv. | one named click, even in Auto (`go_live`) |
| `price_update` | Fairshop SKU Margins never changes a price. | refused |
| `promotion_create` | Fairshop SKU Margins never creates or ends a promotion. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Sales lines (`sales`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `date` | date | Date, Order Date, Created at | Datum, Date, 日付, 日期 |
| `channel` | text | Channel, Source, Marketplace | Kanal, Canal, チャネル, 渠道 |
| `sku` (required) | text | SKU, Lineitem sku, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `qty` | number | Quantity, Qty, Units | Menge, Quantité, 数量, 数量 |
| `revenue` (required) | amount | Revenue, Net Sales, Line Total, Item Price | - |
| `shipping_charged` | amount | Shipping Charged, Shipping, Shipping Revenue | Versandkosten berechnet, Frais de port facturés, 送料, 运费 |
| `fees` | amount | Fees, Marketplace Fees, Selling Fees, Payment Fees | Gebühr, Frais, 手数料, 手续费 |

### Unit costs (`costs`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Item SKU, Variant SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `unit_cost` (required) | amount | Unit Cost, Cost, Cost per item, COGS | Stückkosten, Coût unitaire, 単価, 单位成本 |

### Shipping labels (`labels`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `label_cost` (required) | amount | Label Cost, Shipping Cost, Postage, Rate Amount | Etikettenkosten, Coût de l’étiquette, ラベル費用, 面单费用 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-sku-margins inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-sku-margins demo
npx -y fairshop-sku-margins mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-sku-margins": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-sku-margins",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-sku-margins -- npx -y fairshop-sku-margins mcp --root .`, or install the `fairshop-sku-margins` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-sku-margins approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-sku-margins approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-sku-margins kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-sku-margins tools                 # every tool, its policy and arguments
fairshop-sku-margins sources               # the columns each input is read from
fairshop-sku-margins inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-sku-margins call margins_margins '{"sales":"<sales>","costs":"<costs>"}'
fairshop-sku-margins eval                  # the private eval cases on the fictional fixtures
fairshop-sku-margins demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Contribution leaves out ads, storage, returns and overheads; it is a first cut, not a profit and loss.
- It never changes a price or a promotion.
