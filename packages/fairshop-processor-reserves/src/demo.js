import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Processor Reserves', args: { balance: 'balance.csv', terms: 'terms.json', as_of: '2026-11-16' },
  draftArgs: { processor: 'Stripe', from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${i.id.padEnd(10)} ${i.processor.padEnd(7)} ${i.date} ${String(i.amount).padStart(7)} held ${String(i.held).padStart(7)} ${i.status.padEnd(9)} ${i.expected_release || ''}`,
});
