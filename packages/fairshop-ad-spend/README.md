# Fairshop Ad Spend (`fairshop-ad-spend`)

> Read ad platform exports against your orders and stock: campaigns under your target return, spend with no sales, campaigns over budget, ads for out-of-stock SKUs, and platforms crediting more sales than the SKU sold. Never pauses a campaign or changes a budget.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it ad rows from Amazon Ads, Google Ads, Meta or your own CSV, and optionally your order lines, stock and settings (target return per platform, monthly budgets per campaign).

- **return under target** (attributed sales ÷ spend; default target 3);
- **spend with no sales** from `min_spend_no_sales` (default 50);
- **over budget** in a month;
- **ads for out-of-stock SKUs**;
- **attribution above actual sales**: the platforms together credit ads with more of a SKU's sales than your orders show.

<!-- generated:start -->

## A demo run

`npx -y fairshop-ad-spend demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Ad Spend demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  5 campaign(s), 1560 spent for 5200 attributed (return 3.33): 2 to fix (210 on no sales or out-of-stock SKUs), 3 to review, 1 fine.
    Amazon Ads|Lamp exact          spend    350 attributed    1500  4.29 ok
    Amazon Ads|Mug auto            spend    700 attributed    2600  3.71 review
    Google Ads|Shopping lamps      spend    300 attributed     700  2.33 review
    Google Ads|Vase brand          spend     90 attributed     400  4.44 fix
    Meta Ads|Rug prospecting       spend    120 attributed       0     0 fix
    SKU:LAMP-1                     spend      0 attributed    2200     - review

▶ Write the worklist
  status: executed  decision: allow
  Report written: 5 campaign(s), 1560 spent for 5200 attributed (return 3.33): 2 to fix (210 on no sales or out-of-stock SKUs), 3 to review, 1 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  campaign review campaigns drafted for 210 with 2 open marker(s) ([TO CONFIRM the person who runs ads], [CHECK keep / cut / pause]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries campaign_pause itself
  status: blocked  decision: block
  reason: Fairshop Ad Spend never pauses, starts or edits a campaign.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `ads_audit` | Sum spend and attributed sales per campaign, compare the return with your target and budget, and check advertised SKUs against stock and actual sales. | runs |
| `ads_explain` | Show one campaign (or SKU) with spend, attributed sales, return and findings. | runs |
| `ads_write_report` | Write ad-spend.csv and .html (by campaign, every campaign or SKU to look at) into out_dir (default fairshop-out/ads). | runs |
| `ads_draft_campaign_review` | Write drafts/campaign_review-campaigns.md: every campaign or SKU to look at, with a blank decision. | asks first (Auto can be opted in) |
| `ads_request_approve` | After one named human click (even in Auto), record that the reviewed campaign review draft is approved in campaign_review-requests.csv. | one named click, even in Auto (`go_live`) |
| `campaign_pause` | Fairshop Ad Spend never pauses, starts or edits a campaign. | refused |
| `budget_increase` | Fairshop Ad Spend never changes a budget or a bid. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Ad platform rows (`ads`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` | date | Date, Day, Start Date | Datum, Date, 日付, 日期 |
| `platform` (required) | text | Platform, Channel, Network | Kanal, Canal, チャネル, 渠道 |
| `campaign` (required) | text | Campaign, Campaign Name | Kampagne, Campagne, キャンペーン, 广告活动 |
| `sku` | text | SKU, Advertised SKU, Product | Artikelnummer, Référence, 品番, 物料编码 |
| `spend` (required) | amount | Spend, Cost, Amount Spent | Kosten, Dépenses, 広告費, 花费 |
| `clicks` | number | Clicks | Klicks, Clics, クリック数, 点击量 |
| `impressions` | number | Impressions, Impr. | Impressionen, Impressions, 表示回数, 展现量 |
| `attributed_sales` | amount | Attributed Sales, Sales, Conversion Value, Conv. value | Zugeordneter Umsatz, Ventes attribuées, 広告経由売上, 归因销售额 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Ads | Sponsored Products campaign report | Campaign Name, Impressions, Clicks, Spend, 7 Day Total Sales or 14 Day Total Sales | no |
| Google Ads | Campaigns report (CSV) | Campaign, Impr. or Impressions, Clicks, Cost, Conv. value or All conv. value | no |
| Meta Ads Manager | Campaigns export (CSV) | Campaign name, Amount spent (USD) or Amount spent, Purchases conversion value or Website purchases conversion value | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Order lines (`sales`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `date` | date | Date, Order Date | Datum, Date, 日付, 日期 |
| `sku` (required) | text | SKU, Lineitem sku | Artikelnummer, Référence, 品番, 物料编码 |
| `revenue` (required) | amount | Revenue, Net Sales, Line Total | Brutto, Brut, 総額, 总额 |

### Stock (`stock`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `sku` (required) | text | SKU, Item SKU | Artikelnummer, Référence, 品番, 物料编码 |
| `available` (required) | number | Available, On Hand, Quantity | Bestand, Stock, 在庫数, 库存数量 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-ad-spend inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-ad-spend demo
npx -y fairshop-ad-spend mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-ad-spend": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-ad-spend",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-ad-spend -- npx -y fairshop-ad-spend mcp --root .`, or install the `fairshop-ad-spend` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-ad-spend approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-ad-spend approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-ad-spend kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-ad-spend tools                 # every tool, its policy and arguments
fairshop-ad-spend sources               # the columns each input is read from
fairshop-ad-spend inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-ad-spend call ads_audit '{"ads":"<ads>"}'
fairshop-ad-spend eval                  # the private eval cases on the fictional fixtures
fairshop-ad-spend demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Attributed sales are each platform's own claim, with its own window. Read them as claims.
- It never pauses, edits or funds a campaign.
