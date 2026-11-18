import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Store Shrink', args: { adjustments: 'adjustments.csv', sales: 'sales.csv', settings: 'settings.json' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(22)} shrink ${String(i.shrink).padStart(6)} ${String(i.shrink_pct ?? '-').padStart(5)}% ${i.status}`,
});
