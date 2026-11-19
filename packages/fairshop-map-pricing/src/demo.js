import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop MAP Pricing', args: { prices: 'prices.csv', policy: 'policy.json' },
  draftArgs: { seller: 'Brightway Home', from: 'Dana Example, Example Lighting (fictional)' },
  show: (i) => `${i.id.padEnd(26)} MAP ${String(i.map ?? '-').padStart(6)} lowest ${String(i.lowest).padStart(6)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
