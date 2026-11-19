import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Ad Spend', args: { ads: 'ads.csv', sales: 'sales.csv', stock: 'stock.csv', settings: 'settings.json' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(30)} spend ${String(i.spend).padStart(6)} attributed ${String(i.attributed).padStart(7)} ${String(i.roas ?? '-').padStart(5)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
