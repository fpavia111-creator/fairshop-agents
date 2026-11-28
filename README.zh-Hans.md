# Fairshop：电商与零售后台智能体

> 本文由 Claude 翻译，尚未经母语人士审校。如有出入，以英文 README 为准。各智能体的说明保留英文。

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · **简体中文** · [한국어](README.ko.md)

为网店和有收银台的门店准备的 30 个小型智能体。每个只做一项后台工作，在您自己的电脑上，读取您已经导出的文件：Shopify、WooCommerce、BigCommerce、亚马逊卖家中心、eBay、Etsy、Walmart Marketplace、Stripe、PayPal、Square、ShipStation、Shippo 以及第三方仓储的账单。每个智能体都会写出一份工作清单（带空白决定列的 CSV 和一个 HTML 页面）；需要发送的内容则写成草稿，等待一位署名的人处理。

软件免费（MIT）。Fair Agents 提供基于您自己文件的固定价格部署服务：见 [fair-agents.com](https://fair-agents.com)。

## 任何智能体都不会做的事

没有任何智能体会退款、扣款、付款、改价或修改商品刊登、停用优惠码、申报税款、向州政府登记、发送消息或记入总账。这些步骤要么被拒绝，要么即使在 Auto 模式下也要等待一位署名人员点击一次。每次调用都写入链式审计日志。

## 客户与员工数据

客户姓名、邮箱、电话、地址以及员工姓名，在 AI 模型看到的所有内容中都被替换为固定的化名。写到您磁盘上的文件保留真实数值，供处理清单的人使用。

## 其他国家的文件

通过共享内核读取来自德国、法国、西班牙、巴西、意大利、日本、中国和韩国系统的导出：本地列名、Windows-1252、Shift_JIS、GBK 和 EUC-KR 编码、`1.234,56` 格式金额以及日或年在前的日期。报告页面可用 `--lang de|fr|es|pt|it|ja|zh|ko` 输出九种语言；工具结果和 CSV 文件保持英文。

> 税率、平台代扣代缴规则和经济关联门槛都是您与顾问确认后填写的设置。这里的任何内容都不是税务、法律或会计建议。

## 智能体列表

### 回款、费用与平台资金

| Agent | Package | |
|---|---|---|
| [Fairshop Payouts](packages/fairshop-payouts) | `fairshop-payouts` | Orders against payout lines by channel: never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate. |
| [Fairshop Marketplace Fees](packages/fairshop-marketplace-fees) | `fairshop-marketplace-fees` | Every marketplace fee line against the fee schedule you confirm, and fee rates that moved month to month. |
| [Fairshop FBA Reimbursements](packages/fairshop-fba-reimbursements) | `fairshop-fba-reimbursements` | Lost and damaged FBA units, refunds with no return and low reimbursements, each with a claim-by date. |
| [Fairshop FBA Storage Fees](packages/fairshop-fba-storage-fees) | `fairshop-fba-storage-fees` | Storage fees against your rates, and inventory lots about to cross into the next aged-inventory bracket. |
| [Fairshop Processor Reserves](packages/fairshop-processor-reserves) | `fairshop-processor-reserves` | Stripe, PayPal and Shopify reserves: releases overdue, holds above your terms, releases coming up. |
| [Fairshop Settlement Journals](packages/fairshop-settlement-journals) | `fairshop-settlement-journals` | One balanced journal entry per marketplace settlement from your account map, matched to the bank deposit. |
| [Fairshop Marketplace Claims](packages/fairshop-marketplace-claims) | `fairshop-marketplace-claims` | A-to-z, eBay, Walmart and Etsy claims against your tracking: respond-by dates and what your records prove. |

### 退货、退款与客户

| Agent | Package | |
|---|---|---|
| [Fairshop Refunds Returns](packages/fairshop-refunds-returns) | `fairshop-refunds-returns` | Refunds whose item never came back, returns never refunded, refunds paid twice or above the price. |
| [Fairshop Return Reasons](packages/fairshop-return-reasons) | `fairshop-return-reasons` | Why things come back, by SKU, and customers who return most of what they buy (masked). |
| [Fairshop Coupon Abuse](packages/fairshop-coupon-abuse) | `fairshop-coupon-abuse` | Discount codes used past their limit, out of date, under the minimum, or by returning shoppers. |
| [Fairshop Gift Cards](packages/fairshop-store-credit) | `fairshop-store-credit` | Gift card and store credit liability by age, and cards whose balances do not add up. |
| [Fairshop Subscriptions](packages/fairshop-subscriptions) | `fairshop-subscriptions` | Failed payments not retried, retries used up, cards about to expire, and churn by cause. |
| [Fairshop Affiliate Commissions](packages/fairshop-affiliate-commissions) | `fairshop-affiliate-commissions` | Commissions on refunded or missing orders, above your rate, paid twice, or on own-link purchases. |

### 销售税（美国）

| Agent | Package | |
|---|---|---|
| [Fairshop Sales Tax](packages/fairshop-sales-tax) | `fairshop-sales-tax` | Tax collected on each order against the rates and rules you confirm, by state, with marketplace orders apart. |
| [Fairshop Nexus Thresholds](packages/fairshop-nexus-thresholds) | `fairshop-nexus-thresholds` | Sales and orders by state against the thresholds you confirm, with the date each was met. |

### 库存、商品刊登与定价

| Agent | Package | |
|---|---|---|
| [Fairshop Inventory Listings](packages/fairshop-inventory-listings) | `fairshop-inventory-listings` | Stock by location against what each channel lists: oversell risk, missed sales and stock listed nowhere. |
| [Fairshop Stockouts](packages/fairshop-stockouts) | `fairshop-stockouts` | Days out of stock, orders taken with nothing on hand, and SKUs to reorder before they run out. |
| [Fairshop Product Data](packages/fairshop-product-data) | `fairshop-product-data` | Missing GTINs, brands, weights and images, titles over your limits and GTINs with a wrong check digit. |
| [Fairshop Duplicate Listings](packages/fairshop-duplicate-listings) | `fairshop-duplicate-listings` | The same SKU listed twice, look-alike titles, shared GTINs and listings for SKUs you do not carry. |
| [Fairshop MAP Pricing](packages/fairshop-map-pricing) | `fairshop-map-pricing` | Advertised prices against your MAP list: your own listings first, then resellers and repeat ones. |
| [Fairshop SKU Margins](packages/fairshop-sku-margins) | `fairshop-sku-margins` | Contribution margin per SKU and channel after fees, labels and unit cost. |
| [Fairshop Ad Spend](packages/fairshop-ad-spend) | `fairshop-ad-spend` | Campaigns under your target return, spend with no sales, ads on out-of-stock SKUs, and over-attribution. |

### 发货、履约与采购

| Agent | Package | |
|---|---|---|
| [Fairshop Shipping Costs](packages/fairshop-shipping-costs) | `fairshop-shipping-costs` | Shipping charged against labels bought: losses, free shipping under your threshold, duplicate and unrefunded labels. |
| [Fairshop Carrier Adjustments](packages/fairshop-carrier-adjustments) | `fairshop-carrier-adjustments` | Carrier adjustments your own label data disproves, and SKUs whose packaging data keeps causing them. |
| [Fairshop 3PL Invoices](packages/fairshop-3pl-invoices) | `fairshop-3pl-invoices` | A 3PL invoice against your rate card and your own order, receipt and pallet counts. |
| [Fairshop PO Receiving](packages/fairshop-po-receiving) | `fairshop-po-receiving` | Purchase orders, receipts and supplier invoices matched: billed not received, billed twice, price above the PO. |
| [Fairshop Landed Cost](packages/fairshop-landed-cost) | `fairshop-landed-cost` | Freight, duty and broker costs spread over each shipment's SKUs, against the cost recorded in your store. |
| [Fairshop Retailer Deductions](packages/fairshop-retailer-deductions) | `fairshop-retailer-deductions` | Retailer deductions your proof of delivery or agreements disprove, with dispute dates. |

### 实体门店

| Agent | Package | |
|---|---|---|
| [Fairshop Cash Over Short](packages/fairshop-cash-over-short) | `fairshop-cash-over-short` | Register drawers over or short, and deposits missing or different from the counted cash. |
| [Fairshop Store Shrink](packages/fairshop-store-shrink) | `fairshop-store-shrink` | Shrink by store and category against sales, unexplained losses and SKUs written off again and again. |

## 试用

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/exports
npx -y fairshop-payouts call payouts_audit '{"orders":"orders.csv","payouts":"payouts.csv"}' --lang de
```

## 如何检验

所有检验及其数字见 [docs/](docs/)（英文）。本仓库中的数据均为虚构。

## 许可

MIT。由 Fair Agents 开发。
