import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Duplicate Listings', args: { listings: 'listings.csv', catalog: 'catalog.csv' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(22)} ${i.sku.padEnd(13)} ${i.status.padEnd(6)} ${i.findings.map((f) => f.code).join(', ')}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
