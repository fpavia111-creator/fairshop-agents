# Fairshop: hand-over (18 Nov 2026, session stopped at its usage limit)

## Done (committed)
- `packages/fairshop-core`: copy of lodestar-core (18 Nov Windows fixes), EDI readers removed, plus
  - `pii.js` customer/staff masking wired into `AgentRuntime.call` (`--pii mask|strict|off`), tests in `test/pii.test.js`
  - `commerce.js` (channelKey, stateCode, skuKey, emailKey, findings roll-ups), `agent.js` (`shopAgent` builder: audit/explain/write_report/draft+one-click/refused tools), tests in `test/commerce.test.js`
  - report headings for all 30 planned reports in 9 languages (`report-text.js`), e-commerce column words (`i18n/columns.js`), 36 e-commerce exports (`exports.js`)
  - testkit `agentContract({ canaries })` masking check
  - Core tests: 135 + 15 new, all passing on Windows / Node 24 (re-run after the last edits).
- Scripts copied and renamed (hostile, bench, release-check, intl, readme, plugin files, scaffolder writing contract.test.js).

## In progress
- `packages/baltic-of-payouts`: scaffolded; `src/payouts.js` logic written, NOT yet tested. Missing: `src/manifest.js` (use `shopAgent`), `src/demo.js`, fixtures (planted cases listed in the session: orders #1001-#1008, Amazon 112-..., Etsy E-3001/E-3002; payouts P-2001..P-2003, S-7001, E-PAY-1), `test/domain.test.js`, `evals/cases.json`, README.

## Not started
- The other 29 agents (planned names: caspian-of-fees, sargasso-of-reimbursements, weddell-of-storage, adriatic-of-returns, ionian-of-returners, tasman-of-claims, superior-of-taxes, huron-of-nexus, baikal-of-inventory, titicaca-of-stockouts, victoria-of-margins, erie-of-shipping, ontario-of-adjustments, michigan-of-fulfillment, aegean-of-coupons, ladoga-of-giftcards, geneva-of-subscriptions, como-of-catalog, garda-of-map, lucerne-of-listings, constance-of-receiving, balaton-of-imports, tahoe-of-ads, champlain-of-affiliates, onega-of-cash, inari-of-shrink, banda-of-reserves, coral-of-journals, timor-of-deductions). Report titles for each are already in report-text.js.
- Root README in 9 languages, family-check / run-all-evals / sample-reports scripts, sample reports, `sales/site.json`, `sales/pricing-page-ver1.md`, `REVIEW-ver1.md`, `npm view` name checks, `add-mcp-registry.cjs`, hostile/bench/release runs.
