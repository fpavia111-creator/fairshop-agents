# Fairshop : agents pour le back-office du e-commerce et du commerce de détail

> Traduit par Claude ; pas encore relu par un locuteur natif. En cas de différence, le README anglais fait foi. Les descriptions des agents sont en anglais.

[English](README.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md)

30 petits agents pour les vendeurs en ligne et les boutiques avec caisse. Chacun fait une tâche de back-office, sur votre ordinateur, à partir de fichiers que vous exportez déjà : Shopify, WooCommerce, BigCommerce, Amazon Seller Central, eBay, Etsy, Walmart Marketplace, Stripe, PayPal, Square, ShipStation, Shippo et les factures de votre prestataire logistique. Chacun écrit une liste de travail (CSV avec une colonne de décision vide, et une page HTML) et, quand il faut envoyer quelque chose, un brouillon qui attend une personne nommée.

Le logiciel est gratuit (MIT). Mythos Machines propose une mise en place à prix fixe sur vos propres fichiers : voir [fair-agents.com](https://fair-agents.com).

## Ce qu’aucun agent ne fait

Aucun agent ne rembourse, ne débite, ne paie, ne change un prix ou une annonce, ne désactive un code, ne dépose une déclaration fiscale, ne s’enregistre auprès d’un État, n’envoie de message ni ne passe d’écriture comptable. Ces étapes sont refusées ou attendent le clic d’une personne nommée, même en mode Auto. Chaque appel est inscrit dans un journal d’audit chaîné.

## Données des clients et du personnel

Les noms, e-mails, téléphones et adresses des clients et les noms du personnel sont remplacés par des pseudonymes stables dans tout ce que voit le modèle d’IA. Les fichiers écrits sur votre disque gardent les vraies valeurs pour les personnes qui traitent les listes.

## Fichiers d’autres pays

Les exports de systèmes d’Allemagne, de France, d’Espagne, du Brésil, d’Italie, du Japon, de Chine et de Corée sont lus par le noyau commun : noms de colonnes locaux, Windows-1252, Shift_JIS, GBK et EUC-KR, montants `1.234,56` et dates jour d’abord ou année d’abord. Les pages de rapport existent en neuf langues avec `--lang de|fr|es|pt|it|ja|zh|ko` ; les résultats des outils et les CSV restent en anglais.

> Les taux de taxe, les règles des places de marché et les seuils de nexus sont des réglages que vous confirmez avec votre conseiller. Rien ici n’est un conseil fiscal, juridique ou comptable.

## Les agents

### Versements, frais et argent des marketplaces

| Agent | Package | |
|---|---|---|
| [Fairshop Payouts](packages/fairshop-payouts) | `fairshop-payouts` | Orders against payout lines by channel: never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate. |
| [Fairshop Marketplace Fees](packages/fairshop-marketplace-fees) | `fairshop-marketplace-fees` | Every marketplace fee line against the fee schedule you confirm, and fee rates that moved month to month. |
| [Fairshop FBA Reimbursements](packages/fairshop-fba-reimbursements) | `fairshop-fba-reimbursements` | Lost and damaged FBA units, refunds with no return and low reimbursements, each with a claim-by date. |
| [Fairshop FBA Storage Fees](packages/fairshop-fba-storage-fees) | `fairshop-fba-storage-fees` | Storage fees against your rates, and inventory lots about to cross into the next aged-inventory bracket. |
| [Fairshop Processor Reserves](packages/fairshop-processor-reserves) | `fairshop-processor-reserves` | Stripe, PayPal and Shopify reserves: releases overdue, holds above your terms, releases coming up. |
| [Fairshop Settlement Journals](packages/fairshop-settlement-journals) | `fairshop-settlement-journals` | One balanced journal entry per marketplace settlement from your account map, matched to the bank deposit. |
| [Fairshop Marketplace Claims](packages/fairshop-marketplace-claims) | `fairshop-marketplace-claims` | A-to-z, eBay, Walmart and Etsy claims against your tracking: respond-by dates and what your records prove. |

### Retours, remboursements et clients

| Agent | Package | |
|---|---|---|
| [Fairshop Refunds Returns](packages/fairshop-refunds-returns) | `fairshop-refunds-returns` | Refunds whose item never came back, returns never refunded, refunds paid twice or above the price. |
| [Fairshop Return Reasons](packages/fairshop-return-reasons) | `fairshop-return-reasons` | Why things come back, by SKU, and customers who return most of what they buy (masked). |
| [Fairshop Coupon Abuse](packages/fairshop-coupon-abuse) | `fairshop-coupon-abuse` | Discount codes used past their limit, out of date, under the minimum, or by returning shoppers. |
| [Fairshop Gift Cards](packages/fairshop-gift-cards) | `fairshop-gift-cards` | Gift card and store credit liability by age, and cards whose balances do not add up. |
| [Fairshop Subscriptions](packages/fairshop-subscriptions) | `fairshop-subscriptions` | Failed payments not retried, retries used up, cards about to expire, and churn by cause. |
| [Fairshop Affiliate Commissions](packages/fairshop-affiliate-commissions) | `fairshop-affiliate-commissions` | Commissions on refunded or missing orders, above your rate, paid twice, or on own-link purchases. |

### Taxe de vente (US)

| Agent | Package | |
|---|---|---|
| [Fairshop Sales Tax](packages/fairshop-sales-tax) | `fairshop-sales-tax` | Tax collected on each order against the rates and rules you confirm, by state, with marketplace orders apart. |
| [Fairshop Nexus Thresholds](packages/fairshop-nexus-thresholds) | `fairshop-nexus-thresholds` | Sales and orders by state against the thresholds you confirm, with the date each was met. |

### Stock, annonces et prix

| Agent | Package | |
|---|---|---|
| [Fairshop Inventory Listings](packages/fairshop-inventory-listings) | `fairshop-inventory-listings` | Stock by location against what each channel lists: oversell risk, missed sales and stock listed nowhere. |
| [Fairshop Stockouts](packages/fairshop-stockouts) | `fairshop-stockouts` | Days out of stock, orders taken with nothing on hand, and SKUs to reorder before they run out. |
| [Fairshop Product Data](packages/fairshop-product-data) | `fairshop-product-data` | Missing GTINs, brands, weights and images, titles over your limits and GTINs with a wrong check digit. |
| [Fairshop Duplicate Listings](packages/fairshop-duplicate-listings) | `fairshop-duplicate-listings` | The same SKU listed twice, look-alike titles, shared GTINs and listings for SKUs you do not carry. |
| [Fairshop MAP Pricing](packages/fairshop-map-pricing) | `fairshop-map-pricing` | Advertised prices against your MAP list: your own listings first, then resellers and repeat ones. |
| [Fairshop SKU Margins](packages/fairshop-sku-margins) | `fairshop-sku-margins` | Contribution margin per SKU and channel after fees, labels and unit cost. |
| [Fairshop Ad Spend](packages/fairshop-ad-spend) | `fairshop-ad-spend` | Campaigns under your target return, spend with no sales, ads on out-of-stock SKUs, and over-attribution. |

### Expédition, logistique et achats

| Agent | Package | |
|---|---|---|
| [Fairshop Shipping Costs](packages/fairshop-shipping-costs) | `fairshop-shipping-costs` | Shipping charged against labels bought: losses, free shipping under your threshold, duplicate and unrefunded labels. |
| [Fairshop Carrier Adjustments](packages/fairshop-carrier-adjustments) | `fairshop-carrier-adjustments` | Carrier adjustments your own label data disproves, and SKUs whose packaging data keeps causing them. |
| [Fairshop 3PL Invoices](packages/fairshop-3pl-invoices) | `fairshop-3pl-invoices` | A 3PL invoice against your rate card and your own order, receipt and pallet counts. |
| [Fairshop PO Receiving](packages/fairshop-po-receiving) | `fairshop-po-receiving` | Purchase orders, receipts and supplier invoices matched: billed not received, billed twice, price above the PO. |
| [Fairshop Landed Cost](packages/fairshop-landed-cost) | `fairshop-landed-cost` | Freight, duty and broker costs spread over each shipment's SKUs, against the cost recorded in your store. |
| [Fairshop Retailer Deductions](packages/fairshop-retailer-deductions) | `fairshop-retailer-deductions` | Retailer deductions your proof of delivery or agreements disprove, with dispute dates. |

### Magasins physiques

| Agent | Package | |
|---|---|---|
| [Fairshop Cash Over Short](packages/fairshop-cash-over-short) | `fairshop-cash-over-short` | Register drawers over or short, and deposits missing or different from the counted cash. |
| [Fairshop Store Shrink](packages/fairshop-store-shrink) | `fairshop-store-shrink` | Shrink by store and category against sales, unexplained losses and SKUs written off again and again. |

## Essayer

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/exports
npx -y fairshop-payouts call payouts_audit '{"orders":"orders.csv","payouts":"payouts.csv"}' --lang de
```

## Comment c’est vérifié

Chaque contrôle et ses chiffres figurent dans [REVIEW-ver1.md](REVIEW-ver1.md) (en anglais). Toutes les données de ce dépôt sont fictives.

## Licence

MIT. Conçu par Mythos Machines.
