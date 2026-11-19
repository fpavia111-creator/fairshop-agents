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
| `npm test` (all 31 workspaces) | **865 tests, 865 pass, 0 fail**: 151 in `fairshop-core`, 23 to 26 per agent |
| `npm run evals` | **610 eval cases, 610 pass**; 20 or 21 per agent (domain cases, the standard policy and safety cases, and a German and a Japanese export of the main case) |
| `npm run check` (family rules) | 30 agents, 30 distinct tool prefixes, 203 distinct tool names, every one-click tool waits for a click, the last policy rule blocks everything else, 9 agents read customer or staff fields and all list canaries; pass |
| `npm run hostile` (formulas, HTML, `../` ids and AI-aimed instructions planted in every fixture, every eval case) | 30 agents, 3,050 calls, 1,431 planted values, 83 results flagged for instruction-like text, **0 findings** |
| `npm run hostile:args` (null, numbers, arrays, a 200,000-character string, NUL, `../` and absolute paths in every argument of every tool) | 30 agents, 14,495 calls, **0 findings** (511 s on this machine, after the hang fix below) |
| `npm run intl` (every spreadsheet eval case re-run as a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export: local column names, legacy encodings, comma decimals, local dates) | 388 cases with spreadsheet inputs, **every case that passes in English passes in all 8 languages**; 334 of 358 column names have a translated word (the rest keep their English name and are still read) |
| Masking canaries | Every eval case of the 9 agents with customer or staff fields runs through the contract test; no listed fictional name or e-mail reaches any result |
| MCP stdio smoke test | Every agent: initialize, list tools, refuse an unknown tool, write the audit log |
| ver 6 shared checks | Every agent: same answer twice, nothing read outside `--root` (four path forms), a Windows export with CRLF and a BOM reads the same |
| `npm run bench` (10,000 rows per table) | 90 tools across 30 agents, each in its own process at 1,000 and 10,000 rows per table file: median 366 ms, slowest 4.1 s (`claims_audit`), peak memory 258 MB (Intel i7-9700K, 8 cores). 89 ok; one flag (`inventory_explain` 1,194 ms once) was a timing blip, 113 ms on the rerun. Three real slow spots were fixed first (below). Full table: `docs/bench-ver1.md` |
| `npm run release:check:offline` | **Dry run passed**: workspaces, package metadata, clean git tree, no `.npmrc`, secret scan of 942 tracked files, honest-copy scan of 94 README/package/manifest files, one-click categories and policy, no paid tools, 865 tests, 610/610 evals, hostile data and export passes 0 findings, `npm pack` of 31 packages (575 KB, no tests, state, output, keys or `.npmrc`). npm names skipped offline (checked separately below). Nothing was published |
| `npm view` for all 31 package names (read-only) | all 31 free on npm (E404) |
| MCP Registry | `node ..\add-mcp-registry.cjs fairshop-agents fairshop.html`: `mcpName` and `server.json` in all 30 agents |

## Found and fixed during the build

