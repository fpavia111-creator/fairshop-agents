# Fairshop Cash Over Short (`fairshop-cash-over-short`)

> Check register closeouts and bank deposits for physical stores: drawers over or short beyond your tolerance, deposits missing or different from the counted cash, and cashiers with repeated shortages, with names masked. Never touches pay or moves money.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it register closeouts (Square cash drawers, Shopify POS cash sessions or your own CSV: date, store, register, cashier, expected and counted cash, float) and the bank deposits.

- **over or short** beyond `tolerance` (default 2.00);
- **deposit missing**: no deposit of counted cash less float within `deposit_days` (default 2) for that store; **deposit different**: the nearest deposit differs (exact matches are taken first);
- **repeated shortages**: one cashier short `repeat_min` times (default 3).

Cashier names are masked in what the model sees; the report on your disk keeps them for the manager.

<!-- generated:start -->

## A demo run

`npx -y fairshop-cash-over-short demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Cash Over Short demo (fictional data), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 closeout(s): 23.5 short and 0 over beyond tolerance, 194.5 missing from deposits; 2 deposit(s) to chase, 3 to review, 2 fine.
    CASHIER-00               over/short  -23.5 deposit       0 /       - review
    2026-11-01|Downtown|R1   over/short      0 deposit   612.4 /   612.4 ok
    2026-11-01|Downtown|R2   over/short    -10 deposit     245 /     245 review
    2026-11-02|Downtown|R2   over/short   -5.5 deposit   184.5 /       - chase
    2026-11-02|Uptown|R1     over/short      1 deposit     461 /     451 chase
    2026-11-03|Downtown|R2   over/short     -8 deposit     212 /     212 review
    2026-11-03|Uptown|R1     over/short      0 deposit     350 /     350 ok

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 closeout(s): 23.5 short and 0 over beyond tolerance, 194.5 missing from deposits; 2 deposit(s) to chase, 3 to review, 2 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  cash review Downtown drafted for 194.5 with 3 open marker(s) ([TO CONFIRM store manager], [TO CONFIRM your name], [CHECK manager note]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries payroll_deduction itself
  status: blocked  decision: block
  reason: Fairshop Cash Over Short never deducts anything from anyone's pay.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `cash_audit` | For every closeout: counted against expected cash, and the deposit (counted less float) against the bank; cashiers with repeated shortages. | runs |
| `cash_explain` | Show the closeouts of one store with over/short and deposits. | runs |
| `cash_write_report` | Write cash-over-short.csv and .html (by store, by register, every drawer or deposit to look at) into out_dir (default fairshop-out/cash). | runs |
| `cash_draft_cash_review` | Write drafts/cash_review-<store>.md: every drawer and deposit to look at, with a blank note for the manager. | asks first (Auto can be opted in) |
| `cash_request_send` | After one named human click (even in Auto), record that the reviewed cash review draft is approved in cash_review-requests.csv. | one named click, even in Auto (`binding_send`) |
| `payroll_deduction` | Fairshop Cash Over Short never deducts anything from anyone's pay. | refused |
| `employee_access_revoke` | Fairshop Cash Over Short never changes a staff member's access or records. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Register closeouts (`closeouts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Business Date, Closed At | Datum, Date, 日付, 日期 |
| `store` (required) | text | Store, Location, Site | Filiale, Magasin, 店舗, 门店 |
| `register` | text | Register, Drawer, Terminal | Kasse, Caisse, レジ, 收银台 |
| `cashier` | text | Cashier, Employee, Closed By | Mitarbeiter, Employé, 社員名, 员工 |
| `expected_cash` (required) | amount | Expected Cash, Expected, Expected In Drawer | Soll-Bargeld, Espèces attendues, 理論在高, 应有现金 |
| `counted_cash` (required) | amount | Counted Cash, Counted, Actual Cash | Gezähltes Bargeld, Espèces comptées, 実在高, 实点现金 |
| `float` | amount | Float, Starting Cash, Opening Float | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Square | Cash drawer report (CSV) | Drawer, Starting Cash or Starting Cash Amount, Expected Cash or Expected In Drawer, Actual Cash or Actual In Drawer | no |
| Shopify POS | Cash tracking sessions export (CSV) | Session, Location, Expected cash, Counted cash | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Bank deposits (`deposits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Deposit Date, Posted Date | Datum, Date, 日付, 日期 |
| `store` | text | Store, Location, Account | Filiale, Magasin, 店舗, 门店 |
| `amount` (required) | amount | Amount, Deposit, Credit | Betrag, Montant, 金額, 金额 |
| `reference` | text | Reference, Memo, Slip | Referenz, Référence, 参照番号, 参考号 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-cash-over-short inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-cash-over-short demo
npx -y fairshop-cash-over-short mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-cash-over-short": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-cash-over-short",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-cash-over-short -- npx -y fairshop-cash-over-short mcp --root .`, or install the `fairshop-cash-over-short` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-cash-over-short approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-cash-over-short approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-cash-over-short kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-cash-over-short tools                 # every tool, its policy and arguments
fairshop-cash-over-short sources               # the columns each input is read from
fairshop-cash-over-short inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-cash-over-short call cash_audit '{"closeouts":"<closeouts>","deposits":"<deposits>"}'
fairshop-cash-over-short eval                  # the private eval cases on the fictional fixtures
fairshop-cash-over-short demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- A shortage is a fact about a drawer, not a finding about a person.
- It never deducts pay, changes staff access or moves money.
