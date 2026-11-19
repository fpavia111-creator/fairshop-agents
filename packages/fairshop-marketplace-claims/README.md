# Fairshop Marketplace Claims (`fairshop-marketplace-claims`)

> Line up Amazon A-to-z, eBay, Walmart and Etsy claims with your shipment and delivery records: what your tracking can defend, what still needs a signature or photos, what is likely a refund, and what is due when. Never submits a response or refunds; a response is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key. Card chargebacks are a different process; see `soteria-of-refunds` in the Fairbooks family.

## What it checks

Give it the claims or cases export and your shipments (order, carrier, tracking, ship and delivery dates, signature). For each open claim:

- **respond-by date**: from the export, or opened date plus your `respond_days` per channel; claims past it are **overdue**, claims due today or tomorrow are listed first;
- **not received**: delivered before the claim was opened is `defend`; no tracking, or no delivery scan before the claim, is `refund_likely`; delivered without a signature on an order at or over your `signature_over` amount is `weak`;
- **not as described, damaged, wrong item**: `gather_evidence`, with the listing, messages and photos still needed.

Buyer names and e-mail addresses are masked in everything the model sees; the drafts on your disk keep them.

<!-- generated:start -->

## A demo run

`npx -y fairshop-marketplace-claims demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Marketplace Claims demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 claim(s), 980 at stake: 4 to answer (2 due today or tomorrow), 1 overdue, 1 closed. Open: 1 your tracking can defend, 1 weak, 1 need photos and messages, 2 likely refunds.
    AZ-3  Amazon   2026-10-04  closed   none             15
    EB-2  eBay     2026-11-11  overdue  refund_likely    30
    AZ-2  Amazon   2026-11-16  respond  weak             820
    AZ-1  Amazon   2026-11-17  respond  defend           45
    EB-1  eBay     2026-11-18  respond  gather_evidence  60
    WM-1  Walmart  2026-11-18  respond  refund_likely    25

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 claim(s), 980 at stake: 4 to answer (2 due today or tomorrow), 1 overdue, 1 closed. Open: 1 your tracking can defend, 1 weak, 1 need photos and messages, 2 likely refunds.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  claim response AZ-1 drafted for 45 with 1 open marker(s) ([TO CONFIRM Amazon claim page for AZ-1]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries claim_response_submit itself
  status: blocked  decision: block
  reason: Fairshop Marketplace Claims never submits a response on a marketplace; a person does.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `claims_audit` | For every claim, work out the respond-by date, what your shipment records prove, what is still needed, and whether it looks defensible. | runs |
| `claims_explain` | Show one claim with its deadline, delivery evidence and what is still needed. | runs |
| `claims_write_report` | Write marketplace-claims.csv and .html (every open claim with its deadline and evidence) and claim-deadlines.ics into out_dir (default fairshop-out/claims). | runs |
| `claims_draft_claim_response` | Write drafts/claim_response-<claim>.md for one open claim: the delivery facts from your records, or what to attach. | asks first (Auto can be opted in) |
| `claims_request_send` | After one named human click (even in Auto), record that the reviewed claim response draft is approved in claim_response-requests.csv. | one named click, even in Auto (`binding_send`) |
| `claim_response_submit` | Fairshop Marketplace Claims never submits a response on a marketplace; a person does. | refused |
| `issue_refund` | Fairshop Marketplace Claims never refunds a buyer. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Marketplace claims (`claims`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `claim_id` (required) | text | Claim ID, Case ID, Case Number, Dispute ID | Schadensnummer, N° de sinistre, 事故番号, 索赔编号 |
| `channel` | text | Channel, Marketplace | Kanal, Canal, チャネル, 渠道 |
| `order_id` | text | Order ID, Order, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `opened_at` | date | Opened, Opened At, Claim Date, Date Opened, Created | Angefordert am, Date de la demande, 申請日, 申请日期 |
| `reason` | text | Reason, Claim Reason, Case Reason | Grund, Motif, 理由, 原因 |
| `amount` | amount | Amount, Claim Amount, Amount Requested | Betrag, Montant, 金額, 金额 |
| `status` | text | Status, Claim Status, Case Status | Status, Statut, ステータス, 状态 |
| `respond_by` | date | Respond By, Response Due, Due Date | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `buyer_name` | text | Buyer Name, Buyer, Customer Name | Kunde, Client, 顧客, 客户 |
| `buyer_email` | text | Buyer Email, Customer Email, Email | E-Mail, E-mail, メールアドレス, 邮箱 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Amazon Seller Central | A-to-z Guarantee claims (Performance > A-to-z Guarantee claims, exported) | Claim ID, Order ID, Claim Reason, Claim Amount | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Shipments (`shipments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order ID, Order, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `carrier` | text | Carrier, Provider | Spediteur, Transporteur, 運送会社, 承运商 |
| `tracking` | text | Tracking, Tracking Number, Tracking ID | Sendungsnummer, Numéro de suivi, 追跡番号, 运单号 |
| `ship_date` | date | Ship Date, Shipped, Shipped At | Versanddatum, Date d'expédition, 出荷日, 发货日期 |
| `delivered_date` | date | Delivered, Delivered Date, Delivery Date | Lieferdatum, Date de livraison, 配達日, 送达日期 |
| `signature` | yes/no | Signature, Signed, Signature Confirmation | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-marketplace-claims inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-marketplace-claims demo
npx -y fairshop-marketplace-claims mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-marketplace-claims": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-marketplace-claims",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-marketplace-claims -- npx -y fairshop-marketplace-claims mcp --root .`, or install the `fairshop-marketplace-claims` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-marketplace-claims approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-marketplace-claims approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-marketplace-claims kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-marketplace-claims tools                 # every tool, its policy and arguments
fairshop-marketplace-claims sources               # the columns each input is read from
fairshop-marketplace-claims inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-marketplace-claims call claims_audit '{"claims":"<claims>","shipments":"<shipments>"}'
fairshop-marketplace-claims eval                  # the private eval cases on the fictional fixtures
fairshop-marketplace-claims demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- The advice is a reading of your own records, not a prediction of the marketplace's decision.
- Check each respond-by date on the marketplace. The agent does not log in to any marketplace and never refunds.
