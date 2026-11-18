import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop MAP Pricing', args: { prices: 'prices.csv', policy: 'policy.json' },
  draftArgs: { seller: 'Brightway Home', from: 'Dana Example, Example Lighting (fictional)' },
  show: (i) => `${i.id.padEnd(26)} MAP ${String(i.map ?? '-').padStart(6)} lowest ${String(i.lowest).padStart(6)} ${i.status}`,
});
