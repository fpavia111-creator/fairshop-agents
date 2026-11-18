import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Return Reasons', args: { returns: 'returns.csv', orders: 'orders.csv', settings: 'settings.json' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(16)} sold ${String(i.units_sold).padStart(3)} returned ${String(i.units_returned).padStart(2)} ${String(i.return_rate_pct).padStart(5)}% ${i.status}`,
});
