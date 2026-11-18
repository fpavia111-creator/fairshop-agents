import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Carrier Adjustments', args: { adjustments: 'adjustments.csv', labels: 'labels.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { carrier: 'UPS', from: 'Dana Example (fictional)' },
  show: (i) => `${(i.tracking || i.id).padEnd(10)} ${i.sku.padEnd(7)} ${String(i.amount).padStart(6)} ${i.status.padEnd(13)} ${i.dispute_by || ''}`,
});
