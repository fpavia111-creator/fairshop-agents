import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Product Data', args: { products: 'products.csv', settings: 'settings.json' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(12)} ${String(i.completeness_pct).padStart(3)}% ${i.status.padEnd(4)} ${i.findings.map((f) => f.code).join(', ')}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
