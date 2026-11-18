import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Subscriptions', args: { subscriptions: 'subscriptions.csv', payments: 'payments.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: {},
  show: (i) => `${i.id.padEnd(6)} ${i.plan.padEnd(15)} ${String(i.price).padStart(6)} last paid ${String(i.last_success).padEnd(10)} ${i.status}`,
});
