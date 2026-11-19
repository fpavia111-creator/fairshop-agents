# Scale test

2026-11-19T00:51:26.490Z · Node v24.20.0 · win32 · 8 CPU (Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz) · 48 GB

Each line is one real tool call, in its own process, on fictional input grown to the stated number of rows per table file (time includes reading and parsing). Growth = time at 10,000 rows / time at 1,000 rows; 10 would be linear.

| Agent | Tool | 1,000 rows (ms) | 10,000 rows (ms) | Peak memory (MB) | Growth | Result |
|---|---|---:|---:|---:|---:|---|
| fairshop-3pl-invoices | fulfillment_audit | 54 | 295 | 155 | 5.5 | ok |
| fairshop-3pl-invoices | fulfillment_explain | 27 | 101 | 104 | 3.7 | ok |
| fairshop-3pl-invoices | fulfillment_write_report | 52 | 231 | 160 | 4.4 | ok |
| fairshop-ad-spend | ads_audit | 32 | 167 | 112 | 5.2 | ok |
| fairshop-ad-spend | ads_explain | 26 | 104 | 103 | 4 | ok |
| fairshop-ad-spend | ads_write_report | 39 | 142 | 115 | 3.6 | ok |
| fairshop-affiliate-commissions | affiliates_audit | 234 | 2711 | 213 | 11.6 | ok |
| fairshop-affiliate-commissions | affiliates_explain | 1590 | 1021 | 144 | 0.6 | ok |
| fairshop-affiliate-commissions | affiliates_write_report | 135 | 1279 | 171 | 9.5 | ok |
| fairshop-carrier-adjustments | adjustments_audit | 58 | 601 | 156 | 10.4 | ok |
| fairshop-carrier-adjustments | adjustments_explain | 32 | 561 | 116 | 17.5 | ok |
| fairshop-carrier-adjustments | adjustments_write_report | 65 | 717 | 173 | 11 | ok |
| fairshop-cash-over-short | cash_audit | 238 | 2310 | 238 | 9.7 | ok |
| fairshop-cash-over-short | cash_explain | 142 | 1433 | 168 | 10.1 | ok |
| fairshop-cash-over-short | cash_write_report | 107 | 1090 | 205 | 10.2 | ok |
| fairshop-coupon-abuse | coupons_audit | 221 | 2694 | 184 | 12.2 | ok |
| fairshop-coupon-abuse | coupons_explain | 87 | 1418 | 150 | 16.3 | ok |
| fairshop-coupon-abuse | coupons_write_report | 112 | 1607 | 167 | 14.3 | ok |
| fairshop-duplicate-listings | listings_audit | 53 | 303 | 156 | 5.7 | ok |
| fairshop-duplicate-listings | listings_explain | 24 | 127 | 119 | 5.3 | ok |
| fairshop-duplicate-listings | listings_write_report | 52 | 268 | 167 | 5.2 | ok |
| fairshop-fba-reimbursements | reimburse_audit | 98 | 666 | 235 | 6.8 | ok |
| fairshop-fba-reimbursements | reimburse_explain | 44 | 203 | 120 | 4.6 | ok |
| fairshop-fba-reimbursements | reimburse_write_report | 111 | 600 | 202 | 5.4 | ok |
| fairshop-fba-storage-fees | storage_audit | 81 | 472 | 162 | 5.8 | ok |
| fairshop-fba-storage-fees | storage_explain | 34 | 184 | 130 | 5.4 | ok |
| fairshop-fba-storage-fees | storage_write_report | 63 | 333 | 175 | 5.3 | ok |
| fairshop-gift-cards | giftcards_liability | 255 | 2050 | 163 | 8 | ok |
| fairshop-gift-cards | giftcards_explain | 74 | 695 | 133 | 9.4 | ok |
| fairshop-gift-cards | giftcards_write_report | 107 | 1041 | 178 | 9.7 | ok |
| fairshop-inventory-listings | inventory_audit | 65 | 317 | 154 | 4.9 | ok |
| fairshop-inventory-listings | inventory_explain | 27 | 1194 | 116 | 44.2 | grows much faster than the input |
| fairshop-inventory-listings | inventory_write_report | 88 | 282 | 164 | 3.2 | ok |
| fairshop-landed-cost | landed_calculate | 70 | 390 | 199 | 5.6 | ok |
| fairshop-landed-cost | landed_explain | 46 | 125 | 142 | 2.7 | ok |
| fairshop-landed-cost | landed_write_report | 74 | 366 | 258 | 4.9 | ok |
| fairshop-map-pricing | map_audit | 41 | 231 | 117 | 5.6 | ok |
| fairshop-map-pricing | map_explain | 24 | 105 | 102 | 4.4 | ok |
| fairshop-map-pricing | map_write_report | 41 | 181 | 125 | 4.4 | ok |
| fairshop-marketplace-claims | claims_audit | 410 | 4075 | 250 | 9.9 | ok |
| fairshop-marketplace-claims | claims_explain | 126 | 1043 | 157 | 8.3 | ok |
| fairshop-marketplace-claims | claims_write_report | 172 | 1230 | 211 | 7.2 | ok |
| fairshop-marketplace-fees | fees_audit | 53 | 352 | 153 | 6.6 | ok |
| fairshop-marketplace-fees | fees_explain | 30 | 162 | 108 | 5.4 | ok |
| fairshop-marketplace-fees | fees_write_report | 46 | 224 | 144 | 4.9 | ok |
| fairshop-nexus-thresholds | nexus_audit | 24 | 56 | 102 | 2.3 | ok |
| fairshop-nexus-thresholds | nexus_explain | 19 | 58 | 102 | 3.1 | ok |
| fairshop-nexus-thresholds | nexus_write_report | 29 | 65 | 101 | 2.2 | ok |
| fairshop-payouts | payouts_audit | 63 | 408 | 165 | 6.5 | ok |
| fairshop-payouts | payouts_explain | 36 | 175 | 140 | 4.9 | ok |
| fairshop-payouts | payouts_write_report | 59 | 323 | 183 | 5.5 | ok |
| fairshop-po-receiving | receiving_match | 75 | 518 | 238 | 6.9 | ok |
| fairshop-po-receiving | receiving_explain | 41 | 238 | 158 | 5.8 | ok |
| fairshop-po-receiving | receiving_write_report | 69 | 451 | 258 | 6.5 | ok |
| fairshop-processor-reserves | reserves_audit | 38 | 367 | 110 | 9.7 | ok |
| fairshop-processor-reserves | reserves_explain | 29 | 252 | 106 | 8.7 | ok |
| fairshop-processor-reserves | reserves_write_report | 60 | 352 | 118 | 5.9 | ok |
| fairshop-product-data | catalog_audit | 54 | 351 | 202 | 6.5 | ok |
| fairshop-product-data | catalog_explain | 40 | 200 | 166 | 5 | ok |
| fairshop-product-data | catalog_write_report | 51 | 288 | 206 | 5.6 | ok |
| fairshop-refunds-returns | refunds_audit | 218 | 2047 | 237 | 9.4 | ok |
| fairshop-refunds-returns | refunds_explain | 84 | 1995 | 163 | 23.8 | ok |
| fairshop-refunds-returns | refunds_write_report | 123 | 1806 | 214 | 14.7 | ok |
| fairshop-retailer-deductions | deductions_audit | 71 | 431 | 163 | 6.1 | ok |
| fairshop-retailer-deductions | deductions_explain | 38 | 207 | 135 | 5.4 | ok |
| fairshop-retailer-deductions | deductions_write_report | 58 | 382 | 171 | 6.6 | ok |
| fairshop-return-reasons | returns_analyse | 236 | 1881 | 161 | 8 | ok |
| fairshop-return-reasons | returns_explain | 170 | 1625 | 151 | 9.6 | ok |
| fairshop-return-reasons | returns_write_report | 170 | 1532 | 158 | 9 | ok |
| fairshop-sales-tax | salestax_audit | 39 | 207 | 145 | 5.3 | ok |
| fairshop-sales-tax | salestax_explain | 21 | 70 | 110 | 3.3 | ok |
| fairshop-sales-tax | salestax_write_report | 39 | 159 | 141 | 4.1 | ok |
| fairshop-settlement-journals | journals_audit | 50 | 982 | 150 | 19.6 | ok |
| fairshop-settlement-journals | journals_explain | 35 | 900 | 146 | 25.7 | ok |
| fairshop-settlement-journals | journals_write_report | 50 | 949 | 153 | 19 | ok |
| fairshop-shipping-costs | shipping_audit | 50 | 288 | 152 | 5.8 | ok |
| fairshop-shipping-costs | shipping_explain | 30 | 155 | 129 | 5.2 | ok |
| fairshop-shipping-costs | shipping_write_report | 51 | 195 | 156 | 3.8 | ok |
| fairshop-sku-margins | margins_margins | 48 | 259 | 154 | 5.4 | ok |
| fairshop-sku-margins | margins_explain | 26 | 111 | 111 | 4.3 | ok |
| fairshop-sku-margins | margins_write_report | 50 | 254 | 166 | 5.1 | ok |
| fairshop-stockouts | stockouts_audit | 60 | 139 | 112 | 2.3 | ok |
| fairshop-stockouts | stockouts_explain | 922 | 94 | 115 | 0.1 | ok |
| fairshop-stockouts | stockouts_write_report | 38 | 135 | 114 | 3.6 | ok |
| fairshop-store-shrink | shrink_measure | 61 | 591 | 108 | 9.7 | ok |
| fairshop-store-shrink | shrink_explain | 68 | 525 | 110 | 7.7 | ok |
| fairshop-store-shrink | shrink_write_report | 70 | 532 | 108 | 7.6 | ok |
| fairshop-subscriptions | subscriptions_audit | 246 | 2207 | 159 | 9 | ok |
| fairshop-subscriptions | subscriptions_explain | 63 | 659 | 137 | 10.5 | ok |
| fairshop-subscriptions | subscriptions_write_report | 95 | 817 | 154 | 8.6 | ok |
