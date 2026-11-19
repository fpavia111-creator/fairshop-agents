# Fairshop Duplicate Listings (`fairshop-duplicate-listings`)

> Find duplicate and orphan listings across channels: the same SKU listed twice on one channel (and at different prices), look-alike titles under different SKUs, one GTIN shared by several SKUs, and listings for SKUs not in your catalog. Never ends or merges a listing.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your listings from every channel (channel, listing id, SKU, title, GTIN, price, status) and optionally your catalog of SKUs.

- **same SKU twice on one channel** (active listings only), with the prices when they differ;
- **look-alike titles** under different SKUs on one channel (shared words at or above `title_similarity`, default 0.9);
- **one GTIN on several SKUs**;
- **orphan listings**: SKUs not in your catalog.

<!-- generated:start -->

## A demo run

`npx -y fairshop-duplicate-listings demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Duplicate Listings demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  7 listing(s): 2 to clean up (duplicates and orphans), 2 to review (look-alike titles, shared GTINs), 4 fine.
    GTIN:036000291452      BOWL-3 MUG-1  review gtin_shared
    Amazon:B0EX001         MUG-1         ok     
    Amazon:B0EX002         MUG-1         fix    duplicate_sku_listing
    Amazon:B0EX003         MUG-2         review near_duplicate_title
    Etsy:ET-20             VASE-9        fix    orphan_listing
    Etsy:ET-21             MUG-1         ok     
    eBay:EB-10             MUG-1         ok     
    eBay:EB-11             BOWL-3        ok     

▶ Write the worklist
  status: executed  decision: allow
  Report written: 7 listing(s): 2 to clean up (duplicates and orphans), 2 to review (look-alike titles, shared GTINs), 4 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  cleanup list listings drafted with 2 open marker(s) ([TO CONFIRM the person who manages listings], [CHECK keep / end / merge / relink]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries listing_end itself
  status: blocked  decision: block
  reason: Fairshop Duplicate Listings never ends a listing.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `listings_audit` | Check every active listing for a second listing of the same SKU on its channel, look-alike titles, shared GTINs and SKUs missing from your catalog. | runs |
| `listings_explain` | Show one listing (or SKU) and why it was flagged. | runs |
| `listings_write_report` | Write duplicate-listings.csv and .html (by channel, every listing to clean up or review) into out_dir (default fairshop-out/listings). | runs |
| `listings_draft_cleanup_list` | Write drafts/cleanup_list-listings.md: every listing to clean up or review with a blank action. | asks first (Auto can be opted in) |
| `listings_request_approve` | After one named human click (even in Auto), record that the reviewed cleanup list draft is approved in cleanup_list-requests.csv. | one named click, even in Auto (`go_live`) |
| `listing_end` | Fairshop Duplicate Listings never ends a listing. | refused |
| `listing_merge` | Fairshop Duplicate Listings never merges or relinks listings. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Listings (`listings`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `channel` (required) | text | Channel, Marketplace, Store | Kanal, Canal, チャネル, 渠道 |
| `listing_id` (required) | text | Listing ID, Item ID, ASIN, Item Number | Angebots-ID, ID de l’annonce, 出品ID, 商品ID |
| `sku` | text | SKU, Seller SKU, Custom Label | Artikelnummer, Référence, 品番, 物料编码 |
| `title` | text | Title, Item Name, Product Title | Titel, Titre, 商品名, 商品名称 |
| `gtin` | text | GTIN, UPC, EAN, Barcode | GTIN, GTIN, JANコード, 条形码 |
| `price` | amount | Price, Current Price | Preis, Prix, 価格, 价格 |
| `status` | text | Status, Listing Status | Status, Statut, ステータス, 状态 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | All Listings report | seller-sku, asin1, item-name, price, quantity | no |
| eBay Seller Hub | Listings > Active > Download report (CSV) | Item number, Title, Custom label (SKU), Current price or Start price | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Catalog SKUs (`catalog`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Variant SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-duplicate-listings inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-duplicate-listings demo
npx -y fairshop-duplicate-listings mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-duplicate-listings": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-duplicate-listings",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-duplicate-listings -- npx -y fairshop-duplicate-listings mcp --root .`, or install the `fairshop-duplicate-listings` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-duplicate-listings approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-duplicate-listings approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-duplicate-listings kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-duplicate-listings tools                 # every tool, its policy and arguments
fairshop-duplicate-listings sources               # the columns each input is read from
fairshop-duplicate-listings inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-duplicate-listings call listings_audit '{"listings":"<listings>"}'
fairshop-duplicate-listings eval                  # the private eval cases on the fictional fixtures
fairshop-duplicate-listings demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Variants (sizes, colours) can look alike on purpose; read before acting.
- It never ends, merges or relinks a listing.
