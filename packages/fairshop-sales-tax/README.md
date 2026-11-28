# Fairshop Sales Tax (`fairshop-sales-tax`)

> Compare the sales tax collected on every order with what your own confirmed settings give, by state: under- and over-collection, tax collected where you are not registered, exempt orders with no certificate, and marketplace orders. Never files or pays. Not tax advice.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your orders (ship-to state, channel, taxable subtotal, shipping, tax collected, exemption) and a settings file you confirm with your adviser: the states where you are registered with the combined rate you charge and whether shipping is taxed, the channels and states where a marketplace collects for you, and the exemption certificates you hold.

- **marketplace**: the channel collects in that state per your settings; left out of your figures;
- **under-collected** and **over-collected** against your rate and shipping rule;
- **collected where not registered**;
- **exempt with no certificate**.

Totals by state feed a worksheet for the person who prepares the return.

<!-- generated:start -->

## A demo run

`npx -y fairshop-sales-tax demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Sales Tax demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  10 order(s): 2 under-collected (5.78), 3 to review, 2 as your settings give, 2 collected by a marketplace, 1 in states where you are not registered.
    T5   Shopify  CA      0      - outside
    T6   Shopify  NY      5      - review
    T1   Shopify  TX   16.5   16.5 ok
    T10  Shopify  TX      0      0 review
    T2   Shopify  TX   8.25    9.9 short
    T3   Shopify  TX      0   4.13 short
    T7   Amazon   TX   7.43      - marketplace
    T8   Etsy     TX      0      - marketplace
    T9   Shopify  TX      0      0 ok
    T4   Shopify  WA    9.5      9 review

▶ Write the worklist
  status: executed  decision: allow
  Report written: 10 order(s): 2 under-collected (5.78), 3 to review, 2 as your settings give, 2 collected by a marketplace, 1 in states where you are not registered.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  filing worksheet TX drafted for 24.75 with 2 open marker(s) ([TO CONFIRM the person who prepares the return], [CHECK local rates, exemptions and the period with your preparer. This worksheet is not a return and not tax advice.]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries tax_return_file itself
  status: blocked  decision: block
  reason: Fairshop Sales Tax never files a return.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `salestax_audit` | For every order: marketplace-collected or not, registered or not, and the tax your settings give against the tax collected. | runs |
| `salestax_explain` | Show one order: state, channel, tax collected, tax your settings give and why it was flagged. | runs |
| `salestax_write_report` | Write sales-tax.csv and .html (by state, every order to look at) into out_dir (default fairshop-out/salestax). | runs |
| `salestax_draft_filing_worksheet` | Write drafts/filing_worksheet-<state>.md: direct and marketplace sales, tax collected, tax your settings give, and the orders to look at, for one state. | asks first (Auto can be opted in) |
| `salestax_request_file` | After one named human click (even in Auto), record that the reviewed filing worksheet draft is approved in filing_worksheet-requests.csv. | one named click, even in Auto (`binding_send`) |
| `tax_return_file` | Fairshop Sales Tax never files a return. | refused |
| `tax_payment_send` | Fairshop Sales Tax never pays a tax authority. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Orders with tax (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `channel` | text | Channel, Source, Marketplace, Sales Channel | Kanal, Canal, チャネル, 渠道 |
| `ship_state` (required) | text | Ship State, Shipping Province, Shipping State, State, Ship To State, ship-state | Bundesland, Région, 都道府県, 省份 |
| `subtotal` (required) | amount | Subtotal, Taxable Amount, Item Total, Net Sales | Betrag, Montant, 金額, 金额 |
| `shipping` | amount | Shipping, Shipping Charged, Shipping Amount | Versandkosten berechnet, Frais de port facturés, 送料, 运费 |
| `tax_collected` (required) | amount | Tax, Taxes, Tax Collected, Sales Tax | Erhobene Steuer, Taxe perçue, 徴収税額, 已收税额 |
| `exempt` | yes/no | Exempt, Tax Exempt | - |
| `exemption_id` | text | Exemption ID, Exemption Certificate, Certificate | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-sales-tax inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-sales-tax demo
npx -y fairshop-sales-tax mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-sales-tax": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-sales-tax",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-sales-tax -- npx -y fairshop-sales-tax mcp --root .`, or install the `fairshop-sales-tax` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-sales-tax approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-sales-tax approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-sales-tax kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-sales-tax tools                 # every tool, its policy and arguments
fairshop-sales-tax sources               # the columns each input is read from
fairshop-sales-tax inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-sales-tax call salestax_audit '{"orders":"<orders>","settings":"<settings>"}'
fairshop-sales-tax eval                  # the private eval cases on the fictional fixtures
fairshop-sales-tax demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Everything about rates and rules comes from your settings; the agent does not know any state's current rules and uses one combined rate per state (no local rates).
- Not tax advice. It never files a return or pays a tax authority.
