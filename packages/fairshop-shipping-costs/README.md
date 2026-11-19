# Fairshop Shipping Costs (`fairshop-shipping-costs`)

> Compare what each order charged for shipping with the labels bought for it: labels costing more than was charged, free shipping under your threshold, two labels on one order, voided labels not refunded, and labels with no order. Never buys or voids a label.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it your orders (shipping charged, subtotal) and the labels you bought (ShipStation, Shippo, Pirate Ship or your own CSV), and optionally your free-shipping threshold.

- **label above what was charged** by more than `loss_tolerance` (default 1.00);
- **free shipping under your threshold**;
- **two live labels on one order** (claim the extra if it never shipped);
- **voided label not refunded** after `void_refund_days` (default 30);
- **label with no order**.

<!-- generated:start -->

## A demo run

`npx -y fairshop-shipping-costs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairshop Shipping Costs demo (fictional data, as of 2026-11-16), Auto mode on for drafts

▶ Check the files
  status: executed  decision: allow
  6 order(s): 24.47 charged for shipping against 55.2 in labels; 2 to claim (11.1), 3 to review, 3 fine.
    LABEL:1ZEX0009    charged     0 labels      8 review label_no_order
    LABEL:9400EX0007  charged     0 labels      5 claim  void_not_refunded
    1001              charged  5.99 labels    6.2 ok     
    1002              charged     0 labels    9.1 ok     
    1003              charged     0 labels    7.5 review free_below_threshold
    1004              charged  7.99 labels   15.4 review label_over_charged
    1005              charged  5.99 labels   12.2 claim  duplicate_label, label_over_charged
    1006              charged   4.5 labels    4.8 ok     

▶ Write the worklist
  status: executed  decision: allow
  Report written: 6 order(s): 24.47 charged for shipping against 55.2 in labels; 2 to claim (11.1), 3 to review, 3 fine.

▶ Write a draft (Auto)
  status: executed  decision: allow  (auto)
  label refund request Example Ship (fictional) drafted for 11.1 with 2 open marker(s) ([TO CONFIRM Example Ship (fictional) support], [CHECK that the duplicate labels were not used before asking]). Nothing was sent.

▶ Approve it: one named click, even in Auto
  status: needs_approval  decision: ask
  reason: binding_send stays one-click, even in Auto

▶ The agent tries label_purchase itself
  status: blocked  decision: block
  reason: Fairshop Shipping Costs never buys or voids a label.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `shipping_audit` | For every order: shipping charged against the labels bought, duplicate labels and free shipping under your threshold; for every label: voided and not refunded, or with no order. | runs |
| `shipping_explain` | Show one order (or label) with charges, labels and findings. | runs |
| `shipping_write_report` | Write shipping-costs.csv and .html (by channel, every order or label to look at) into out_dir (default fairshop-out/shipping). | runs |
| `shipping_draft_label_refund_request` | Write drafts/label_refund_request-<platform>.md listing duplicate labels and voided labels not refunded. | asks first (Auto can be opted in) |
| `shipping_request_send` | After one named human click (even in Auto), record that the reviewed label refund request draft is approved in label_refund_request-requests.csv. | one named click, even in Auto (`binding_send`) |
| `label_purchase` | Fairshop Shipping Costs never buys or voids a label. | refused |
| `shipping_rule_update` | Fairshop Shipping Costs never changes shipping rates or rules in a store. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark; weights, distances and dimensions are converted when the column says it holds kilograms, kilometres or centimetres. Every result lists under `sources` how each file was read.

### Orders (`orders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` (required) | text | Order, Order ID, Order Number, Name | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `order_date` | date | Order Date, Created at, Date | Bestelldatum, Date de commande, 注文日, 下单日期 |
| `channel` | text | Channel, Source, Marketplace | Kanal, Canal, チャネル, 渠道 |
| `shipping_charged` (required) | amount | Shipping Charged, Shipping, Shipping Paid | Versandkosten berechnet, Frais de port facturés, 送料, 运费 |
| `subtotal` | amount | Subtotal, Items Total | Betrag, Montant, 金額, 金额 |
| `ship_method` | text | Shipping Method, Ship Method, Requested Service | Service, Service, サービス, 服务 |

### Shipping labels (`labels`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `order_id` | text | Order, Order ID, Order Number | Bestellnummer, N° de commande, 注文番号, 订单号 |
| `label_date` | date | Label Date, Ship Date, Created | Versanddatum, Date d'expédition, 出荷日, 发货日期 |
| `carrier` | text | Carrier, Provider | Spediteur, Transporteur, 運送会社, 承运商 |
| `service` | text | Service, Service Level | Service, Service, サービス, 服务 |
| `label_cost` (required) | amount | Label Cost, Shipping Cost, Postage, Rate Amount | Etikettenkosten, Coût de l’étiquette, ラベル費用, 面单费用 |
| `tracking` (required) | text | Tracking, Tracking Number | Sendungsnummer, Numéro de suivi, 追跡番号, 运单号 |
| `voided` | yes/no | Voided, Void | - |
| `refund_status` | text | Refund Status, Void Status | Status, Statut, ステータス, 状态 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| ShipStation | Shipments > Export (CSV) | Order Number, Tracking Number, Shipping Cost or Shipment Cost or Label Cost | no |
| Shippo | Transactions export (CSV) | Object ID, Tracking Number, Rate Amount, Order Number | no |

Where a layout says "checked", its column names were compared with the vendor's documentation on that date. The other layouts were written from knowledge of the export and were not checked. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file. [`fixtures/intl/`](fixtures/intl) has both versions of the demo data, and the eval cases `intl-de-*` and `intl-ja-*` require the same results as the English case. A weight, distance or dimension column found by its translated name with no unit in it is read as metric and converted, and the result says so. Columns named differently? Run `npx fairshop-shipping-costs inspect <file>` (names and shapes only, never values) and name them in `fairshop-sources.json`:

```json
{ "files": { "exports/bills.csv": { "columns": { "invoice_number": "Beleg" }, "date_order": "dmy", "units": { "weight": "kg" } } } }
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairshop-shipping-costs demo
npx -y fairshop-shipping-costs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairshop-shipping-costs": {
      "command": "npx",
      "args": [
        "-y",
        "fairshop-shipping-costs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairshop-shipping-costs -- npx -y fairshop-shipping-costs mcp --root .`, or install the `fairshop-shipping-costs` plugin from this repository's marketplace.

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairshop-shipping-costs approve <id> --as "Your Name"` (or on the local approvals page, `fairshop-shipping-costs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairshop-shipping-costs kill`). Paying, sending, posting to a ledger or a live system and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairshop-shipping-costs tools                 # every tool, its policy and arguments
fairshop-shipping-costs sources               # the columns each input is read from
fairshop-shipping-costs inspect <file>        # how a file would be read (names and shapes, never values)
fairshop-shipping-costs call shipping_audit '{"orders":"<orders>","labels":"<labels>"}'
fairshop-shipping-costs eval                  # the private eval cases on the fictional fixtures
fairshop-shipping-costs demo
```

## Audit log and data

Every call is written to `.fairshop/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- Carrier adjustments billed after the label are not in a label export; see `fairshop-carrier-adjustments`.
- It never buys, voids or refunds a label, and never changes your shipping rules.
