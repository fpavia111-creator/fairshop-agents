import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Marketplace Claims', args: { claims: 'claims.csv', shipments: 'shipments.csv', settings: 'settings.json', as_of: '2026-11-16' },
  draftArgs: { claim_id: 'AZ-1', from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${i.id.padEnd(5)} ${i.channel.padEnd(8)} ${String(i.respond_by).padEnd(11)} ${i.status.padEnd(8)} ${String(i.advice).padEnd(16)} ${i.amount}`,
});
