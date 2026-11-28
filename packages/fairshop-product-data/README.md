# Fairshop Product Data (`fairshop-product-data`)

> Check product data before it goes to a channel: missing GTIN, brand, weight, price or images, titles over the limit you set, GTINs with a wrong check digit or shared by two SKUs, zero weights and prices, and thin descriptions. Never changes a listing.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it a product export (Shopify products, an Amazon flat file, WooCommerce or your own CSV), with a channel column when rules differ by channel, and optionally your rules per channel: title limit, required fields, minimum images and description length (defaults: 200 characters; title, GTIN, brand, weight and price required; 1 image; 100 characters).

- **missing fields**, with a completeness percent per row;
- **title over the limit**;
- **GTIN with a wrong check digit or length** (GTIN-8, 12, 13, 14), and **a GTIN shared by two SKUs**;
- **zero weight**, **zero price**, **too few images**, **short description**.

Shopify's product export (classic and current layouts) and WooCommerce's product export are read as those stores write them: Shopify's title, description, vendor and type are carried down from a product's first row to its variant rows, images are counted per product, and a WooCommerce variation takes its parent's weight, description and images when its own are blank. Barcode cells such as `ean:…; upc:…` and hyphenated ISBNs are read, and an 8-digit UPC-E code is checked through its 12-digit form. A product that does not ship (Shopify "Requires shipping" false, a WooCommerce virtual or external product) is not asked for a weight. These rules were found by running the agent on Shopify's and WooCommerce's own published sample files on 19 Nov 2026.

<!-- generated:start -->

## A demo run

`npx -y fairshop-product-data demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Product Data demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  7 product row(s): 6 to fix, 1 complete; average completeness 94.29%.
    Amazon:P1    100% ok   
    Amazon:P2    100% fix  gtin_invalid
    Etsy:P3      100% fix  title_too_long
    Shopify:P4    60% fix  missing_fields, images_below_min
    Shopify:P5   100% fix  weight_zero, price_zero
    Shopify:P6   100% fix  gtin_shared
    eBay:P7      100% fix  description_short

▶ Write the worklist
  status: executed  decision: allow
  Report written: 7 product row(s): 6 to fix, 1 complete; average completeness 94.29%.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  fix list products drafted with 2 open marker(s) ([TO CONFIRM the person who maintains product data], [CHECK new value]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries listing_update itself
  status: blocked  decision: block
  reason: Fairshop Product Data never changes a product or listing.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `catalog_audit` | Check every product row against the rules you set per channel and the GTIN check digit; returns what to fix and completeness per row. | runs |
| `catalog_explain` | Show every problem found on one product. | runs |
| `catalog_write_report` | Write product-data.csv and .html (by channel, every product to fix) into out_dir (default fairshop-out/catalog). | runs |
| `catalog_draft_fix_list` | Write drafts/fix_list-products.md: one line per problem with a blank fix. | asks first (Auto can be opted in) |
| `catalog_request_approve` | After one named human click (even in Auto), record that the reviewed fix list draft is approved in fix_list-requests.csv. | one named click, even in Auto (`go_live`) |
| `listing_update` | Fairshop Product Data never changes a product or listing. | refused |
| `feed_submit` | Fairshop Product Data never submits a feed to a channel. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Product data (`products`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Variant SKU, Seller SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `channel` | text | Channel, Marketplace, Store | Kanal, Canal, チャネル, 渠道 |
| `title` | text | Title, Product Title, Item Name, Name | Titel, Titre, 商品名, 商品名称 |
| `description` | text | Description, Body, Product Description | Beschreibung, Description, 摘要, 摘要 |
| `gtin` | text | GTIN, UPC, EAN, Barcode, Product ID | GTIN, GTIN, JANコード, 条形码 |
| `brand` | text | Brand, Vendor, Manufacturer | - |
| `weight` | number | Weight, Item Weight, Shipping Weight | Gewicht, Poids, 重量, 重量 |
| `image_count` | number | Images, Image Count, Number of Images | - |
| `price` | amount | Price, List Price, Variant Price | Preis, Prix, 価格, 价格 |
| `hs_code` | text | HS Code, Harmonized Code, HTS Code | - |
| `country_of_origin` | text | Country of Origin, Origin Country, Made In | Ursprungsland, Pays d'origine, 原産国, 原产国 |
| `category` | text | Category, Product Type, Type | Kategorie, Catégorie, 経費科目, 费用类别 |
| `requires_shipping` | yes/no | Requires Shipping, Variant Requires Shipping, Shipping Required, Ships | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shopify | Products > Export (CSV), classic layout ("Handle", "Variant SKU") | Handle, Title, Variant SKU, Variant Price | no |
| Shopify | Products > Export (CSV), current layout ("URL handle", "Variant Barcodes") | Title, URL handle, SKU, Price | run on Shopify's product CSV template (help.shopify.com/csv/product_template.csv) on 2026-11-19 |
| WooCommerce | Products > Export (CSV), built-in product exporter | ID, Type, SKU, Name, Regular price | run on WooCommerce's sample_products.csv (woocommerce/woocommerce on GitHub) on 2026-11-19 |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-product-data inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-product-data demo
npx -y fairshop-product-data mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-product-data": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-product-data",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-product-data -- npx -y fairshop-product-data mcp --root .`, or install the `fairshop-product-data` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-product-data approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-product-data approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-product-data kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-product-data tools                 # every tool, its policy and arguments
fairshop-product-data sources               # the columns each input is read from
fairshop-product-data inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-product-data call catalog_audit '{"products":"<products>"}'
fairshop-product-data eval                  # the private eval cases on the fictional fixtures
fairshop-product-data demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The rules are your settings; channels change theirs. A valid check digit does not mean the GTIN is registered to you.
- It never changes product data or submits a feed.
