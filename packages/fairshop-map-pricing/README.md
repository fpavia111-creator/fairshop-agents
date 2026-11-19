# Fairshop MAP Pricing (`fairshop-map-pricing`)

> Check advertised prices against your minimum advertised price (MAP) list: your own listings below MAP first, resellers below it (and repeat ones), exempt sellers and paused dates, and SKUs not on the list. Never changes a price or cuts off a reseller.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it advertised prices (your own channel exports plus any price checks you collected: date, seller, channel, SKU, price, whether the listing is yours) and your MAP policy (minimum per SKU, exempt sellers, paused date ranges). One line per seller and SKU:

- **your own listing below MAP** (fix these first);
- **a reseller below MAP**, and **repeat** when it happened on more than one day;
- **SKU not on your list**.

<!-- generated:start -->

## A demo run

`npx -y fairshop-map-pricing demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop MAP Pricing demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  8 price(s) from 4 seller(s): 1 of your own listing(s) below MAP, 2 reseller listing(s) below MAP, 1 SKU(s) not on your list, 2 fine.
    Brightway Home|LAMP-1      MAP  49.99 lowest   41.5 notice
    Brightway Home|VASE-3      MAP      - lowest     19 review
    Clearwater Outlet|RUG-2    MAP    129 lowest    125 ok
    Example Goods|LAMP-1       MAP  49.99 lowest  44.99 own
    Northgate Supply|LAMP-1    MAP  49.99 lowest  49.99 ok
    Northgate Supply|RUG-2     MAP    129 lowest    120 notice

▶ Write the worklist
  status: executed  decision: allow
  Report written: 8 price(s) from 4 seller(s): 1 of your own listing(s) below MAP, 2 reseller listing(s) below MAP, 1 SKU(s) not on your list, 2 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  map notice Brightway Home drafted with 2 open marker(s) ([TO CONFIRM Brightway Home contact from your reseller agreement], [CHECK the wording against your MAP policy and your agreement with this seller]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries own_price_update itself
  status: blocked  decision: block
  reason: Fairshop MAP Pricing never changes your prices.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `map_audit` | Group prices by seller and SKU and compare each with your minimum advertised price, minding exempt sellers and paused dates. | runs |
| `map_explain` | Show every SKU of one seller with its lowest price and MAP. | runs |
| `map_write_report` | Write map-pricing.csv and .html (by seller, every listing below MAP) into out_dir (default fairshop-out/map). | runs |
| `map_draft_map_notice` | Write drafts/map_notice-<seller>.md listing the SKUs one reseller advertised below MAP. | asks first (Auto can be opted in) |
| `map_request_send` | After one named human click (even in Auto), record that the reviewed map notice draft is approved in map_notice-requests.csv. | one named click, even in Auto (`binding_send`) |
| `own_price_update` | Fairshop MAP Pricing never changes your prices. | refused |
| `reseller_account_suspend` | Fairshop MAP Pricing never suspends or cuts off a reseller. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Advertised prices (`prices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` | date | Date, Seen On, Checked, Captured At | Datum, Date, 日付, 日期 |
| `seller` (required) | text | Seller, Reseller, Merchant, Store Name | Händler, Commerçant, 支払先, 商户 |
| `channel` | text | Channel, Marketplace, Site | Kanal, Canal, チャネル, 渠道 |
| `sku` (required) | text | SKU, Item SKU, MPN, Model | Artikelnummer, Référence, 品番, 物料编码 |
| `advertised_price` (required) | amount | Advertised Price, Price, Listed Price | Preis, Prix, 価格, 价格 |
| `is_own` | yes/no | Own, Is Own, Our Listing | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-map-pricing inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-map-pricing demo
npx -y fairshop-map-pricing mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-map-pricing": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-map-pricing",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-map-pricing -- npx -y fairshop-map-pricing mcp --root .`, or install the `fairshop-map-pricing` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-map-pricing approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-map-pricing approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-map-pricing kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-map-pricing tools                 # every tool, its policy and arguments
fairshop-map-pricing sources               # the columns each input is read from
fairshop-map-pricing inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-map-pricing call map_audit '{"prices":"<prices>","policy":"<policy>"}'
fairshop-map-pricing eval                  # the private eval cases on the fictional fixtures
fairshop-map-pricing demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Prices are as seen on the dates in your file; listings change.
- Not legal advice. It never changes a price, never suspends a reseller; a person sends any notice.
