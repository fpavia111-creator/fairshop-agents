# What reaches the AI model (2026-11-19)

Made by `node scripts/model-view.mjs`: each agent's main check is run on its fictional fixtures with masking on (the default), and every fixture value is looked for in the JSON result the assistant's model receives. Masked columns are replaced before the result leaves the tool: shopper e-mails and names by stable pseudonyms such as `CUS-3f9a2c1b` (the same shopper always gets the same one, so the model can still see that two returns came from one person), staff names by `STAFF-…`, street addresses by `[ADDRESS]`, phone numbers by `[PHONE]`, and card numbers that pass the Luhn check by `[CARD]`. The report and draft files written on your machine keep the real values.

Everything else in the result is sent in clear: amounts, quantities, dates, rates, SKUs, order, listing and tracking numbers, finding codes, and the text columns listed below. Free-text columns (return reasons, cancel reasons, product titles and descriptions, campaign names, seller and affiliate names) are sent as they were typed: if someone writes a shopper's name into a return reason, the model sees it.

Results go to whatever model the user's assistant uses. For shopper or staff data, use a model covered by your own agreements, or a local model. No compliance claim is made.

**9 of 30 agents read personal data; 58 planted canary values and every masked column checked: 0 leak(s).**

| Agent | Masked columns | Text sent in clear | Free text among them |
|---|---|---|---|
| fairshop-3pl-invoices | - | charge_type, invoice_number, period, reference | reference |
| fairshop-ad-spend | - | campaign, platform, sku | campaign |
| fairshop-affiliate-commissions | affiliate (partner), affiliate_email (email), customer_email (email) | action_id, status | - |
| fairshop-carrier-adjustments | - | carrier, reason, sku, tracking | reason |
| fairshop-cash-over-short | cashier (staff) | store | - |
| fairshop-coupon-abuse | customer_email (email), ship_address (address) | code, discount_code, type | - |
| fairshop-duplicate-listings | - | channel, listing_id, sku, status, title | title |
| fairshop-fba-reimbursements | - | fnsku, order_id, reimbursement_id, sku, transaction_id | - |
| fairshop-fba-storage-fees | - | month, sku | - |
| fairshop-store-credit | customer_email (email) | card_id, source, type | - |
| fairshop-inventory-listings | - | channel, fulfillment, listing_id, location, sku, status | - |
| fairshop-landed-cost | - | shipment_id, sku | - |
| fairshop-map-pricing | - | channel, seller, sku | seller |
| fairshop-marketplace-claims | buyer_email (email), buyer_name (name) | carrier, channel, claim_id, order_id, reason, status, tracking | reason |
| fairshop-marketplace-fees | - | category, channel, fee_type, order_id, sku | - |
| fairshop-nexus-thresholds | - | - | - |
| fairshop-payouts | - | channel, gateway, order_id, payout_id, status, type | - |
| fairshop-po-receiving | - | invoice_number, po, sku, vendor | vendor |
| fairshop-processor-reserves | - | processor, reference, type | reference |
| fairshop-product-data | - | channel, title | title |
| fairshop-refunds-returns | customer_email (email) | channel, condition, sku | condition |
| fairshop-retailer-deductions | - | deduction_code, deduction_type, invoice_number, remit_id, retailer | - |
| fairshop-return-reasons | customer_email (email), customer_name (name) | sku | - |
| fairshop-sales-tax | - | channel, order_id | - |
| fairshop-settlement-journals | - | description, settlement_id | description |
| fairshop-shipping-costs | - | channel, refund_status, tracking | - |
| fairshop-sku-margins | - | channel, sku | - |
| fairshop-stockouts | - | cancel_reason, sku, status | cancel_reason |
| fairshop-store-shrink | counted_by (staff) | category, reason, sku, store | reason |
| fairshop-subscriptions | customer_email (email) | cancel_reason, card_expiry, failure_reason, plan, status, subscription_id | cancel_reason, failure_reason |
