# Fairshop Nexus Thresholds (`fairshop-nexus-thresholds`)

> Track sales and order counts by state against the economic nexus thresholds you confirm: states where your threshold was met and you are not registered (with the date), states approaching, and states with sales but no threshold set. Never registers or files. Not tax advice.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it two calendar years of orders (date, ship-to state, channel, amount) and a settings file you write with your adviser: per state, a sales threshold and/or an order-count threshold, whether either or both must be met, the measuring period (`current_year`, `previous_or_current_year` or `rolling_12`) and whether marketplace sales count; plus the states where you are registered.

For each state it adds up sales and orders over that period and reports:

- **over and not registered**, with the order on which your threshold was met;
- **approaching**: at `warn_pct` (default 80%) of a threshold;
- **no threshold set**: sales into a state your settings do not cover;
- registered and under.

Cancelled and voided orders do not count.

<!-- generated:start -->

## A demo run

`npx -y fairshop-nexus-thresholds demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Nexus Thresholds demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 state(s): 1 over your threshold and not registered, 1 approaching, 1 with sales but no threshold set, 1 registered, 2 under.
    CA approaching             410000     82% 
    CO under                    40000     40% 
    FL no_threshold             15000      -% 
    NY under                    20000      4% 
    TX registered              520000    104% 2026-07-10
    WA over_not_registered     110000    110% 2026-06-15

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 state(s): 1 over your threshold and not registered, 1 approaching, 1 with sales but no threshold set, 1 registered, 2 under.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  adviser memo states drafted with 2 open marker(s) ([TO CONFIRM your tax adviser], [CHECK every threshold in our settings with the adviser; this memo is not tax advice]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries state_registration_submit itself
  status: blocked  decision: block
  reason: Fairshop Nexus Thresholds never registers with a state.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `nexus_audit` | Add up sales and orders per state over each state's measuring period in your settings and compare them with your thresholds. | runs |
| `nexus_explain` | Show one state's sales, orders, threshold, period and date met. | runs |
| `nexus_write_report` | Write nexus-thresholds.csv and .html (every state with its sales, orders, threshold and status) into out_dir (default fairshop-out/nexus). | runs |
| `nexus_draft_adviser_memo` | Write drafts/adviser_memo-states.md listing the states over, approaching or with no threshold set, for your tax adviser. | asks first (Auto can be opted in) |
| `nexus_request_send` | After one named human click (even in Auto), record that the reviewed adviser memo draft is approved in adviser_memo-requests.csv. | one named click, even in Auto (`binding_send`) |
| `state_registration_submit` | Fairshop Nexus Thresholds never registers with a state. | refused |
| `tax_return_file` | Fairshop Nexus Thresholds never files anything with a tax authority. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Orders by state (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` (required) | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `ship_state` (required) | text | Ship State, Shipping Province, State, ship-state | Bundesland, Région, 都道府県, 省份 |
| `channel` | text | Channel, Source, Marketplace | Kanal, Canal, チャネル, 渠道 |
| `amount` (required) | amount | Amount, Total, Gross Sales, Subtotal | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Financial Status | Status, Statut, ステータス, 状态 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-nexus-thresholds inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-nexus-thresholds demo
npx -y fairshop-nexus-thresholds mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-nexus-thresholds": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-nexus-thresholds",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-nexus-thresholds -- npx -y fairshop-nexus-thresholds mcp --root .`, or install the `fairshop-nexus-thresholds` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-nexus-thresholds approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-nexus-thresholds approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-nexus-thresholds kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-nexus-thresholds tools                 # every tool, its policy and arguments
fairshop-nexus-thresholds sources               # the columns each input is read from
fairshop-nexus-thresholds inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-nexus-thresholds call nexus_audit '{"orders":"<orders>","settings":"<settings>"}'
fairshop-nexus-thresholds eval                  # the private eval cases on the fictional fixtures
fairshop-nexus-thresholds demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Every threshold and period is your setting; the agent does not know any state's current rules. Confirm them with your adviser.
- Not tax advice. Registration is your decision; the agent never registers or files.
