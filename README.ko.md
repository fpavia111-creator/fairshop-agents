# Fairshop: 이커머스·소매 백오피스 에이전트

> Claude가 번역했으며 원어민 검토는 아직 이루어지지 않았습니다. 내용이 다르면 영어 README가 우선합니다. 각 에이전트 설명은 영어로 남겨 두었습니다.

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · **한국어**

온라인 판매자와 계산대가 있는 매장을 위한 작은 에이전트 30개입니다. 각 에이전트는 이미 내보내고 있는 파일(Shopify, WooCommerce, BigCommerce, Amazon 셀러 센트럴, eBay, Etsy, Walmart Marketplace, Stripe, PayPal, Square, ShipStation, Shippo, 3PL 청구서)로 사용자의 컴퓨터에서 한 가지 백오피스 업무를 합니다. 각자 작업 목록(결정 칸이 빈 CSV와 HTML 페이지)을 쓰고, 보내야 할 것이 있으면 이름 있는 담당자를 기다리는 초안을 씁니다.

소프트웨어는 무료(MIT)입니다. Fair Agents는 고객의 파일로 하는 정액 설치를 제공합니다. [fair-agents.com](https://fair-agents.com)을 참고하세요.

## 어떤 에이전트도 하지 않는 일

어떤 에이전트도 환불, 청구, 지급, 가격이나 상품 등록 변경, 쿠폰 중지, 세금 신고, 주 등록, 메시지 발송, 장부 기장을 하지 않습니다. 이런 단계는 거부되거나 Auto 모드에서도 이름 있는 담당자의 클릭 한 번을 기다립니다. 모든 호출은 연결된 감사 로그에 기록됩니다.

## 고객 및 직원 데이터

고객 이름, 이메일, 전화번호, 주소와 직원 이름은 AI 모델이 보는 모든 내용에서 고정된 가명으로 바뀝니다. 디스크에 쓰는 파일에는 목록을 처리하는 사람을 위해 실제 값이 남습니다.

## 다른 나라의 파일

독일, 프랑스, 스페인, 브라질, 이탈리아, 일본, 중국, 한국 시스템의 내보내기를 공통 코어로 읽습니다(현지 열 이름, Windows-1252·Shift_JIS·GBK·EUC-KR, `1.234,56` 형식 금액, 일 또는 연도가 앞에 오는 날짜). 보고서 페이지는 `--lang de|fr|es|pt|it|ja|zh|ko`로 9개 언어로 쓸 수 있으며, 도구 결과와 CSV는 영어로 유지됩니다.

> 세율, 마켓플레이스 대리 징수 규칙, 넥서스 기준은 고문과 확인해 입력하는 설정입니다. 여기의 어떤 내용도 세무·법률·회계 조언이 아닙니다.

## 에이전트

### 정산·수수료·마켓 자금

| Agent | Package | |
|---|---|---|
| [Fairshop Payouts](packages/fairshop-payouts) | `fairshop-payouts` | Orders against payout lines by channel: never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate. |
| [Fairshop Marketplace Fees](packages/fairshop-marketplace-fees) | `fairshop-marketplace-fees` | Every marketplace fee line against the fee schedule you confirm, and fee rates that moved month to month. |
| [Fairshop FBA Reimbursements](packages/fairshop-fba-reimbursements) | `fairshop-fba-reimbursements` | Lost and damaged FBA units, refunds with no return and low reimbursements, each with a claim-by date. |
| [Fairshop FBA Storage Fees](packages/fairshop-fba-storage-fees) | `fairshop-fba-storage-fees` | Storage fees against your rates, and inventory lots about to cross into the next aged-inventory bracket. |
| [Fairshop Processor Reserves](packages/fairshop-processor-reserves) | `fairshop-processor-reserves` | Stripe, PayPal and Shopify reserves: releases overdue, holds above your terms, releases coming up. |
| [Fairshop Settlement Journals](packages/fairshop-settlement-journals) | `fairshop-settlement-journals` | One balanced journal entry per marketplace settlement from your account map, matched to the bank deposit. |
| [Fairshop Marketplace Claims](packages/fairshop-marketplace-claims) | `fairshop-marketplace-claims` | A-to-z, eBay, Walmart and Etsy claims against your tracking: respond-by dates and what your records prove. |

### 반품·환불·고객

| Agent | Package | |
|---|---|---|
| [Fairshop Refunds Returns](packages/fairshop-refunds-returns) | `fairshop-refunds-returns` | Refunds whose item never came back, returns never refunded, refunds paid twice or above the price. |
| [Fairshop Return Reasons](packages/fairshop-return-reasons) | `fairshop-return-reasons` | Why things come back, by SKU, and customers who return most of what they buy (masked). |
| [Fairshop Coupon Abuse](packages/fairshop-coupon-abuse) | `fairshop-coupon-abuse` | Discount codes used past their limit, out of date, under the minimum, or by returning shoppers. |
| [Fairshop Gift Cards](packages/fairshop-store-credit) | `fairshop-store-credit` | Gift card and store credit liability by age, and cards whose balances do not add up. |
| [Fairshop Subscriptions](packages/fairshop-subscriptions) | `fairshop-subscriptions` | Failed payments not retried, retries used up, cards about to expire, and churn by cause. |
| [Fairshop Affiliate Commissions](packages/fairshop-affiliate-commissions) | `fairshop-affiliate-commissions` | Commissions on refunded or missing orders, above your rate, paid twice, or on own-link purchases. |

### 판매세(미국)

| Agent | Package | |
|---|---|---|
| [Fairshop Sales Tax](packages/fairshop-sales-tax) | `fairshop-sales-tax` | Tax collected on each order against the rates and rules you confirm, by state, with marketplace orders apart. |
| [Fairshop Nexus Thresholds](packages/fairshop-nexus-thresholds) | `fairshop-nexus-thresholds` | Sales and orders by state against the thresholds you confirm, with the date each was met. |

### 재고·상품 등록·가격

| Agent | Package | |
|---|---|---|
| [Fairshop Inventory Listings](packages/fairshop-inventory-listings) | `fairshop-inventory-listings` | Stock by location against what each channel lists: oversell risk, missed sales and stock listed nowhere. |
| [Fairshop Stockouts](packages/fairshop-stockouts) | `fairshop-stockouts` | Days out of stock, orders taken with nothing on hand, and SKUs to reorder before they run out. |
| [Fairshop Product Data](packages/fairshop-product-data) | `fairshop-product-data` | Missing GTINs, brands, weights and images, titles over your limits and GTINs with a wrong check digit. |
| [Fairshop Duplicate Listings](packages/fairshop-duplicate-listings) | `fairshop-duplicate-listings` | The same SKU listed twice, look-alike titles, shared GTINs and listings for SKUs you do not carry. |
| [Fairshop MAP Pricing](packages/fairshop-map-pricing) | `fairshop-map-pricing` | Advertised prices against your MAP list: your own listings first, then resellers and repeat ones. |
| [Fairshop SKU Margins](packages/fairshop-sku-margins) | `fairshop-sku-margins` | Contribution margin per SKU and channel after fees, labels and unit cost. |
| [Fairshop Ad Spend](packages/fairshop-ad-spend) | `fairshop-ad-spend` | Campaigns under your target return, spend with no sales, ads on out-of-stock SKUs, and over-attribution. |

### 배송·풀필먼트·구매

| Agent | Package | |
|---|---|---|
| [Fairshop Shipping Costs](packages/fairshop-shipping-costs) | `fairshop-shipping-costs` | Shipping charged against labels bought: losses, free shipping under your threshold, duplicate and unrefunded labels. |
| [Fairshop Carrier Adjustments](packages/fairshop-carrier-adjustments) | `fairshop-carrier-adjustments` | Carrier adjustments your own label data disproves, and SKUs whose packaging data keeps causing them. |
| [Fairshop 3PL Invoices](packages/fairshop-3pl-invoices) | `fairshop-3pl-invoices` | A 3PL invoice against your rate card and your own order, receipt and pallet counts. |
| [Fairshop PO Receiving](packages/fairshop-po-receiving) | `fairshop-po-receiving` | Purchase orders, receipts and supplier invoices matched: billed not received, billed twice, price above the PO. |
| [Fairshop Landed Cost](packages/fairshop-landed-cost) | `fairshop-landed-cost` | Freight, duty and broker costs spread over each shipment's SKUs, against the cost recorded in your store. |
| [Fairshop Retailer Deductions](packages/fairshop-retailer-deductions) | `fairshop-retailer-deductions` | Retailer deductions your proof of delivery or agreements disprove, with dispute dates. |

### 오프라인 매장

| Agent | Package | |
|---|---|---|
| [Fairshop Cash Over Short](packages/fairshop-cash-over-short) | `fairshop-cash-over-short` | Register drawers over or short, and deposits missing or different from the counted cash. |
| [Fairshop Store Shrink](packages/fairshop-store-shrink) | `fairshop-store-shrink` | Shrink by store and category against sales, unexplained losses and SKUs written off again and again. |

## 사용해 보기

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/exports
npx -y fairshop-payouts call payouts_audit '{"orders":"orders.csv","payouts":"payouts.csv"}' --lang de
```

## 검증 방법

모든 검증과 수치는 [docs/](docs/)(영어)에 있습니다. 이 저장소의 데이터는 모두 가상입니다.

## 라이선스

MIT. Fair Agents 개발.
