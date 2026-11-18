import { fileURLToPath } from 'node:url';
import { shopDemo } from 'fairshop-core';

export const demo = (manifest) => shopDemo(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), {
  title: 'Fairshop Affiliate Commissions', args: { commissions: 'commissions.csv', orders: 'orders.csv', terms: 'terms.json' },
  draftArgs: { network: 'Example Network', from: 'Dana Example, Example Goods (fictional)' },
  show: (i) => `${i.id.padEnd(5)} ${i.affiliate.padEnd(18)} ${i.order_id.padEnd(5)} ${String(i.commission).padStart(6)} ${i.status.padEnd(8)} ${i.recover}`,
});
