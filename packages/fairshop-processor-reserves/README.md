# Fairshop Processor Reserves (`fairshop-processor-reserves`)

> Track money that Stripe, PayPal or Shopify Payments is holding: releases overdue, holds above your terms, releases coming up and dispute holds open too long. Never moves money; an inquiry is one human click.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it a balance or activity export with reserve holds, releases, disputes and charges, and optionally the reserve terms from your processor's notice (percent and days). For every hold it finds the releases (same reference first, then later releases without one) and works out what is still held:

- **release overdue**: still held more than `grace_days` (default 3) after the release date in the export or the date your terms give;
- **hold above terms**: more than your terms' percent of that day's charges;
- **due soon**: releases inside `upcoming_days` (default 14), also written to a calendar;
- **dispute hold open long**: a dispute hold still open after `dispute_days` (default 75).

<!-- generated:start -->

## A demo run

`npx -y fairshop-processor-reserves demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Processor Reserves demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  5 hold(s), 290 still held: 1 release(s) overdue (100), 2 to review, 1 due soon, 1 held to term, 0 released.
    pp_dsp_1   PayPal  2026-06-01      60 held      60 review    2026-08-30
    pp_rsv_1   PayPal  2026-08-25      80 held      80 upcoming  2026-11-23
    rsv_1      Stripe  2026-07-01     100 held     100 chase     2026-09-29
    rsv_2      Stripe  2026-08-01     250 held       0 review    2026-10-30
    rsv_3      Stripe  2026-09-15      50 held      50 held      2026-12-14

▶ Write the worklist
  status: executed  decision: allow
  Report written: 5 hold(s), 290 still held: 1 release(s) overdue (100), 2 to review, 1 due soon, 1 held to term, 0 released.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  release inquiry Stripe drafted for 100 with 2 open marker(s) ([TO CONFIRM Stripe support or account manager], [TO CONFIRM account id]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries balance_transfer itself
  status: blocked  decision: block
  reason: Fairshop Processor Reserves never moves money between balances or to a bank.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `reserves_audit` | Match every reserve or dispute hold to its releases and work out what is still held, what is overdue, what is due soon and which holds are above your terms. | runs |
| `reserves_explain` | Show one hold: amount, released, still held, expected release and findings. | runs |
| `reserves_write_report` | Write processor-reserves.csv and .html (every hold still held or flagged, by processor) and release-dates.ics into out_dir (default fairshop-out/reserves). | runs |
| `reserves_draft_release_inquiry` | Write drafts/release_inquiry-<processor>.md listing overdue releases and long-open dispute holds of one processor. | asks first (Auto can be opted in) |
| `reserves_request_send` | After one named human click (even in Auto), record that the reviewed release inquiry draft is approved in release_inquiry-requests.csv. | one named click, even in Auto (`binding_send`) |
| `balance_transfer` | Fairshop Processor Reserves never moves money between balances or to a bank. | refused |
| `payout_schedule_change` | Fairshop Processor Reserves never changes payout or reserve settings at a processor. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Balance and activity lines (`balance`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Created, Created (UTC), Transaction Date | Datum, Date, 日付, 日期 |
| `processor` | text | Processor, Provider, Gateway, Channel | Kanal, Canal, チャネル, 渠道 |
| `type` (required) | text | Type, Transaction Type, Reporting Category, Description | Typ, Type, 種類, 类型 |
| `amount` (required) | amount | Amount, Gross, Net | Betrag, Montant, 金額, 金额 |
| `reference` | text | Reference, Reference ID, Source, Transaction ID, Hold ID | Referenz, Référence, 参照番号, 参考号 |
| `release_date` | date | Release Date, Available On, Expected Release | Freigabedatum, Date de libération, 解放日, 释放日期 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Stripe | Balance > Balance transactions export (CSV) | Available On (UTC) or Available On, Source, Fee, Net | no |
| PayPal | Activity > Download (CSV) | Gross, Fee, Net, Transaction ID | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-processor-reserves inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-processor-reserves demo
npx -y fairshop-processor-reserves mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-processor-reserves": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-processor-reserves",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-processor-reserves -- npx -y fairshop-processor-reserves mcp --root .`, or install the `fairshop-processor-reserves` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-processor-reserves approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-processor-reserves approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-processor-reserves kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-processor-reserves tools                 # every tool, its policy and arguments
fairshop-processor-reserves sources               # the columns each input is read from
fairshop-processor-reserves inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-processor-reserves call reserves_audit '{"balance":"<balance>"}'
fairshop-processor-reserves eval                  # the private eval cases on the fictional fixtures
fairshop-processor-reserves demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Terms are what you put in the terms file; the agent does not know a processor's current terms.
- It reads only your exports and does not log in to a processor. A person sends any inquiry.
