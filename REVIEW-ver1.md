# Fairshop ver 1: review

18 Nov 2026. What was built, how it was checked, what was found and fixed, what is not checked yet, and every decision made without Kurt's input (he asked for the suite to be built today without him).

## Scope

30 agents for e-commerce and retail back offices, one job each, plus `fairshop-core`. Named after what they do (`fairshop-<job>`, Kurt's naming rule of 18 Nov). Version 0.1.0 of every package; nothing published, pushed or uploaded; Stripe and the websites untouched.

| Group | Agents |
|---|---|
| Payouts, fees and marketplace money | payouts, marketplace-fees, fba-reimbursements, fba-storage-fees, processor-reserves, settlement-journals, marketplace-claims |
| Returns, refunds and customers | refunds-returns, return-reasons, coupon-abuse, gift-cards, subscriptions, affiliate-commissions |
| Sales tax | sales-tax, nexus-thresholds |
| Inventory, listings and pricing | inventory-listings, stockouts, product-data, duplicate-listings, map-pricing, sku-margins, ad-spend |
| Shipping, fulfilment and purchasing | shipping-costs, carrier-adjustments, 3pl-invoices, po-receiving, landed-cost, retailer-deductions |
| Physical stores | cash-over-short, store-shrink |

Every agent reads files the seller already exports, writes a worklist (CSV with a blank decision column, HTML page, a calendar where there are deadlines) and drafts one thing for a person. Nothing refunds, charges, pays, reprices, changes a listing or code, files a tax return, registers with a state, opens a marketplace case, posts to a ledger or messages anyone: the draft's request tool is one named click even in Auto, and each agent also lists two refused tools by name.

## Checks run, and results (Windows 10, Node 24.20.0)

| Check | Result |
|---|---|
| `npm test` (all 31 workspaces) | **863 tests, 863 pass, 0 fail**: 149 in `fairshop-core`, 23 to 26 per agent |
| `npm run evals` | **610 eval cases, 610 pass**; 20 or 21 per agent (domain cases, the standard policy and safety cases, and a German and a Japanese export of the main case) |
| `npm run check` (family rules) | 30 agents, 30 distinct tool prefixes, 203 distinct tool names, every one-click tool waits for a click, the last policy rule blocks everything else, 9 agents read customer or staff fields and all list canaries; pass |
| `npm run hostile` (formulas, HTML, `../` ids and AI-aimed instructions planted in every fixture, every eval case) | 30 agents, 3,050 calls, 1,431 planted values, 83 results flagged for instruction-like text, **0 findings** |
| `npm run hostile:args` (null, numbers, arrays, a 200,000-character string, NUL, `../` and absolute paths in every argument of every tool) | {{ARGS}} |
| `npm run intl` (every spreadsheet eval case re-run as a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export: local column names, legacy encodings, comma decimals, local dates) | 388 cases with spreadsheet inputs, **every case that passes in English passes in all 8 languages**; 336 of 358 column names have a translated word (the rest keep their English name and are still read) |
| Masking canaries | Every eval case of the 9 agents with customer or staff fields runs through the contract test; no listed fictional name or e-mail reaches any result |
| MCP stdio smoke test | Every agent: initialize, list tools, refuse an unknown tool, write the audit log |
| ver 6 shared checks | Every agent: same answer twice, nothing read outside `--root` (four path forms), a Windows export with CRLF and a BOM reads the same |
| `npm run bench` (10,000 rows per table) | {{BENCH}} |
| `npm run release:check:offline` | {{RELEASE}} |
| `npm view` for all 31 package names (read-only) | all 31 free on npm (E404) |
| MCP Registry | `node ..\add-mcp-registry.cjs fairshop-agents fairshop.html`: `mcpName` and `server.json` in all 30 agents |

## Found and fixed during the build

- **Core, a hang on Windows (found by `hostile:args`):** a report tool given a 200,000-character `out_dir` never returned, because Node's recursive `mkdir` on Windows does not come back from an over-long path. `safePath` now refuses any path over 1,024 characters or with a folder or file name over 255 before the file system sees it, with a short message; two core tests added. Every agent's `out_dir` and file arguments go through `safePath`, so all 30 were exposed and all are fixed by the one change.
- **Hostile argument pass, speed:** as copied, it replayed every earlier eval case before each of about 430 mutated calls per agent (hours for 30 agents). Fairshop tools are stateless except the one-click request, which needs a draft on disk, so only that draft is written first. One agent's pass went from more than 10 minutes to 13 seconds; the checks themselves are unchanged.
- **Core, header case (from the Fairmake session's note):** a header equal to a field name in another case ("Item" for `item`) was not re-keyed, so the agent read the column as blank. Ported the one-line fix; all core tests pass.
- **Core, pseudonyms in tests:** a runtime without a state folder makes a fresh pseudonym key, so two runtimes gave different pseudonyms and every "same answer twice" style check failed as soon as a result was masked. The contract and shared checks now pass one fixed test key; the runtime also accepts the `phiKey` name the shared ver 6 checks use.
- **Core, masking of card numbers:** the first pattern would have masked 17-digit Amazon order numbers. Card numbers are now masked only as 4-4-4-4 groups or 15 to 16 plain digits that pass the Luhn check; order and tracking numbers survive (test added).
- **Core, generic affiliate export:** its column signature matched the agent's own column names, so a file already in the agent's own layout was reported as an adapted export. Signature narrowed (contract test caught it).
- **fairshop-fba-storage-fees:** the monthly aged-surcharge total counted each SKU's summary line as well as its lots (218 instead of 109).
- **fairshop-refunds-returns:** a second refund for the same unit was chased as a second unit to get back. Units to get back are now capped at the units ordered; the double refund is reported as such.
- **fairshop-duplicate-listings:** look-alike titles were compared case-sensitively ("Blue ceramic mug" against "Ceramic mug blue" scored 0.43). Titles are lower-cased and punctuation folded first.
- **fairshop-3pl-invoices:** "Packaging mailer" matched the pick-and-pack rule (on "pack"), so the real pick of the same order was reported as billed twice. Packaging words are matched first.
- **fairshop-payouts:** a payout line for an unknown order took its payout id from whichever row came first in the file; lines are now sorted first, so results never depend on row order.
- **Eval expectations written by hand that were wrong**, found when the evals ran and corrected after re-deriving the answer from the fixtures (the agent was right each time): FBA storage fine-count (5, not 6) and fees-only review count, the MAP paused-promotion case, the shipping no-threshold count (4, not 3), the landed-cost total (1,840, not 1,140), two list orders that follow code-point order ("eBay" sorts after "Shopify"), an expectation of `null` where the key is absent, and an FBA-reimbursements case that ignored a low reimbursement.

## Not checked yet (say this out loud)

- **Export layouts.** The 36 named exports (Shopify, WooCommerce, BigCommerce, Amazon Seller Central reports, eBay, Etsy, Walmart, Stripe, PayPal, Recharge, Shippo, UPS and USPS adjustments, Square, Shopify POS, ad platforms, a generic 3PL invoice and affiliate network) were written from knowledge of those exports. None was checked against vendor documentation or a live account. The first setup confirms them with `inspect`; `fairshop-sources.json` fixes any miss.
- **Rules.** Fee schedules, reserve terms, FBA reason codes and claim windows, storage rates and aged brackets, dim divisors, dispute windows, sales tax rates, marketplace facilitator rules and nexus thresholds are all settings. The fixtures hold fictional values only. A tax adviser should read the sales-tax and nexus settings design before a client relies on it; the sales-tax agent uses one combined rate per state (no local jurisdictions).
- **Node 20 and 22, and Linux:** only Node 24 on Windows was run here. The CI workflow covers Node 20, 22, 24 on Linux and Windows once the repo is pushed.
- **`npm run mcp:check`** (official MCP SDK client) was not run: it needs `npm i --no-save @modelcontextprotocol/sdk ajv ajv-formats`, which this session did not install. The zero-dependency stdio server is the same code the other families pass with.
- **Translations:** report headings and root READMEs in eight languages were written by Claude and have not been reviewed by native speakers; agent READMEs, finding texts and sample reports are English.
- **Sample reports** show raw numbers (no thousands separators or currency symbols).
- No e-commerce bookkeeper, Amazon seller, tax adviser or lawyer has reviewed the agents yet.
- `scripts/add-mcp-registry.cjs` writes titles without upper-case acronyms ("Fba", "Sku"); the six affected `server.json` titles were corrected by hand here. Running that script again would undo it.

## Decisions made (Kurt was not asked)

- **Family core:** `fairshop-core` copied from the Lodestar core (now Fairhaul) with the 18 Nov Windows fixes, as the brief says, not from `remedy-core`. The freight EDI readers were dropped; the freight and parcel helpers (carrier keys, dimensional weight) stay because three shipping agents use them.
- **Masking:** a new `pii.js` adapted from Remedy's patient-data masker for shoppers and staff. E-mails become pseudonyms (`CUS-…`) rather than `[EMAIL]`, so the model can still tell that two returns came from one shopper without seeing who.
- **The 30 jobs:** the 27 the brief listed, plus processor reserves, settlement journal entries and retailer deductions (the last for brands that sell wholesale). Chargebacks are left to Mythos `soteria-of-refunds`; `fairshop-marketplace-claims` covers A-to-z, eBay, Walmart and Etsy claims instead, as the brief asked.
- **One-click categories:** `binding_send` for anything sent or filed (inquiries, disputes, claims, purchase orders, worksheets, memos); `go_live` for changes to a live system (listings, prices, codes, removals, ledger postings, cost updates); `move_money` and `revoke_access` only on refused tools.
- **Sales tax and nexus** have no built-in rates or thresholds at all; the seller's settings decide, the drafts are a worksheet and a memo for the adviser, and every page says it is not tax advice.
- **Estimates** (lost sales, reimbursement values, surcharges) are labelled as estimates in findings and limits.
- **Eval cases:** each agent has 5 or 6 hand-written domain cases; `scripts/make-evals.mjs` adds the standard policy and safety cases from the agent's own manifest (Review mode, draft asks, one-click request even in Auto, every refused tool, an unknown tool, a file outside the root, a missing file, a missing argument, a wrong type, an unknown id), and `make-intl-fixtures.mjs` adds the German and Japanese cases.
- **Prices** (in `sales/pricing-page-ver1.md` and `sales/site.json`, plain numbers as Kurt approved): packs from $1,000 to $2,500, whole shop $7,500, multi-brand $10,500, partner rollout $15,000 for up to 15 clients; support $200 a month per pack, $450 for the whole shop, $250 per brand or client. In line with Fairbrief's $1,000 to $15,000 range.
- **Sample reports:** eight agents' own reports on their fictional fixtures (`sample-reports/index.html`).

## For the main session

Publish order: `fairshop-core` first, then the 30 agents. Site page assumed to be `fairshop.html` (used for `server.json`). `sales/site.json` follows the brief's shape exactly.
