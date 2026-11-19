# Fairshop Gift Cards (`fairshop-gift-cards`)

> Work out gift card and store credit liability from your card and activity exports, by age, and find the cards to look at: balances that do not match their activity, cards spent past their value, large manual issues, use before issue, and dormant cards. Never changes a card.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the gift card (or store credit) export and the card activity. Every balance is rebuilt from the issue value, loads, adjustments and redemptions, and compared with the balance the export reports:

- **balance mismatch** and **overdrawn** cards;
- **manual issue with no order** above `manual_review_over` (default 100);
- **used before its issue date**;
- **dormant**: a balance and no activity for `dormancy_days` (default 365). What applies to dormant balances depends on where you sell and is a question for your adviser.

The liability is the sum of positive balances, by age from issue (default buckets 90, 180, 365 days). Promotional cards are left out unless `promo_is_liability` is true. The draft entry books the difference between that liability and your ledger balance.

<!-- generated:start -->

## A demo run

`npx -y fairshop-gift-cards demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Gift Cards demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  7 card(s), liability 460: 3 to review, 1 dormant, 3 fine; promotional balances of 20 left out.
    GC-1001  sale    issued      50 balance      20 ok
    GC-1002  sale    issued     100 balance     100 ok
    GC-1003  sale    issued      75 balance      75 dormant
    GC-1004  manual  issued     250 balance     250 review
    GC-1005  sale    issued      40 balance      15 review
    GC-1006  sale    issued      30 balance      -5 review
    GC-1007  promo   issued      20 balance      20 ok

▶ Write the worklist
  status: executed  decision: allow
  Report written: 7 card(s), liability 460: 3 to review, 1 dormant, 3 fine; promotional balances of 20 left out.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  liability entry 2026-11-16 drafted for 60 with 1 open marker(s) ([CHECK the cards under review before booking]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: go_live stays one-click, even in Auto

▶ The agent tries gift_card_adjust itself
  status: blocked  decision: block
  reason: Fairshop Gift Cards never changes a card balance.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `giftcards_liability` | Rebuild every card balance from its issue and activity, compare it with the reported balance, and total the liability by age. | runs |
| `giftcards_explain` | Show one card: issued, redeemed, balance and findings. | runs |
| `giftcards_write_report` | Write gift-cards.csv and .html (liability by age, every card to review or dormant) into out_dir (default fairshop-out/giftcards). | runs |
| `giftcards_draft_liability_entry` | Write drafts/liability_entry-<date>.md: the liability from the card files, the ledger balance you give and the adjusting entry. | asks first (Auto can be opted in) |
| `giftcards_request_post` | After one named human click (even in Auto), record that the reviewed liability entry draft is approved in liability_entry-requests.csv. | one named click, even in Auto (`go_live`) |
| `gift_card_adjust` | Fairshop Gift Cards never changes a card balance. | refused |
| `gift_card_deactivate` | Fairshop Gift Cards never disables or expires a card. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Gift cards and store credit (`cards`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `card_id` (required) | text | Card, Card ID, Gift Card, Last Characters, Code Ending | Kennung, Identifiant, 番号, 编号 |
| `issued_date` | date | Issued, Issued Date, Created at, Date | Datum, Date, 日付, 日期 |
| `issued_amount` | amount | Initial Value, Issued Amount, Amount, Value | Ausgegeben, Émis, 発行額, 发放金额 |
| `source` | text | Source, Issued By, Reason, Type | - |
| `order_id` | text | Order, Order ID, Order Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `customer_email` | text | Customer Email, Email, Recipient Email | E-Mail, E-mail, メールアドレス, 邮箱 |
| `balance` | amount | Balance, Current Balance, Remaining | Saldo, Solde, 残高, 余额 |

### Card activity (`activity`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `card_id` (required) | text | Card, Card ID, Gift Card | Kennung, Identifiant, 番号, 编号 |
| `date` | date | Date, Created at, Used At | Datum, Date, 日付, 日期 |
| `type` | text | Type, Kind, Transaction Type | Typ, Type, 種類, 类型 |
| `amount` (required) | amount | Amount, Value | Betrag, Montant, 金額, 金额 |
| `order_id` | text | Order, Order ID | Bestellnummer, N° de commande, 注文番号, 订单号 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-gift-cards inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-gift-cards demo
npx -y fairshop-gift-cards mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-gift-cards": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-gift-cards",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-gift-cards -- npx -y fairshop-gift-cards mcp --root .`, or install the `fairshop-gift-cards` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-gift-cards approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-gift-cards approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-gift-cards kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-gift-cards tools                 # every tool, its policy and arguments
fairshop-gift-cards sources               # the columns each input is read from
fairshop-gift-cards inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-gift-cards call giftcards_liability '{"cards":"<cards>","activity":"<activity>"}'
fairshop-gift-cards eval                  # the private eval cases on the fictional fixtures
fairshop-gift-cards demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- It reads your exports only. It never changes, expires or disables a card. Not accounting or legal advice.
