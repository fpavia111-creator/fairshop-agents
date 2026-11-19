import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Inventory Listings', args: { stock: 'stock.csv', listings: 'listings.csv', settings: 'settings.json' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(14)} ${i.sku.padEnd(9)} listed ${String(i.listed).padStart(3)} can ship ${String(i.can_ship).padStart(3)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
