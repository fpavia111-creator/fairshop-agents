# Fairshop: Agenten für das Backoffice im E-Commerce und Einzelhandel

> Übersetzt von Claude; eine Prüfung durch Muttersprachler steht noch aus. Bei Abweichungen gilt die englische README. Die Beschreibungen der Agenten sind auf Englisch.

[English](README.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md)

30 kleine Agenten für Onlinehändler und Läden mit Kasse. Jeder erledigt eine Backoffice-Aufgabe auf Ihrem Rechner, aus Dateien, die Sie ohnehin exportieren: Shopify, WooCommerce, BigCommerce, Amazon Seller Central, eBay, Etsy, Walmart Marketplace, Stripe, PayPal, Square, ShipStation, Shippo und die Rechnungen Ihres Fulfillment-Dienstleisters. Jeder schreibt eine Arbeitsliste (CSV mit leerer Entscheidungsspalte und eine HTML-Seite) und, wo etwas verschickt werden muss, einen Entwurf, der auf eine namentlich genannte Person wartet.

Die Software ist kostenlos (MIT). Fair Agents bietet eine Einrichtung zum Festpreis auf Ihren eigenen Dateien an: siehe [fair-agents.com](https://fair-agents.com).

## Was kein Agent tut

Kein Agent erstattet, belastet, zahlt, ändert Preise oder Angebote, deaktiviert Codes, reicht Steuererklärungen ein, registriert sich bei einem Bundesstaat, verschickt Nachrichten oder bucht in ein Hauptbuch. Diese Schritte werden abgelehnt oder warten auf den Klick einer namentlich genannten Person, auch im Auto-Modus. Jeder Aufruf steht in einem verketteten Prüfprotokoll.

## Kunden- und Mitarbeiterdaten

Namen, E-Mail-Adressen, Telefonnummern, Anschriften von Kunden und Namen von Mitarbeitern werden in allem, was das KI-Modell sieht, durch feste Pseudonyme ersetzt. Die Dateien auf Ihrer Festplatte behalten die echten Werte für die Menschen, die die Listen bearbeiten.

## Dateien aus anderen Ländern

Exporte aus Systemen in Deutschland, Frankreich, Spanien, Brasilien, Italien, Japan, China und Korea werden über den gemeinsamen Kern gelesen: lokale Spaltennamen, Windows-1252, Shift_JIS, GBK und EUC-KR, Beträge wie `1.234,56` und Datumsangaben mit Tag oder Jahr zuerst. Berichtsseiten gibt es mit `--lang de|fr|es|pt|it|ja|zh|ko` in neun Sprachen; Tool-Ergebnisse und CSV-Dateien bleiben auf Englisch.

> Steuersätze, Regeln für Marktplatzbetreiber und Nexus-Schwellen sind Einstellungen, die Sie mit Ihrem Berater festlegen. Nichts hier ist Steuer-, Rechts- oder Buchhaltungsberatung.

## Die Agenten

### Auszahlungen, Gebühren und Marktplatzgeld

| Agent | Package | |
|---|---|---|
| [Fairshop Payouts](packages/fairshop-payouts) | `fairshop-payouts` | Orders against payout lines by channel: never paid out, paid short, paid twice, refunds not yet deducted, fees above your rate. |
| [Fairshop Marketplace Fees](packages/fairshop-marketplace-fees) | `fairshop-marketplace-fees` | Every marketplace fee line against the fee schedule you confirm, and fee rates that moved month to month. |
| [Fairshop FBA Reimbursements](packages/fairshop-fba-reimbursements) | `fairshop-fba-reimbursements` | Lost and damaged FBA units, refunds with no return and low reimbursements, each with a claim-by date. |
| [Fairshop FBA Storage Fees](packages/fairshop-fba-storage-fees) | `fairshop-fba-storage-fees` | Storage fees against your rates, and inventory lots about to cross into the next aged-inventory bracket. |
| [Fairshop Processor Reserves](packages/fairshop-processor-reserves) | `fairshop-processor-reserves` | Stripe, PayPal and Shopify reserves: releases overdue, holds above your terms, releases coming up. |
| [Fairshop Settlement Journals](packages/fairshop-settlement-journals) | `fairshop-settlement-journals` | One balanced journal entry per marketplace settlement from your account map, matched to the bank deposit. |
| [Fairshop Marketplace Claims](packages/fairshop-marketplace-claims) | `fairshop-marketplace-claims` | A-to-z, eBay, Walmart and Etsy claims against your tracking: respond-by dates and what your records prove. |

### Retouren, Erstattungen und Kunden

| Agent | Package | |
|---|---|---|
| [Fairshop Refunds Returns](packages/fairshop-refunds-returns) | `fairshop-refunds-returns` | Refunds whose item never came back, returns never refunded, refunds paid twice or above the price. |
| [Fairshop Return Reasons](packages/fairshop-return-reasons) | `fairshop-return-reasons` | Why things come back, by SKU, and customers who return most of what they buy (masked). |
| [Fairshop Coupon Abuse](packages/fairshop-coupon-abuse) | `fairshop-coupon-abuse` | Discount codes used past their limit, out of date, under the minimum, or by returning shoppers. |
| [Fairshop Gift Cards](packages/fairshop-store-credit) | `fairshop-store-credit` | Gift card and store credit liability by age, and cards whose balances do not add up. |
| [Fairshop Subscriptions](packages/fairshop-subscriptions) | `fairshop-subscriptions` | Failed payments not retried, retries used up, cards about to expire, and churn by cause. |
| [Fairshop Affiliate Commissions](packages/fairshop-affiliate-commissions) | `fairshop-affiliate-commissions` | Commissions on refunded or missing orders, above your rate, paid twice, or on own-link purchases. |

### Umsatzsteuer (US Sales Tax)

| Agent | Package | |
|---|---|---|
| [Fairshop Sales Tax](packages/fairshop-sales-tax) | `fairshop-sales-tax` | Tax collected on each order against the rates and rules you confirm, by state, with marketplace orders apart. |
| [Fairshop Nexus Thresholds](packages/fairshop-nexus-thresholds) | `fairshop-nexus-thresholds` | Sales and orders by state against the thresholds you confirm, with the date each was met. |

### Bestand, Angebote und Preise

| Agent | Package | |
|---|---|---|
| [Fairshop Inventory Listings](packages/fairshop-inventory-listings) | `fairshop-inventory-listings` | Stock by location against what each channel lists: oversell risk, missed sales and stock listed nowhere. |
| [Fairshop Stockouts](packages/fairshop-stockouts) | `fairshop-stockouts` | Days out of stock, orders taken with nothing on hand, and SKUs to reorder before they run out. |
| [Fairshop Product Data](packages/fairshop-product-data) | `fairshop-product-data` | Missing GTINs, brands, weights and images, titles over your limits and GTINs with a wrong check digit. |
| [Fairshop Duplicate Listings](packages/fairshop-duplicate-listings) | `fairshop-duplicate-listings` | The same SKU listed twice, look-alike titles, shared GTINs and listings for SKUs you do not carry. |
| [Fairshop MAP Pricing](packages/fairshop-map-pricing) | `fairshop-map-pricing` | Advertised prices against your MAP list: your own listings first, then resellers and repeat ones. |
| [Fairshop SKU Margins](packages/fairshop-sku-margins) | `fairshop-sku-margins` | Contribution margin per SKU and channel after fees, labels and unit cost. |
| [Fairshop Ad Spend](packages/fairshop-ad-spend) | `fairshop-ad-spend` | Campaigns under your target return, spend with no sales, ads on out-of-stock SKUs, and over-attribution. |

### Versand, Fulfillment und Einkauf

| Agent | Package | |
|---|---|---|
| [Fairshop Shipping Costs](packages/fairshop-shipping-costs) | `fairshop-shipping-costs` | Shipping charged against labels bought: losses, free shipping under your threshold, duplicate and unrefunded labels. |
| [Fairshop Carrier Adjustments](packages/fairshop-carrier-adjustments) | `fairshop-carrier-adjustments` | Carrier adjustments your own label data disproves, and SKUs whose packaging data keeps causing them. |
| [Fairshop 3PL Invoices](packages/fairshop-3pl-invoices) | `fairshop-3pl-invoices` | A 3PL invoice against your rate card and your own order, receipt and pallet counts. |
| [Fairshop PO Receiving](packages/fairshop-po-receiving) | `fairshop-po-receiving` | Purchase orders, receipts and supplier invoices matched: billed not received, billed twice, price above the PO. |
| [Fairshop Landed Cost](packages/fairshop-landed-cost) | `fairshop-landed-cost` | Freight, duty and broker costs spread over each shipment's SKUs, against the cost recorded in your store. |
| [Fairshop Retailer Deductions](packages/fairshop-retailer-deductions) | `fairshop-retailer-deductions` | Retailer deductions your proof of delivery or agreements disprove, with dispute dates. |

### Ladengeschäfte

| Agent | Package | |
|---|---|---|
| [Fairshop Cash Over Short](packages/fairshop-cash-over-short) | `fairshop-cash-over-short` | Register drawers over or short, and deposits missing or different from the counted cash. |
| [Fairshop Store Shrink](packages/fairshop-store-shrink) | `fairshop-store-shrink` | Shrink by store and category against sales, unexplained losses and SKUs written off again and again. |

## Ausprobieren

```bash
npx -y fairshop-payouts demo
npx -y fairshop-payouts mcp --root /path/to/your/exports
npx -y fairshop-payouts call payouts_audit '{"orders":"orders.csv","payouts":"payouts.csv"}' --lang de
```

## Wie geprüft wird

Alle Prüfungen mit ihren Zahlen stehen in [docs/](docs/) (Englisch). Alle Daten in diesem Repository sind erfunden.

## Lizenz

MIT. Entwickelt von Fair Agents.
