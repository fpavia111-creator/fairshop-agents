import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Product Data', args: { products: 'products.csv', settings: 'settings.json' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(12)} ${String(i.completeness_pct).padStart(3)}% ${i.status.padEnd(4)} ${i.findings.map((f) => f.code).join(', ')}`,
});
