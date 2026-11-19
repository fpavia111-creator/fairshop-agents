import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Nexus Thresholds', args: { orders: 'orders.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { from: 'Dana Example (fictional)' },
  show: (i) => `${i.state} ${String(i.status).padEnd(20)} ${String(i.sales).padStart(9)} ${String(i.share_pct ?? '-').padStart(6)}% ${i.crossed_on || ''}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
