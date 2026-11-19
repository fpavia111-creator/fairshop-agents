import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Shipping Costs', args: { orders: 'orders.csv', labels: 'labels.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { platform: 'Example Ship (fictional)', from: 'Dana Example (fictional)' },
  show: (i) => `${i.id.padEnd(17)} charged ${String(i.charged).padStart(5)} labels ${String(i.label_cost).padStart(6)} ${i.status.padEnd(6)} ${i.findings.map((f) => f.code).join(', ')}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
