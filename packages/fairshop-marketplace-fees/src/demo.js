import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Marketplace Fees', args: { fees: 'fees.csv', schedule: 'schedule.json', as_of: '2026-11-16' },
  draftArgs: { channel: 'Amazon', from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${i.order_id.padEnd(8)} ${i.channel.padEnd(7)} ${i.fee_type.padEnd(26)} ${String(i.fee).padStart(6)} ${String(i.expected ?? '-').padStart(6)} ${i.status}`,
});
