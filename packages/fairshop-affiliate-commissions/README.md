# Fairshop Affiliate Commissions (`fairshop-affiliate-commissions`)

> Check every affiliate commission against your orders and program terms before the next payout: refunded or cancelled orders, orders that do not exist, rates above your terms, the same order paid twice, and own-link purchases. Never approves a payout.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the network's commission statement (Impact, ShareASale, Awin style or your own CSV), your orders, and optionally your program terms (default rate and rates per affiliate). For each commission:

- **order not found**; **order refunded or cancelled** (no commission due), or partly refunded (commission on what was kept);
- **rate above your terms**, and **sale amount above the order** as the statement reports it;
- **duplicate**: an order that already earned commission (the earliest action keeps it);
- **own-link purchase**: the affiliate's e-mail placed the order (for a person to read against your terms).

Commissions still pending are "reverse"; ones the statement shows as paid are "clawback". Affiliate names and e-mails are masked in what the model sees (affiliates show as `AFF-…`); the worklist and draft files on your machine keep the real names.

<!-- generated:start -->

## A demo run

`npx -y fairshop-affiliate-commissions demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Affiliate Commissions demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  8 commission(s), 62.5 in total: 5 to reverse before payout and 1 already paid (29.5 to recover), 1 to review, 1 fine.
    AC-1  Brightside Blog    5001      10 ok       0
    AC-2  Brightside Blog    5002       8 reverse  8
    AC-3  Coupon Cove        5003       9 reverse  3
    AC-4  Coupon Cove        5001      10 reverse  10
    AC-5  Trailhead Reviews  5099     4.5 reverse  4.5
    AC-6  Lind Lifestyle     5004       5 review   0
    AC-7  Brightside Blog    5005      12 clawback 2
    AC-8  Trailhead Reviews  5006       4 reverse  2

▶ Write the worklist
  status: executed  decision: allow
  Report written: 8 commission(s), 62.5 in total: 5 to reverse before payout and 1 already paid (29.5 to recover), 1 to review, 1 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  reversal request Example Network drafted for 29.5 with 1 open marker(s) ([TO CONFIRM Example Network program support]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries affiliate_payout_approve itself
  status: blocked  decision: block
  reason: Fairshop Affiliate Commissions never approves or pays commissions.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `affiliates_audit` | Check every commission against its order and your terms; returns what to reverse before payout, what to claw back and totals by affiliate. | runs |
| `affiliates_explain` | Show one commission and why it should be adjusted. | runs |
| `affiliates_write_report` | Write affiliate-commissions.csv and .html (by affiliate, every commission to adjust) into out_dir (default fairshop-out/affiliates). | runs |
| `affiliates_draft_reversal_request` | Write drafts/reversal_request-<network>.md listing every commission to reverse or claw back, with the amount and reason. | asks first (Auto can be opted in) |
| `affiliates_request_send` | After one named human click (even in Auto), record that the reviewed reversal request draft is approved in reversal_request-requests.csv. | one named click, even in Auto (`binding_send`) |
| `affiliate_payout_approve` | Fairshop Affiliate Commissions never approves or pays commissions. | refused |
| `network_reversal_submit` | Fairshop Affiliate Commissions never submits reversals on a network; a person does. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Affiliate commissions (`commissions`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `action_id` (required) | text | Action ID, Transaction ID, Commission ID | Kennung, Identifiant, 番号, 编号 |
| `affiliate` | text | Affiliate, Partner, Publisher | Partner, Affilié, アフィリエイト, 推广者 |
| `order_id` | text | Order ID, Order, OID | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` | date | Order Date, Action Date, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `sale_amount` | amount | Sale Amount, Order Amount, Sale | Brutto, Brut, 総額, 总额 |
| `commission` (required) | amount | Commission, Payout, Amount | Provision, Commission, 報酬額, 佣金 |
| `status` | text | Status, State | Status, Statut, ステータス, 状态 |
| `affiliate_email` | text | Affiliate Email, Partner Email | E-Mail, E-mail, メールアドレス, 邮箱 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Affiliate network (generic) | Actions or transactions report (CSV) | Action Id or Transaction ID or Trans ID, Partner or Publisher or Media Partner, Payout or Commission, Sale Amount or Order Amount | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Orders (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order ID, Order, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `total` | amount | Total, Subtotal, Order Total | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Financial Status, Order Status | Status, Statut, ステータス, 状态 |
| `refunded` | amount | Refunded, Refunded Amount | Erstattet, Remboursé, 返金額, 退款金额 |
| `customer_email` | text | Customer Email, Email | E-Mail, E-mail, メールアドレス, 邮箱 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-affiliate-commissions inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-affiliate-commissions demo
npx -y fairshop-affiliate-commissions mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-affiliate-commissions": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-affiliate-commissions",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-affiliate-commissions -- npx -y fairshop-affiliate-commissions mcp --root .`, or install the `fairshop-affiliate-commissions` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-affiliate-commissions approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-affiliate-commissions approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-affiliate-commissions kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-affiliate-commissions tools                 # every tool, its policy and arguments
fairshop-affiliate-commissions sources               # the columns each input is read from
fairshop-affiliate-commissions inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-affiliate-commissions call affiliates_audit '{"commissions":"<commissions>","orders":"<orders>"}'
fairshop-affiliate-commissions eval                  # the private eval cases on the fictional fixtures
fairshop-affiliate-commissions demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The network's own terms and lock dates decide what can still be reversed.
- It never approves, pays or submits anything on a network.
