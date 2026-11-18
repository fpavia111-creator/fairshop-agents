import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Payouts', args: { orders: 'orders.csv', payouts: 'payouts.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { channel: 'Amazon', from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${String(i.order_id || i.id).padEnd(22)} ${i.channel.padEnd(8)} ${i.status.padEnd(8)} ${String(i.owed).padStart(7)}  ${i.findings.map((x) => x.code).join(', ')}`,
});
