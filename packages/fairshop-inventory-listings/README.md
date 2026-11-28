# Fairshop Inventory Listings (`fairshop-inventory-listings`)

> Compare stock by location with what each channel lists: listings that can oversell, listings at zero while stock sits on the shelf, inactive listings with stock, unknown SKUs, and stock listed nowhere. Never changes a listing.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it stock by location (Shopify inventory, WMS, 3PL or FBA export) and your channel listings (Amazon All Listings, eBay listings or your own CSV). For every listing it works out what its locations can ship: on hand less committed, from the locations that feed its fulfilment type (FBA listings from FBA locations, the rest from every other location, or as you set under `feeds`), less any `buffer` you hold back for that channel.

- **listed above what can ship** (units that could be oversold);
- **listed at zero with stock**, and **inactive with stock** (sales missed);
- **unknown SKU**: listed but not in the stock file;
- **stock listed nowhere**;
- **no SKU**: stock rows or listings without a SKU are reported once by name, since nothing can be matched to them (Shopify allows a variant with no SKU; its own inventory template has one).

<!-- generated:start -->

## A demo run

`npx -y fairshop-inventory-listings demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Inventory Listings demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  8 listing(s): 3 to correct (12 unit(s) could be oversold), 3 to review (25 unit(s) in stock with no listing), 3 fine.
    Amazon:AMZ-1   CANDLE-1  listed  20 can ship  20 ok
    Amazon:AMZ-2   SOAP-2    listed  10 can ship  10 ok
    Etsy:ET-4      MUG-4     listed   0 can ship  10 fix
    Shopify:SH-1   CANDLE-1  listed  35 can ship  35 ok
    Shopify:SH-2   SOAP-2    listed   5 can ship   0 fix
    Shopify:SH-9   LAMP-9    listed   3 can ship   0 review
    Walmart:WM-4   MUG-4     listed   0 can ship  10 review
    eBay:EB-1      CANDLE-1  listed  40 can ship  33 fix
    SKU:TOWEL-3    TOWEL-3   listed   0 can ship  25 review

▶ Write the worklist
  status: executed  decision: allow
  Report written: 8 listing(s): 3 to correct (12 unit(s) could be oversold), 3 to review (25 unit(s) in stock with no listing), 3 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  quantity corrections listings drafted with 2 open marker(s) ([TO CONFIRM the person who updates listings], [CHECK open orders and inbound stock before changing any quantity]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries listing_quantity_push itself
  status: blocked  decision: block
  reason: Fairshop Inventory Listings never changes a quantity on a channel.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `inventory_audit` | For every listing, work out what its locations can ship (less committed units and any buffer) and compare it with the listed quantity; list stock with no listing. | runs |
| `inventory_explain` | Show every listing and the stock of one SKU. | runs |
| `inventory_write_report` | Write inventory-listings.csv and .html (by channel, every listing to correct or review, stock listed nowhere) into out_dir (default fairshop-out/inventory). | runs |
| `inventory_draft_quantity_corrections` | Write drafts/quantity_corrections-listings.md: every listing to correct with the quantity its locations can ship. | asks first (Auto can be opted in) |
| `inventory_request_approve` | After one named human click (even in Auto), record that the reviewed quantity corrections draft is approved in quantity_corrections-requests.csv. | one named click, even in Auto (`go_live`) |
| `listing_quantity_push` | Fairshop Inventory Listings never changes a quantity on a channel. | refused |
| `inventory_transfer_create` | Fairshop Inventory Listings never creates transfers or shipments between locations. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Stock by location (`stock`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Item SKU, Variant SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `location` | text | Location, Warehouse, Site, Fulfillment Center | Lagerort, Emplacement, 保管場所, 库位 |
| `on_hand` (required) | number | On Hand, Quantity On Hand, Qty On Hand, Stock | Bestand, Stock, 在庫数, 库存数量 |
| `committed` | number | Committed, Reserved, Allocated | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shopify | Inventory > Export (CSV), one row per variant and location | Handle, SKU, Location, Available or On hand | run on Shopify's inventory CSV template (help.shopify.com/csv/inventory_template.csv) on 2026-11-19 |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Channel listings (`listings`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `channel` (required) | text | Channel, Marketplace, Store | Kanal, Canal, チャネル, 渠道 |
| `sku` (required) | text | SKU, Seller SKU, Custom Label | Artikelnummer, Référence, 品番, 物料编码 |
| `listing_id` | text | Listing ID, Item ID, ASIN, Item Number | Angebots-ID, ID de l’annonce, 出品ID, 商品ID |
| `listed_qty` (required) | number | Listed Quantity, Quantity, Available Quantity, Qty | Menge, Quantité, 数量, 数量 |
| `status` | text | Status, Listing Status | Status, Statut, ステータス, 状态 |
| `fulfillment` | text | Fulfillment, Fulfilled By, Fulfillment Channel | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | All Listings report | seller-sku, asin1, item-name, price, quantity | no |
| eBay Seller Hub | Listings > Active > Download report (CSV) | Item number, Title, Custom label (SKU), Current price or Start price | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-inventory-listings inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-inventory-listings demo
npx -y fairshop-inventory-listings mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-inventory-listings": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-inventory-listings",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-inventory-listings -- npx -y fairshop-inventory-listings mcp --root .`, or install the `fairshop-inventory-listings` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-inventory-listings approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-inventory-listings approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-inventory-listings kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-inventory-listings tools                 # every tool, its policy and arguments
fairshop-inventory-listings sources               # the columns each input is read from
fairshop-inventory-listings inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-inventory-listings call inventory_audit '{"stock":"<stock>","listings":"<listings>"}'
fairshop-inventory-listings eval                  # the private eval cases on the fictional fixtures
fairshop-inventory-listings demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Export stock and listings at the same time; orders in between make them disagree.
- It never changes a quantity or a listing.
