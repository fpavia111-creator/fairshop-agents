import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Sales Tax', args: { orders: 'orders.csv', settings: 'settings.json' },
  draftArgs: { state: 'TX', period: 'October 2026' },
  show: (i) => `${i.id.padEnd(4)} ${i.channel.padEnd(8)} ${i.state} ${String(i.collected).padStart(6)} ${String(i.expected ?? '-').padStart(6)} ${i.status}`,
});
