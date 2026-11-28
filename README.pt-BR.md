# Fairshop: agentes de back-office para e-commerce e varejo

> Traduzido pelo Claude; ainda não revisado por um falante nativo. Em caso de diferença, vale o README em inglês. As descrições dos agentes estão em inglês.

[English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Português (Brasil)** · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md)

30 agentes pequenos para vendedores online e lojas com caixa. Cada um faz uma tarefa de back-office, no seu computador, a partir de arquivos que você já exporta: Shopify, WooCommerce, BigCommerce, Amazon Seller Central, eBay, Etsy, Walmart Marketplace, Stripe, PayPal, Square, ShipStation, Shippo e as faturas do seu operador logístico. Cada um escreve uma lista de trabalho (CSV com uma coluna de decisão vazia e uma página HTML) e, quando algo precisa ser enviado, um rascunho que espera uma pessoa nomeada.

O software é gratuito (MIT). A Fair Agents oferece uma implantação a preço fixo nos seus próprios arquivos: veja [fair-agents.com](https://fair-agents.com).

## O que nenhum agente faz

Nenhum agente reembolsa, cobra, paga, muda preços ou anúncios, desativa cupons, entrega declarações de impostos, se registra em um estado, envia mensagens ou lança no razão. Esses passos são recusados ou esperam o clique de uma pessoa nomeada, mesmo no modo Auto. Cada chamada fica num registro de auditoria encadeado.

## Dados de clientes e funcionários

Nomes, e-mails, telefones e endereços de clientes e nomes de funcionários são trocados por pseudônimos estáveis em tudo o que o modelo de IA vê. Os arquivos gravados no seu disco mantêm os valores reais para quem trabalha as listas.

## Arquivos de outros países

Exportações de sistemas da Alemanha, França, Espanha, Brasil, Itália, Japão, China e Coreia são lidas pelo núcleo comum: nomes de coluna locais, Windows-1252, Shift_JIS, GBK e EUC-KR, valores `1.234,56` e datas com dia ou ano primeiro. As páginas de relatório existem em nove idiomas com `--lang de|fr|es|pt|it|ja|zh|ko`; resultados das ferramentas e CSV ficam em inglês.

> Alíquotas, regras de marketplaces e limites de nexus são configurações que você confirma com seu assessor. Nada aqui é assessoria fiscal, jurídica ou contábil.

## Os agentes

### Repasses, taxas e dinheiro dos marketplaces

| Agent | Package | |
|---|---|---|
| [Fairshop Payouts](packages/fairshop-payouts) | `fairshop-payouts` | Orders against payout lines by channel: never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate. |
| [Fairshop Marketplace Fees](packages/fairshop-marketplace-fees) | `fairshop-marketplace-fees` | Every marketplace fee line against the fee schedule you confirm, and fee rates that moved month to month. |
| [Fairshop FBA Reimbursements](packages/fairshop-fba-reimbursements) | `fairshop-fba-reimbursements` | Lost and damaged FBA units, refunds with no return and low reimbursements, each with a claim-by date. |
| [Fairshop FBA Storage Fees](packages/fairshop-fba-storage-fees) | `fairshop-fba-storage-fees` | Storage fees against your rates, and inventory lots about to cross into the next aged-inventory bracket. |
| [Fairshop Processor Reserves](packages/fairshop-processor-reserves) | `fairshop-processor-reserves` | Stripe, PayPal and Shopify reserves: releases overdue, holds above your terms, releases coming up. |
| [Fairshop Settlement Journals](packages/fairshop-settlement-journals) | `fairshop-settlement-journals` | One balanced journal entry per marketplace settlement from your account map, matched to the bank deposit. |
| [Fairshop Marketplace Claims](packages/fairshop-marketplace-claims) | `fairshop-marketplace-claims` | A-to-z, eBay, Walmart and Etsy claims against your tracking: respond-by dates and what your records prove. |

### Devoluções, reembolsos e clientes

| Agent | Package | |
|---|---|---|
| [Fairshop Refunds Returns](packages/fairshop-refunds-returns) | `fairshop-refunds-returns` | Refunds whose item never came back, returns never refunded, refunds paid twice or above the price. |
| [Fairshop Return Reasons](packages/fairshop-return-reasons) | `fairshop-return-reasons` | Why things come back, by SKU, and customers who return most of what they buy (masked). |
| [Fairshop Coupon Abuse](packages/fairshop-coupon-abuse) | `fairshop-coupon-abuse` | Discount codes used past their limit, out of date, under the minimum, or by returning shoppers. |
| [Fairshop Gift Cards](packages/fairshop-store-credit) | `fairshop-store-credit` | Gift card and store credit liability by age, and cards whose balances do not add up. |
| [Fairshop Subscriptions](packages/fairshop-subscriptions) | `fairshop-subscriptions` | Failed payments not retried, retries used up, cards about to expire, and churn by cause. |
| [Fairshop Affiliate Commissions](packages/fairshop-affiliate-commissions) | `fairshop-affiliate-commissions` | Commissions on refunded or missing orders, above your rate, paid twice, or on own-link purchases. |

### Imposto sobre vendas (EUA)

| Agent | Package | |
|---|---|---|
| [Fairshop Sales Tax](packages/fairshop-sales-tax) | `fairshop-sales-tax` | Tax collected on each order against the rates and rules you confirm, by state, with marketplace orders apart. |
| [Fairshop Nexus Thresholds](packages/fairshop-nexus-thresholds) | `fairshop-nexus-thresholds` | Sales and orders by state against the thresholds you confirm, with the date each was met. |

### Estoque, anúncios e preços

| Agent | Package | |
|---|---|---|
| [Fairshop Inventory Listings](packages/fairshop-inventory-listings) | `fairshop-inventory-listings` | Stock by location against what each channel lists: oversell risk, missed sales and stock listed nowhere. |
| [Fairshop Stockouts](packages/fairshop-stockouts) | `fairshop-stockouts` | Days out of stock, orders taken with nothing on hand, and SKUs to reorder before they run out. |
| [Fairshop Product Data](packages/fairshop-product-data) | `fairshop-product-data` | Missing GTINs, brands, weights and images, titles over your limits and GTINs with a wrong check digit. |
| [Fairshop Duplicate Listings](packages/fairshop-duplicate-listings) | `fairshop-duplicate-listings` | The same SKU listed twice, look-alike titles, shared GTINs and listings for SKUs you do not carry. |
| [Fairshop MAP Pricing](packages/fairshop-map-pricing) | `fairshop-map-pricing` | Advertised prices against your MAP list: your own listings first, then resellers and repeat ones. |
| [Fairshop SKU Margins](packages/fairshop-sku-margins) | `fairshop-sku-margins` | Contribution margin per SKU and channel after fees, labels and unit cost. |
| [Fairshop Ad Spend](packages/fairshop-ad-spend) | `fairshop-ad-spend` | Campaigns under your target return, spend with no sales, ads on out-of-stock SKUs, and over-attribution. |

### Envios, fulfillment e compras

| Agent | Package | |
|---|---|---|
| [Fairshop Shipping Costs](packages/fairshop-shipping-costs) | `fairshop-shipping-costs` | Shipping charged against labels bought: losses, free shipping under your threshold, duplicate and unrefunded labels. |
| [Fairshop Carrier Adjustments](packages/fairshop-carrier-adjustments) | `fairshop-carrier-adjustments` | Carrier adjustments your own label data disproves, and SKUs whose packaging data keeps causing them. |
| [Fairshop 3PL Invoices](packages/fairshop-3pl-invoices) | `fairshop-3pl-invoices` | A 3PL invoice against your rate card and your own order, receipt and pallet counts. |
| [Fairshop PO Receiving](packages/fairshop-po-receiving) | `fairshop-po-receiving` | Purchase orders, receipts and supplier invoices matched: billed not received, billed twice, price above the PO. |
| [Fairshop Landed Cost](packages/fairshop-landed-cost) | `fairshop-landed-cost` | Freight, duty and broker costs spread over each shipment's SKUs, against the cost recorded in your store. |
| [Fairshop Retailer Deductions](packages/fairshop-retailer-deductions) | `fairshop-retailer-deductions` | Retailer deductions your proof of delivery or agreements disprove, with dispute dates. |

### Lojas físicas

| Agent | Package | |
|---|---|---|
| [Fairshop Cash Over Short](packages/fairshop-cash-over-short) | `fairshop-cash-over-short` | Register drawers over or short, and deposits missing or different from the counted cash. |
| [Fairshop Store Shrink](packages/fairshop-store-shrink) | `fairshop-store-shrink` | Shrink by store and category against sales, unexplained losses and SKUs written off again and again. |

## Experimente

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/exports
npx -y fairshop-payouts call payouts_audit '{"orders":"orders.csv","payouts":"payouts.csv"}' --lang de
```

## Como é verificado

Cada verificação com seus números está em [docs/](docs/) (em inglês). Todos os dados deste repositório são fictícios.

## Licença

MIT. Desenvolvido pela Fair Agents.
