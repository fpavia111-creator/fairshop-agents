# Fairshop Settlement Journals (`fairshop-settlement-journals`)

> Turn marketplace settlements into one summarized, balanced journal entry each, from the account map you confirm, and match each one to its bank deposit. Never posts to your ledger; posting is one human click.

Part of [Fairshop](https://fair-agents.com) by Fair Agents: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it settlement lines (Amazon settlement V2, Walmart reconciliation or your own CSV), an account map from your chart of accounts (description, or "Type/Description", to account; a clearing account for the deposit) and, optionally, your bank deposits. For each settlement it:

- sums every line by account: income is credited, costs and refunds debited, the net goes to the clearing account, so the entry balances;
- puts descriptions with no account in suspense and lists them;
- finds the bank deposit by reference or by amount within `deposit_days` after the last line, and flags a missing or different deposit.

The report's CSV has one row per journal line, ready to import after review.

<!-- generated:start -->

## A demo run

`npx -y fairshop-settlement-journals demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Settlement Journals demo (fictional data, as of 2026-11-30), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  2 settlement(s), 110.29 net: 1 ready to post, 0 with descriptions to map, 1 with a deposit to chase.
    S-100  net    67.29 Dr      150 Cr      150 ready
    S-200  net       43 Dr       80 Cr       80 chase

▶ Write the worklist
  status: executed  decision: allow
  Report written: 2 settlement(s), 110.29 net: 1 ready to post, 0 with descriptions to map, 1 with a deposit to chase.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  journal entry S-100 drafted for 67.29 with 1 open marker(s) ([CHECK account numbers against your chart of accounts before posting]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries accounting_api_post itself
  status: blocked  decision: block
  reason: Fairshop Settlement Journals never posts to QuickBooks, Xero or any ledger itself.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `journals_audit` | Sum every settlement by account from your map into one balanced entry, match it to its bank deposit and list descriptions with no account. | runs |
| `journals_explain` | Show the journal lines, deposit and notes of one settlement. | runs |
| `journals_write_report` | Write settlement-journals.csv (every journal line, ready to import after review) and .html (by settlement, every line) into out_dir (default fairshop-out/journals). | runs |
| `journals_draft_journal_entry` | Write drafts/journal_entry-<settlement>.md: the entry for one settlement with debits, credits and notes. | asks first (Auto can be opted in) |
| `journals_request_post` | After one named human click (even in Auto), record that the reviewed journal entry draft is approved in journal_entry-requests.csv. | one named click, even in Auto (`go_live`) |
| `accounting_api_post` | Fairshop Settlement Journals never posts to QuickBooks, Xero or any ledger itself. | refused |
| `settlement_dispute_submit` | Fairshop Settlement Journals never contacts a marketplace. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Settlement lines (`settlement`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `settlement_id` (required) | text | Settlement ID, settlement-id, Payout ID, Statement ID | Abrechnungs-ID, ID de règlement, 精算ID, 结算编号 |
| `posted_date` | date | Posted Date, posted-date, Date, Transaction Date | Datum, Date, 日付, 日期 |
| `type` | text | Transaction Type, transaction-type, Type | Typ, Type, 種類, 类型 |
| `description` (required) | text | Description, Amount Description, amount-description, Amount Type | Beschreibung, Description, 摘要, 摘要 |
| `amount` (required) | amount | Amount, amount, Total | Betrag, Montant, 金額, 金额 |
| `order_id` | text | Order ID, order-id, Order | Bestellnummer, N° de commande, 注文番号, 订单号 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | Settlement report, flat file V2 | settlement-id, amount-type, amount-description, amount | no |
| Walmart Seller Center | Payments > Reconciliation report | Period Start Date, Transaction Type, Customer Order #, Amount Type, Amount | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Bank deposits (`deposits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Deposit Date, Posted Date | Datum, Date, 日付, 日期 |
| `amount` (required) | amount | Amount, Deposit, Credit | Betrag, Montant, 金額, 金额 |
| `reference` | text | Reference, Memo, Description | Referenz, Référence, 参照番号, 参考号 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-settlement-journals inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-settlement-journals demo
npx -y fairshop-settlement-journals mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-settlement-journals": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-settlement-journals",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-settlement-journals -- npx -y fairshop-settlement-journals mcp --root .`, or install the `fairshop-settlement-journals` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-settlement-journals approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-settlement-journals approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-settlement-journals kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-settlement-journals tools                 # every tool, its policy and arguments
fairshop-settlement-journals sources               # the columns each input is read from
fairshop-settlement-journals inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-settlement-journals call journals_audit '{"settlement":"<settlement>","map":"<map>"}'
fairshop-settlement-journals eval                  # the private eval cases on the fictional fixtures
fairshop-settlement-journals demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Accounts are yours; the agent does not choose them. Check the map against your chart of accounts.
- Tax lines are booked where your map puts them; the agent gives no tax treatment.
- It never posts to a ledger. A person posts the reviewed entry.
