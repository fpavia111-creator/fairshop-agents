import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

// The demo's arguments, also used by scripts/accuracy.mjs and scripts/model-view.mjs.
export const DEMO = {
  title: 'Fairshop Sales Tax', args: { orders: 'orders.csv', settings: 'settings.json' },
  draftArgs: { state: 'TX', period: 'October 2026' },
  show: (i) => `${i.id.padEnd(4)} ${i.channel.padEnd(8)} ${i.state} ${String(i.collected).padStart(6)} ${String(i.expected ?? '-').padStart(6)} ${i.status}`,
};

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), DEMO);
