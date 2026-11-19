import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Refunds and Returns', args: { refunds: 'refunds.csv', returns: 'returns.csv', orders: 'orders.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(12)} ${i.status.padEnd(8)} refunded ${String(i.refunded).padStart(6)} back ${i.units_returned}/${i.units_refunded}  ${i.findings.map((f) => f.code).join(', ')}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