- **Core, a hang on Windows (found by `hostile:args`):** a report tool given a 200,000-character `out_dir` never returned, because Node's recursive `mkdir` on Windows does not come back from an over-long path. `safePath` now refuses any path over 1,024 characters or with a folder or file name over 255 before the file system sees it, with a short message; two core tests added. Every agent's `out_dir` and file arguments go through `safePath`, so all 30 were exposed and all are fixed by the one change.
- **Speed at 10,000 rows (found by `npm run bench`):** `fairshop-cash-over-short` compared every closeout with every deposit (140 s; now deposits are indexed by store and amount and by day, 2.5 s); `fairshop-duplicate-listings` compared every title with every earlier one (6 s; now a prefix index on title words finds the same look-alikes, 0.3 s); `fairshop-product-data` listed and sorted every SKU sharing a GTIN on every row (report 14.5 s; now sorted once per GTIN and the detail names at most five, 0.3 s). Results unchanged; all tests and evals pass.
- **Hostile argument pass, speed:** as copied, it replayed every earlier eval case before each of about 430 mutated calls per agent (hours for 30 agents). Fairshop tools are stateless except the one-click request, which needs a draft on disk, so only that draft is written first. One agent's pass went from more than 10 minutes to 13 seconds; the checks themselves are unchanged.
- **Core, header case (from the Fairmake session's note):** a header equal to a field name in another case ("Item" for `item`) was not re-keyed, so the agent read the column as blank. Ported the one-line fix; all core tests pass.
- **Core, pseudonyms in tests:** a runtime without a state folder makes a fresh pseudonym key, so two runtimes gave different pseudonyms and every "same answer twice" style check failed as soon as a result was masked. The contract and shared checks now pass one fixed test key; the runtime also accepts the `phiKey` name the shared ver 6 checks use.
- **Core, masking of card numbers:** the first pattern would have masked 17-digit Amazon order numbers. Card numbers are now masked only as 4-4-4-4 groups or 15 to 16 plain digits that pass the Luhn check; order and tracking numbers survive (test added).
- **Core, generic affiliate export:** its column signature matched the agent's own column names, so a file already in the agent's own layout was reported as an adapted export. Signature narrowed (contract test caught it).
- **Column words, Portuguese:** mapping a transaction id to the dictionary's "reference" words gave that column a Portuguese name the SKU field also accepts, so the SKU was read from the wrong column in the Portuguese FBA export (4 eval cases failed in `pt` only). The mapping was removed for transaction and reimbursement ids; all 8 languages pass. The international check exists to catch exactly this.
- **fairshop-fba-storage-fees:** the monthly aged-surcharge total counted each SKU's summary line as well as its lots (218 instead of 109).
- **fairshop-refunds-returns:** a second refund for the same unit was chased as a second unit to get back. Units to get back are now capped at the units ordered; the double refund is reported as such.
- **fairshop-duplicate-listings:** look-alike titles were compared case-sensitively ("Blue ceramic mug" against "Ceramic mug blue" scored 0.43). Titles are lower-cased and punctuation folded first.
- **fairshop-3pl-invoices:** "Packaging mailer" matched the pick-and-pack rule (on "pack"), so the real pick of the same order was reported as billed twice. Packaging words are matched first.
- **fairshop-payouts:** a payout line for an unknown order took its payout id from whichever row came first in the file; lines are now sorted first, so results never depend on row order.
- **Eval expectations written by hand that were wrong**, found when the evals ran and corrected after re-deriving the answer from the fixtures (the agent was right each time): FBA storage fine-count (5, not 6) and fees-only review count, the MAP paused-promotion case, the shipping no-threshold count (4, not 3), the landed-cost total (1,840, not 1,140), two list orders that follow code-point order ("eBay" sorts after "Shopify"), an expectation of `null` where the key is absent, and an FBA-reimbursements case that ignored a low reimbursement.

## Not checked yet (say this out loud)

- **Export layouts.** The 36 named exports (Shopify, WooCommerce, BigCommerce, Amazon Seller Central reports, eBay, Etsy, Walmart, Stripe, PayPal, Recharge, Shippo, UPS and USPS adjustments, Square, Shopify POS, ad platforms, a generic 3PL invoice and affiliate network) were written from knowledge of those exports. None was checked against vendor documentation or a live account. The first setup confirms them with `inspect`; `fairshop-sources.json` fixes any miss. (Final pass: 38 layouts now, 3 of them run on the vendor's own published sample file; see below.)
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

## Final pass (19 Nov 2026)

Kurt's final pass (`BUILD-BRIEF.md` "Final pass" and "Final review questions", `FINAL-PASS-REQUEST.md`). Every number below is from a **fresh clone** of this folder (`git clone` into `%TEMP%\fp-fairshop`, with `core.autocrlf=true`, so Windows line-ending conversion was on), `npm install --offline`, Windows 10, Node 24.20.0.

### The checklist

1. **Names.** `grep -ri` for the old themed words and other families' names outside history: one example name left in a core code comment and one in a core test helper; both now `fairshop-…`.
2. **Each README read as a buyer.** Every agent README opens with what it checks and what it never does, lists every tool with "refused" or "one named click" beside it, and tables the columns it needs. Three were out of date after this pass's fixes and were updated (product data layouts, inventory "no SKU", return reasons `ignore_skus`); the affiliate README now says affiliate names are masked.
3. **Honest copy.** No compliance, certification, savings or advice claim in READMEs, `site.json`, the pricing page or sample reports (release check scan below). The sales copy said names are "masked in anything sent to the AI model"; it now says what is masked and that free-text notes are sent as typed, and that three layouts were run on vendor sample files.
4. **Binding actions.** Every pay, send, file, post, change or delete is refused or one named click, even in Auto (family check and release check below).
5. **The full bar from a clean install:** see "Final numbers".
6. **Fixtures fictional.** The product fixtures used the well-known example barcodes from Wikipedia and GS1 pages, which are real products' codes; they now use the GS1 prefix 952, which GS1 keeps for demonstrations and examples. People and businesses are invented (`Example Goods`, `Dana Example`, `Brightway Home`, …; e-mails at `example.test`); a search for real small businesses with the same generic names was not done. Masking is on by default.
7. **`site.json`, pricing page, agents, sample reports.** 10 packages with the same names and prices on both; the 30 group entries name all 30 agents; the one-store packs add up to 30 agents. Sample reports regenerated: unchanged.
8. **Secrets, state, stray files.** Release check below (secret scan, `npm pack` contents). `scripts/sources-doc.mjs`, an unused leftover from the Lodestar copy that rewrote README sections owned by `readme-sections.mjs`, was removed.

Also fixed for a fresh Windows clone: the `--check` scripts compared files byte for byte with generated LF text, so a CRLF checkout looked stale (Fairtable's note). `.gitattributes` now checks text out with LF (the legacy-encoded test exports and `.ics` calendars stay byte-exact) and the scripts compare with CRLF turned into LF. `release-check.mjs` builds module URLs with `pathToFileURL`. The "same file for two arguments" core bug from Fairdrive's note does not apply: every Fairshop agent names the source kind on each read.

### What this pass changed in the agents

- **fairshop-fba-reimbursements (found by a mutation case):** a reimbursement for damaged units was spent on lost units first, by date, so a lost unit still owed was reported as damaged. Reimbursements now pay units of their own kind first.
- **fairshop-product-data (found on Shopify's and WooCommerce's own sample files):** the current Shopify product layout and the WooCommerce product export are recognised; Shopify's title, description, vendor and type are filled down from a product's first row to its variant rows (every variant row had been reported as missing its title and brand, in the classic layout too); images are counted per product; products that do not ship are not asked for a weight; WooCommerce variations take the parent's weight, description and images when blank; barcode cells such as `ean:…; upc:…` and hyphenated ISBNs are read; 8-digit UPC-E codes are accepted (found while checking real barcodes).
- **fairshop-inventory-listings (Shopify's inventory template):** a stock row or listing with no SKU was reported as a SKU named "". It is now reported once, by product name (`stock_no_sku`, `listing_no_sku`).
- **fairshop-return-reasons (UCI real shop data):** `ignore_skus` leaves line codes that are not products out of every count.
- **fairshop-affiliate-commissions:** affiliate names were sent to the model in clear; an affiliate is often one person, so they are now masked as `AFF-…` pseudonyms (new `partner` kind in the core masker; the worklist and draft files keep the names).
- **Core:** a `prepare` hook lets an export layout see raw rows before mapping; layouts can be marked "run on the vendor's published sample" with source and date; every main check result names the settings files it used with their sha256 (`settings_files`); the demo uses a fixed masking key for its fictional data, so README demo output is the same on every run.
- **New records:** `docs/accuracy-2026-11-19.md`, `docs/model-view-2026-11-19.md`, `docs/realdata-2026-11-19.md`, `docs/rules-2026-11-19.md`, each made by a script in `scripts/`; `fixtures/clean/` in 28 agents; `sales/final-pass.json` (`node scripts/final-pass.mjs`).

### Kurt's five questions

1. **Accuracy** (`npm run accuracy`, per agent in `docs/accuracy-2026-11-19.md`): **158 of 158 planted problems found** in 30 agents, 0 unplanned findings on the planted files, 0 of 64 planted near-misses (inside a window, under a threshold, exempt) flagged, **0 findings on 380 clean rows** (28 agents; marketplace claims and carrier adjustments have no clean set, because every open claim or adjustment gets a finding that says how to answer it), **82 of 82 one-field mutation cases caught** (they raised 14 other findings beside the expected one). One mutation case found a real bug (FBA reimbursements, above). The planted lists were written from each fixtures README by the person who wrote the fixtures and the rules, so these numbers show the rules do what they are written to do; they do not measure how often a real store's data trips a rule wrongly. The real-data runs below are the first evidence of that.
2. **Security: what reaches the model** (`npm run model-view`, per agent in `docs/model-view-2026-11-19.md`): 9 of 30 agents read personal data (shopper e-mails, names and addresses, staff names, affiliate names and e-mails), all masked; **58 planted fictional values and every masked column were looked for in the results: 0 leaks.** Amounts, quantities, dates, rates, SKUs, order, listing and tracking numbers, finding codes and text such as product titles, campaign, seller and vendor names are sent in clear; free text (return and cancel reasons, claim reasons, notes) is sent as typed, except that a name already read from a personal column is also replaced inside free text. Results are sent to whatever model the user's assistant uses; for shopper or staff data, use a local model or one covered by your own agreements. No compliance claim is made. Hostile checks re-run: below.
3. **Compatibility:** 38 export layouts. **3 run on the vendor's own published sample file** (Shopify product export, current layout; Shopify inventory export; WooCommerce product export), **35 written from knowledge of the vendors' documented exports** and not compared column by column with current documentation, **0 run on a real store's export**. Per layout in `sales/final-pass.json` (`formats`) and in each agent README's "Columns it reads".
4. **Commercial traction:** no paying customers; no checkout is live (main session's answer for the suite).
5. **Support:** `docs/rules-2026-11-19.md` lists every rule that changes over time. Thirteen kinds of rule (fee schedules, storage rates, tax rates and registrations, nexus thresholds, reserve terms, payout timing, MAP lists, affiliate and 3PL rates, retailer allowances, account maps, listing rules, signature rule) exist only in the seller's settings and ship with no real value. Eleven built-in defaults mirror a vendor rule as of November 2026 and were not checked against the vendors' current pages (FBA wait, claim and return windows; dim divisor 139; carrier dispute window 30 days; claim answer 3 days; dispute hold 75 days; label refund 30 days; retailer dispute window 90 days; title limit 200; gift card dormancy 365 days). A customer changes any of them in the agent's settings file; each result names the settings files it used. Support can change the defaults in a release; the customer's file always wins.

### Real data (`npm run realdata`, `docs/realdata-2026-11-19.md`)

| Source (licence) | Agent | Result |
|---|---|---|
| UCI Online Retail, a real UK online shop, 541,909 rows (CC BY 4.0) | return reasons | 127 SKUs and 183 customers flagged; **0 disagreements** with an independent re-count. 2 flagged codes were not products, so `ignore_skus` was added; 2 were single order-entry mistakes (80,995 and 74,215 units) |
| Same, 3,812 product titles | duplicate listings | 32 near-duplicate titles; **0 disagreements** with a brute-force check of 7.3 million pairs; all are titles a shopper cannot tell apart, most likely variants |
| Shopify product and inventory CSV templates (Shopify's samples) | product data, inventory | 4 kinds of wrong finding found and fixed; after the fix every finding checked by hand, **0 wrong** |
| WooCommerce `sample_products.csv` (GPL-3.0) | product data | 2 kinds of wrong finding found and fixed (price and weight names, variations and virtual products); **0 wrong** after |
| Open Food Facts, 400 real barcodes (ODbL) | product data | 2 invalid barcodes, 17 products without name or brand; **0 disagreements** with an independent check-digit re-count |

No public data in a real format exists for the other 26 agents' inputs (payouts, marketplace fees, FBA reimbursements and storage fees, processor reserves, settlements, marketplace claims, refunds, coupons, gift cards, subscriptions, affiliates, sales tax, nexus, stockouts, MAP prices, SKU margins, ad spend, shipping labels, carrier adjustments, 3PL invoices, purchase orders, landed cost, retailer deductions, cash drawers and shrink): they were tested on fictional files only.

### Final numbers

| Check (fresh clone, Windows 10, Node 24.20.0, `core.autocrlf=true`) | Result |
|---|---|
| `try_it`: `git clone`, `npm install`, `node packages/fairshop-payouts/bin/fairshop-payouts.js demo` | `npm install --offline` in 4 s (no dependencies outside the repository), demo in 1 s, no setup, no network; the tree stays clean |
| `npm test` | **876 tests, 876 pass**: 154 in `fairshop-core`, 23 to 28 per agent |
| `npm run evals` | **610/610** (20 or 21 per agent) |
| `npm run check` | 30 agents, 30 prefixes, 203 tool names, 9 agents with personal fields, all masked with canaries listed; pass |
| `readme:check`, `plugin:check`, `make-evals --check`, `make-intl-fixtures --check`, `root-readme --check` | all pass on the CRLF-converting clone (they failed there before this pass) |
| `npm run accuracy` | 158/158 planted found, 0 of 64 near-misses flagged, 0 findings on 380 clean rows, 82/82 mutations caught |
| `npm run model-view` | 9 agents with personal data, 58 canaries, **0 leaks** |
| `npm run intl` | 388 cases with spreadsheet inputs, 8 languages, every case that passes in English passes in every language |
| `npm run hostile` | 30 agents, 3,050 calls, 1,889 planted values, **0 findings** |
| `npm run hostile:args` | 30 agents, 14,495 calls, **0 findings** (727 s) |
| `npm run bench` (10,000 rows per table) | 90 tools, 0 need attention; median 633 ms, slowest 5.8 s (`affiliates_audit`, about twice its build-time cost now that affiliate names are masked), peak memory 258 MB. Other sessions were running their own final passes on this machine, so timings run about 25% above the build's |
| `npm run release:check:offline` | **Dry run passed**: secret scan of 1,043 tracked files, honest-copy scan of 94 README/package/manifest files, one-click categories and policy, no paid tools, 876 tests, 610/610 evals, hostile 0 findings, `npm pack` of 31 packages (590 KB, no tests, state, output, keys or `.npmrc`). One warning: `npm install` rewrote `package-lock.json` in the clone (it listed only the core workspace); the lockfile was regenerated and committed, and a fresh clone of the final commit installs with no change. npm names not rechecked offline (all 31 free on 18 Nov) |
| `npm run mcp:check` | not run (needs the MCP SDK installed) |

### For Kurt to decide

- **Wording of "written from documentation".** The site's format list allows three labels. 35 Fairshop layouts were written from knowledge of the vendors' documented exports but not compared with the current documentation; if the site shows "written from documentation", it should not suggest more than that.
- **Affiliate names are now masked** in what the model sees. The model can still group by affiliate (`AFF-…`), and the files on disk keep the names; say if you would rather keep business names in clear.
- Nothing else waits on Kurt: no prices, claims or scope changed in this pass.

Still not done: no live store export; Node 20 and 22 and Linux only through CI once pushed; `npm run mcp:check` (needs the MCP SDK installed); translations not read by native speakers; Open Food Facts refused one of five pages while busy (400 of 500 products read).
