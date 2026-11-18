# Fairshop FBA Storage Fees (`fairshop-fba-storage-fees`)

> Check FBA storage fees against the rates you confirm, and act before inventory lots cross into the next aged-inventory bracket. Never creates removal orders; the plan is one human click.

Part of [Fairshop](https://fair-agents.com) by Mythos Machines: one agent, one job, on your computer, from files you export. Built on [`fairshop-core`](../fairshop-core). MIT, Node 20 or newer, no account or API key.

## What it checks

Give it the monthly storage fee report, optionally your inventory lots (SKU, received date, units on hand), and a settings file with the storage rates per cubic foot by size tier and season and the aged-inventory brackets, written from the current fee page and confirmed by you.

- **storage fee above your rate**: average units × volume × rate gives less than the charge;
- **lot about to cross a bracket**: a lot reaches the next bracket within `warn_days` (default 30); you get the date and the extra monthly cost;
- **lot already in a bracket**: the estimated monthly surcharge;
- **storage above margin**: storage plus surcharge per unit is more than the SKU margin you set.

## How it decides

"Oversize", "large", "bulky" and "extra" tiers read as oversize; everything else as standard. October to December use the `oct-dec` rate. Lot ages count from the received date to `as_of`.

## Limits

- Rates and brackets are your settings; the agent does not know current fees.
- Surcharges are estimates from the volume in your storage report.
- It does not create removal orders or change listings. A person decides.
