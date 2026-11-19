import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop SKU Margins', args: { sales: 'sales.csv', costs: 'costs.csv', labels: 'labels.csv', settings: 'settings.json' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(16)} income ${String(i.income).padStart(6)} contribution ${String(i.contribution ?? '-').padStart(6)} ${String(i.margin_pct ?? '-').padStart(5)}% ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
