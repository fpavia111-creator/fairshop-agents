# Fairshop Subscriptions (`fairshop-subscriptions`)

> Find subscriptions slipping away through failed payments: not retried, retries used up, cards about to expire, active plans with no payment, and churn split into voluntary and payment failure. Never charges a card or cancels a plan.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the subscriptions export (Recharge, Stripe Billing, Shopify subscriptions or your own CSV) and the payment attempts. For every subscription:

- **failed and not retried**: the last attempt failed and nothing was tried for `retry_gap_days` (default 3);
- **retries used up**: `max_retries` failures (default 3) since the last success, or an unpaid status;
- **billing gap**: active, but no successful payment for `grace_days` (default 35);
- **card expiring**: the card on file expires by the month of the next billing date.

It totals monthly recurring revenue and the share at risk, and splits cancellations by month into voluntary and payment failure (a cancel reason about payment, or a failed payment in the 30 days before). Customer e-mails are masked in what the model sees.

<!-- generated:start -->

## A demo run

`npx -y fairshop-subscriptions demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Subscriptions demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  7 subscription(s), MRR 140 (55 at risk): 1 failed and not retried, 1 with retries used up, 1 active with no recent payment, 1 card(s) expiring, 1 fine, 2 cancelled.
    SUB-1  Coffee monthly      30 last paid 2026-11-10 ok
    SUB-2  Coffee monthly      30 last paid 2026-10-05 chase
    SUB-3  Tea box             25 last paid 2026-10-01 at_risk
    SUB-4  Tea box             25 last paid 2026-10-20 heads_up
    SUB-5  Coffee monthly      30 last paid 2026-09-01 review
    SUB-6  Coffee monthly      30 last paid null       churned
    SUB-7  Tea box             25 last paid 2026-10-15 churned

▶ Write the worklist
  status: executed  decision: allow
  Report written: 7 subscription(s), MRR 140 (55 at risk): 1 failed and not retried, 1 with retries used up, 1 active with no recent payment, 1 card(s) expiring, 1 fine, 2 cancelled.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  payment update requests subscribers drafted for 55 with 2 open marker(s) ([TO CONFIRM each subscriber below, from your subscription app], [TO CONFIRM your customer service address]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries charge_card itself
  status: blocked  decision: block
  reason: Fairshop Subscriptions never charges or retries a card.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `subscriptions_audit` | Line up every subscription with its payment attempts: failed and not retried, retries used up, billing gaps, expiring cards, and churn by month. | runs |
| `subscriptions_explain` | Show one subscription with its last payment, failures and findings. | runs |
| `subscriptions_write_report` | Write subscriptions.csv and .html (churn by month, every subscription to act on) into out_dir (default fairshop-out/subscriptions). | runs |
| `subscriptions_draft_payment_update_requests` | Write drafts/payment_update_requests-subscribers.md: one message text and the subscriptions it goes to. | asks first (Auto can be opted in) |
| `subscriptions_request_send` | After one named human click (even in Auto), record that the reviewed payment update requests draft is approved in payment_update_requests-requests.csv. | one named click, even in Auto (`binding_send`) |
| `charge_card` | Fairshop Subscriptions never charges or retries a card. | refused |
| `subscription_cancel` | Fairshop Subscriptions never pauses, cancels or changes a subscription. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Subscriptions (`subscriptions`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `subscription_id` (required) | text | Subscription ID, Subscription, ID | Abonnement-ID, ID d’abonnement, 定期購入ID, 订阅编号 |
| `customer_email` | text | Customer Email, Email | E-Mail, E-mail, メールアドレス, 邮箱 |
| `status` (required) | text | Status, Subscription Status | Status, Statut, ステータス, 状态 |
| `plan` | text | Plan, Product, Product Title | Lizenz, Licence, ライセンス, 许可证 |
| `price` | amount | Price, Amount, Plan Amount, Recurring Price | Preis, Prix, 価格, 价格 |
| `started` | date | Started, Created, Start Date | Eintrittsdatum, Date d'entrée, 入社日, 入职日期 |
| `cancelled_at` | date | Cancelled At, Canceled At, Ended At | Austrittsdatum, Date de sortie, 退職日, 离职日期 |
| `cancel_reason` | text | Cancel Reason, Cancellation Reason | Grund, Motif, 理由, 原因 |
| `next_billing` | date | Next Billing, Next Charge, Next Payment Date, Renews | Nächste Abrechnung, Prochaine facturation, 次回請求日, 下次扣款日期 |
| `card_expiry` | text | Card Expiry, Card Expiration, Exp | Ablaufdatum, Date d'expiration, 有効期限, 到期日 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Recharge | Subscriptions export (CSV) | subscription_id, customer_email, status, next_charge_scheduled_at | no |
| Stripe Billing | Subscriptions export (CSV) | id, Customer Email, Status, Current Period End (UTC) or Current Period End | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date; where it names a sample file, the agent was run on the vendor's own published sample on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Payment attempts (`payments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `subscription_id` (required) | text | Subscription ID, Subscription | Abonnement-ID, ID d’abonnement, 定期購入ID, 订阅编号 |
| `date` (required) | date | Date, Created, Attempted At, Charge Date | Datum, Date, 日付, 日期 |
| `amount` | amount | Amount, Total | Betrag, Montant, 金額, 金额 |
| `status` (required) | text | Status, Result, Outcome | Status, Statut, ステータス, 状态 |
| `failure_reason` | text | Failure Reason, Decline Code, Error | Grund, Motif, 理由, 原因 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-subscriptions inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-subscriptions demo
npx -y fairshop-subscriptions mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-subscriptions": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-subscriptions",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-subscriptions -- npx -y fairshop-subscriptions mcp --root .`, or install the `fairshop-subscriptions` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-subscriptions approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-subscriptions approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-subscriptions kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-subscriptions tools                 # every tool, its policy and arguments
fairshop-subscriptions sources               # the columns each input is read from
fairshop-subscriptions inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-subscriptions call subscriptions_audit '{"subscriptions":"<subscriptions>","payments":"<payments>"}'
fairshop-subscriptions eval                  # the private eval cases on the fictional fixtures
fairshop-subscriptions demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Your billing app may retry on its own schedule; set the gaps to match it.
- It never charges, retries, pauses or cancels anything. A person sends the messages.
